import mongoose from 'mongoose';
import Plan from '../models/Plan.js';
import User from '../models/User.js';
import { logAudit } from '../utils/adminOps.js';
import { escapeRegex } from '../utils/helpers.js';
import {
  featureCatalog,
  normalizePlanFeatures,
  normalizePlanLimits,
  PLAN_FEATURES,
} from '../constants/planFeatures.js';
import {
  applyPlanToUser,
  ensureDefaultPlans,
  getDefaultPlan,
  invalidateDefaultPlanCache,
  refreshSnapshotsForPlan,
  serializeEntitlements,
  serializePlan,
} from '../services/entitlementService.js';

const auditPlan = (superAdmin, plan, action, details, meta = {}) =>
  logAudit({
    owner: superAdmin._id,
    actor: superAdmin._id,
    action,
    entityType: 'Plan',
    entityId: plan?._id,
    details,
    meta: { ...meta, via: 'superadmin', module: 'plans' },
  });

const findPlanOrFail = async (id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  return Plan.findById(id);
};

export const listPlans = async (req, res) => {
  try {
    await ensureDefaultPlans();
    const { search = '', active = '' } = req.query;
    const filter = {};
    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;
    if (String(search).trim()) {
      const q = escapeRegex(String(search).trim());
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { code: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
      ];
    }

    const plans = await Plan.find(filter).sort({ sortOrder: 1, name: 1 });
    const counts = await Promise.all(
      plans.map(async (plan) => ({
        id: plan._id.toString(),
        agencies: await User.countDocuments({ role: 'owner', plan: plan._id }),
      })),
    );
    const agencyCountById = Object.fromEntries(counts.map((c) => [c.id, c.agencies]));

    res.json({
      success: true,
      plans: plans.map((p) => ({
        ...serializePlan(p),
        agencyCount: agencyCountById[p._id.toString()] || 0,
      })),
      featureCatalog: featureCatalog(),
      featureKeys: [...PLAN_FEATURES],
    });
  } catch (error) {
    console.error('[plans] list', error.message);
    res.status(500).json({ success: false, message: 'Failed to list plans' });
  }
};

export const getPlanById = async (req, res) => {
  try {
    const plan = await findPlanOrFail(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    const agencyCount = await User.countDocuments({ role: 'owner', plan: plan._id });
    res.json({
      success: true,
      plan: { ...serializePlan(plan), agencyCount },
      featureCatalog: featureCatalog(),
    });
  } catch (error) {
    console.error('[plans] get', error.message);
    res.status(500).json({ success: false, message: 'Failed to load plan' });
  }
};

export const createPlan = async (req, res) => {
  try {
    await ensureDefaultPlans();
    const {
      code,
      name,
      description = '',
      features = [],
      limits = {},
      isActive = true,
      isDefault = false,
      sortOrder = 100,
    } = req.body;

    const normalizedCode = String(code || '').trim().toLowerCase();
    const normalizedName = String(name || '').trim();
    if (!normalizedCode || !normalizedName) {
      return res.status(400).json({ success: false, message: 'Plan code and name are required' });
    }

    const exists = await Plan.findOne({ code: normalizedCode });
    if (exists) {
      return res.status(409).json({ success: false, message: 'A plan with this code already exists' });
    }

    const plan = await Plan.create({
      code: normalizedCode,
      name: normalizedName,
      description: String(description || ''),
      features: normalizePlanFeatures(features),
      limits: normalizePlanLimits(limits),
      isActive: Boolean(isActive),
      isDefault: Boolean(isDefault),
      sortOrder: Number(sortOrder) || 100,
    });

    if (plan.isDefault) {
      await Plan.updateMany({ _id: { $ne: plan._id } }, { $set: { isDefault: false } });
      invalidateDefaultPlanCache();
    }

    await auditPlan(req.user, plan, 'superadmin.plan.create', `Created plan ${plan.name}`, {
      code: plan.code,
    });

    res.status(201).json({ success: true, message: 'Plan created', plan: serializePlan(plan) });
  } catch (error) {
    console.error('[plans] create', error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to create plan' });
  }
};

export const updatePlan = async (req, res) => {
  try {
    const plan = await findPlanOrFail(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const { name, description, features, limits, isActive, isDefault, sortOrder } = req.body;

    if (name !== undefined) plan.name = String(name).trim();
    if (description !== undefined) plan.description = String(description);
    if (features !== undefined) plan.features = normalizePlanFeatures(features);
    if (limits !== undefined) plan.limits = normalizePlanLimits(limits);
    if (isActive !== undefined) plan.isActive = Boolean(isActive);
    if (sortOrder !== undefined) plan.sortOrder = Number(sortOrder) || 0;

    if (isDefault === true) {
      plan.isDefault = true;
      plan.isActive = true;
    } else if (isDefault === false && plan.isDefault) {
      // Refuse leaving the platform without a default plan
      const otherDefault = await Plan.findOne({ _id: { $ne: plan._id }, isDefault: true, isActive: true });
      if (!otherDefault) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove default flag — assign another default plan first',
        });
      }
      plan.isDefault = false;
    }

    if (plan.isDefault && plan.isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'The default plan cannot be deactivated',
      });
    }

    await plan.save();

    if (plan.isDefault) {
      await Plan.updateMany({ _id: { $ne: plan._id } }, { $set: { isDefault: false } });
      invalidateDefaultPlanCache();
    }

    const refreshed = await refreshSnapshotsForPlan(plan);

    await auditPlan(req.user, plan, 'superadmin.plan.update', `Updated plan ${plan.name}`, {
      refreshedAgencies: refreshed,
    });

    res.json({
      success: true,
      message: refreshed ? `Plan updated (${refreshed} agencies refreshed)` : 'Plan updated',
      plan: serializePlan(plan),
      refreshedAgencies: refreshed,
    });
  } catch (error) {
    console.error('[plans] update', error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to update plan' });
  }
};

export const setPlanActive = async (req, res) => {
  try {
    const plan = await findPlanOrFail(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const isActive = Boolean(req.body.isActive);
    if (!isActive && plan.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'The default plan cannot be deactivated',
      });
    }

    plan.isActive = isActive;
    await plan.save();
    invalidateDefaultPlanCache();

    await auditPlan(
      req.user,
      plan,
      'superadmin.plan.status',
      `${isActive ? 'Activated' : 'Deactivated'} plan ${plan.name}`,
      { isActive },
    );

    res.json({
      success: true,
      message: isActive ? 'Plan activated' : 'Plan deactivated',
      plan: serializePlan(plan),
    });
  } catch (error) {
    console.error('[plans] status', error.message);
    res.status(500).json({ success: false, message: 'Failed to update plan status' });
  }
};

export const assignAgencyPlan = async (req, res) => {
  try {
    const agencyId = req.params.id;
    if (!mongoose.isValidObjectId(agencyId)) {
      return res.status(404).json({ success: false, message: 'Agency not found' });
    }

    const agency = await User.findOne({ _id: agencyId, role: 'owner' });
    if (!agency) return res.status(404).json({ success: false, message: 'Agency not found' });

    let plan = null;
    if (req.body.planId) {
      plan = await findPlanOrFail(req.body.planId);
    } else if (req.body.code) {
      plan = await Plan.findOne({ code: String(req.body.code).trim().toLowerCase() });
    } else {
      plan = await getDefaultPlan();
    }

    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    if (!plan.isActive && !plan.isDefault) {
      return res.status(400).json({ success: false, message: 'Cannot assign an inactive plan' });
    }

    await applyPlanToUser(agency, plan, { save: true });

    await logAudit({
      owner: agency._id,
      actor: req.user._id,
      action: 'superadmin.agency.plan',
      entityType: 'User',
      entityId: agency._id,
      details: `Assigned plan ${plan.name} to ${agency.agencyName || agency.email}`,
      meta: { via: 'superadmin', module: 'plans', planId: plan._id, planCode: plan.code },
    });

    res.json({
      success: true,
      message: `Assigned plan ${plan.name}`,
      plan: serializePlan(plan),
      entitlements: serializeEntitlements(agency),
    });
  } catch (error) {
    console.error('[plans] assign', error.message);
    res.status(500).json({ success: false, message: 'Failed to assign plan' });
  }
};

export default {
  listPlans,
  getPlanById,
  createPlan,
  updatePlan,
  setPlanActive,
  assignAgencyPlan,
};
