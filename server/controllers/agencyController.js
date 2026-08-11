import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Car from '../models/Car.js';
import Booking from '../models/Booking.js';
import AuditLog from '../models/AuditLog.js';
import { logAudit } from '../utils/adminOps.js';
import { escapeRegex } from '../utils/helpers.js';
import { syncLicenseStatus } from '../services/licenseService.js';
import { PUBLIC_VISIBLE_CAR_FILTER } from '../utils/carCatalog.js';
import {
  AGENCY_STATUSES,
  agencyStatusQuery,
  applyAgencyStatus,
  createAgencyDefaults,
  mergeAgencyProfile,
  resolveAgencyStatus,
  serializeAgency,
} from '../services/agencyService.js';
import {
  applyPlanToUser,
  ensureDefaultPlans,
  getDefaultPlan,
  syncOwnerPlan,
} from '../services/entitlementService.js';

const findAgencyOrFail = async (id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  return User.findOne({ _id: id, role: 'owner' });
};

/** Car-level bookable filter for one owner (does not re-check owner license). */
const bookableFleetFilter = (ownerId) => ({
  ...PUBLIC_VISIBLE_CAR_FILTER,
  owner: ownerId,
});

const pickLatestActivity = (candidates) => {
  const valid = candidates.filter((c) => c?.at && !Number.isNaN(new Date(c.at).getTime()));
  if (!valid.length) return null;
  valid.sort((a, b) => new Date(b.at) - new Date(a.at));
  return valid[0];
};

/**
 * Real owner-scoped counts only. List uses summary; detail adds reservation breakdown + activity.
 */
const loadStats = async (ownerId, { detailed = false } = {}) => {
  const [fleetCount, bookableVehicles, reservationsTotal, staffCount] = await Promise.all([
    Car.countDocuments({ owner: ownerId }),
    Car.countDocuments(bookableFleetFilter(ownerId)),
    Booking.countDocuments({ owner: ownerId }),
    // Phase 1: one owner user per agency (staff accounts come later)
    User.countDocuments({ _id: ownerId, role: 'owner' }),
  ]);

  const summary = {
    vehicles: fleetCount,
    fleetCount,
    bookableVehicles,
    reservations: reservationsTotal,
    reservationsTotal,
    users: staffCount,
    staffCount,
  };

  if (!detailed) return summary;

  const [statusRows, latestBooking, latestAudit, owner] = await Promise.all([
    Booking.aggregate([
      { $match: { owner: new mongoose.Types.ObjectId(String(ownerId)) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Booking.findOne({ owner: ownerId }).sort({ createdAt: -1 }).select('createdAt status').lean(),
    AuditLog.findOne({ owner: ownerId }).sort({ createdAt: -1 }).select('createdAt action details').lean(),
    User.findById(ownerId).select('lastLoginAt').lean(),
  ]);

  const byStatus = Object.fromEntries(statusRows.map((row) => [row._id, row.count]));
  const reservationsPending = byStatus.pending || 0;
  const reservationsActive = byStatus.active || 0;
  const reservationsCompleted = byStatus.completed || 0;

  const lastActivity = pickLatestActivity([
    owner?.lastLoginAt
      ? { at: owner.lastLoginAt, source: 'login', label: 'Owner last login' }
      : null,
    latestBooking?.createdAt
      ? {
          at: latestBooking.createdAt,
          source: 'booking',
          label: `Latest reservation (${latestBooking.status || 'unknown'})`,
        }
      : null,
    latestAudit?.createdAt
      ? {
          at: latestAudit.createdAt,
          source: 'audit',
          label: latestAudit.details || latestAudit.action || 'Audit event',
        }
      : null,
  ]);

  return {
    ...summary,
    reservationsPending,
    reservationsActive,
    reservationsCompleted,
    lastActivityAt: lastActivity?.at || null,
    lastActivity,
  };
};

const auditAgency = (superAdmin, agency, action, details, meta = {}) =>
  logAudit({
    owner: agency?._id || superAdmin._id,
    actor: superAdmin._id,
    action,
    entityType: 'User',
    entityId: agency?._id,
    details,
    meta: { ...meta, via: 'superadmin', module: 'agencies' },
  });

export const listAgencies = async (req, res) => {
  try {
    await ensureDefaultPlans();
    const { search = '', status = '', page = 1, limit = 20 } = req.query;
    const and = [{ role: 'owner' }];

    const statusFilter = agencyStatusQuery(String(status || '').toLowerCase());
    if (statusFilter) and.push(statusFilter);

    if (search.trim()) {
      const q = escapeRegex(search.trim());
      and.push({
        $or: [
          { agencyName: new RegExp(q, 'i') },
          { name: new RegExp(q, 'i') },
          { email: new RegExp(q, 'i') },
          { 'agencyProfile.legalName': new RegExp(q, 'i') },
          { 'agencyProfile.city': new RegExp(q, 'i') },
          { 'agencyProfile.phone': new RegExp(q, 'i') },
        ],
      });
    }

    const filter = and.length === 1 ? and[0] : { $and: and };

    const pageNum = Math.max(1, Number(page) || 1);
    const lim = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * lim;

    const [owners, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(lim),
      User.countDocuments(filter),
    ]);

    for (const owner of owners) {
      await syncLicenseStatus(owner);
    }

    const agencies = await Promise.all(
      owners.map(async (owner) => serializeAgency(owner, await loadStats(owner._id))),
    );

    const [active, suspended, trial, pending] = await Promise.all([
      User.countDocuments({ role: 'owner', ...agencyStatusQuery('active') }),
      User.countDocuments({ role: 'owner', ...agencyStatusQuery('suspended') }),
      User.countDocuments({ role: 'owner', ...agencyStatusQuery('trial') }),
      User.countDocuments({ role: 'owner', ...agencyStatusQuery('pending') }),
    ]);

    res.json({
      success: true,
      agencies,
      pagination: {
        total,
        page: pageNum,
        limit: lim,
        totalPages: Math.max(1, Math.ceil(total / lim)),
      },
      counts: { active, suspended, trial, pending, all: active + suspended + trial + pending },
      statuses: AGENCY_STATUSES,
    });
  } catch (error) {
    console.error('[agencies] list', error.message);
    res.status(500).json({ success: false, message: 'Failed to list agencies' });
  }
};

export const getAgencyById = async (req, res) => {
  try {
    const agency = await findAgencyOrFail(req.params.id);
    if (!agency) return res.status(404).json({ success: false, message: 'Agency not found' });

    await syncLicenseStatus(agency);
    await syncOwnerPlan(agency);
    const stats = await loadStats(agency._id, { detailed: true });

    res.json({
      success: true,
      agency: serializeAgency(agency, stats),
      statuses: AGENCY_STATUSES,
    });
  } catch (error) {
    console.error('[agencies] get', error.message);
    res.status(500).json({ success: false, message: 'Failed to load agency' });
  }
};

export const createAgency = async (req, res) => {
  try {
    const {
      name,
      contactName,
      email,
      password,
      status = 'trial',
      notes = '',
      profile = {},
    } = req.body;

    const agencyName = String(name || profile?.name || '').trim();
    const ownerName = String(contactName || agencyName || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!agencyName || !ownerName || !normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Agency name, contact name, email and password are required',
      });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    if (!AGENCY_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid agency status' });
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const defaults = createAgencyDefaults({ status, startTrial: status === 'trial' });

    const owner = await User.create({
      name: ownerName,
      email: normalizedEmail,
      password: hashed,
      role: 'owner',
      agencyName,
      notes: String(notes || ''),
      permissions: [],
      ...defaults,
    });

    mergeAgencyProfile(owner, {
      legalName: profile.legalName || agencyName,
      phone: profile.phone,
      whatsapp: profile.whatsapp,
      address: profile.address,
      city: profile.city,
      country: profile.country || 'Morocco',
      logo: profile.logo,
      primaryDomain: profile.primaryDomain,
    });
    await owner.save();

    // Ensure status helpers applied for active/suspended/pending edge cases
    if (status !== resolveAgencyStatus(owner)) {
      await applyAgencyStatus(owner, status);
    }

    const defaultPlan = await getDefaultPlan();
    if (defaultPlan) {
      await applyPlanToUser(owner, defaultPlan, { save: true });
    }

    await auditAgency(req.user, owner, 'superadmin.agency.create', `Created agency ${agencyName} (${owner.email})`, {
      status,
      planCode: defaultPlan?.code,
    });

    res.status(201).json({
      success: true,
      message: 'Agency created',
      agency: serializeAgency(owner, {
        vehicles: 0,
        fleetCount: 0,
        bookableVehicles: 0,
        reservations: 0,
        reservationsTotal: 0,
        reservationsPending: 0,
        reservationsActive: 0,
        reservationsCompleted: 0,
        users: 1,
        staffCount: 1,
      }),
    });
  } catch (error) {
    console.error('[agencies] create', error.message);
    res.status(500).json({ success: false, message: 'Failed to create agency' });
  }
};

export const updateAgency = async (req, res) => {
  try {
    const agency = await findAgencyOrFail(req.params.id);
    if (!agency) return res.status(404).json({ success: false, message: 'Agency not found' });

    const { name, contactName, email, notes, profile } = req.body;

    if (name !== undefined) agency.agencyName = String(name).trim();
    if (contactName !== undefined) agency.name = String(contactName).trim();
    if (notes !== undefined) agency.notes = String(notes);
    if (email !== undefined) {
      const normalized = String(email).trim().toLowerCase();
      if (normalized && normalized !== agency.email) {
        const clash = await User.findOne({ email: normalized, _id: { $ne: agency._id } });
        if (clash) {
          return res.status(409).json({ success: false, message: 'Email already in use' });
        }
        agency.email = normalized;
      }
    }
    if (profile && typeof profile === 'object') {
      mergeAgencyProfile(agency, profile);
    }

    await agency.save();
    await auditAgency(req.user, agency, 'superadmin.agency.update', `Updated agency ${agency.agencyName || agency.email}`);

    const stats = await loadStats(agency._id, { detailed: true });
    res.json({
      success: true,
      message: 'Agency updated',
      agency: serializeAgency(agency, stats),
    });
  } catch (error) {
    console.error('[agencies] update', error.message);
    res.status(500).json({ success: false, message: 'Failed to update agency' });
  }
};

export const setAgencyStatus = async (req, res) => {
  try {
    const agency = await findAgencyOrFail(req.params.id);
    if (!agency) return res.status(404).json({ success: false, message: 'Agency not found' });

    const status = String(req.body.status || '').toLowerCase();
    if (!AGENCY_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Use ${AGENCY_STATUSES.join(' | ')}`,
      });
    }

    await applyAgencyStatus(agency, status);
    await auditAgency(
      req.user,
      agency,
      'superadmin.agency.status',
      `Set agency status=${status} for ${agency.agencyName || agency.email}`,
      { status },
    );

    const stats = await loadStats(agency._id, { detailed: true });
    res.json({
      success: true,
      message:
        status === 'suspended'
          ? 'Agency suspended — login blocked, all data preserved'
          : `Agency marked as ${status}`,
      agency: serializeAgency(agency, stats),
    });
  } catch (error) {
    console.error('[agencies] status', error.message);
    res.status(500).json({ success: false, message: 'Failed to update agency status' });
  }
};

export default {
  listAgencies,
  getAgencyById,
  createAgency,
  updateAgency,
  setAgencyStatus,
};
