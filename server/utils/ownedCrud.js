/**
 * Generic owner-scoped CRUD helpers for partner/chauffeur-style entities.
 */
import mongoose from 'mongoose';
import { logAudit } from '../utils/adminOps.js';
import { parsePagination, parseSort, escapeRegex } from '../utils/listQuery.js';

export const ownerIdFromReq = (req) => req.user._id;

export const createOwnedCrud = ({
  Model,
  entityName,
  searchFields = ['fullName'],
  sortAllowed = { createdAt: true, fullName: true, companyName: true, status: true },
  defaultSort = { createdAt: -1 },
  auditPrefix,
  sanitizeCreate,
  sanitizeUpdate,
}) => {
  const list = async (req, res) => {
    try {
      const owner = ownerIdFromReq(req);
      const { page, limit, skip } = parsePagination(req.query);
      const filter = { owner };
      if (req.query.status && req.query.status !== 'all') {
        filter.status = req.query.status;
      }
      if (req.query.search) {
        const re = new RegExp(escapeRegex(req.query.search), 'i');
        filter.$or = searchFields.map((f) => ({ [f]: re }));
      }
      const sort = parseSort(req.query.sort, sortAllowed, defaultSort);
      const [items, total] = await Promise.all([
        Model.find(filter).sort(sort).skip(skip).limit(limit).lean(),
        Model.countDocuments(filter),
      ]);
      res.json({
        success: true,
        items,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ success: false, message: `Failed to list ${entityName}` });
    }
  };

  const getOne = async (req, res) => {
    try {
      const owner = ownerIdFromReq(req);
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid id' });
      }
      const item = await Model.findOne({ _id: req.params.id, owner }).lean();
      if (!item) return res.status(404).json({ success: false, message: `${entityName} not found` });
      res.json({ success: true, item });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ success: false, message: `Failed to load ${entityName}` });
    }
  };

  const create = async (req, res) => {
    try {
      const owner = ownerIdFromReq(req);
      const payload = sanitizeCreate(req.body || {});
      if (payload.error) {
        return res.status(400).json({ success: false, message: payload.error });
      }
      const item = await Model.create({
        ...payload.data,
        owner,
        createdBy: owner,
        updatedBy: owner,
      });
      await logAudit({
        owner,
        actor: owner,
        action: `${auditPrefix}.create`,
        entityType: entityName,
        entityId: item._id,
        details: `Created ${entityName}`,
      });
      res.status(201).json({ success: true, item });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ success: false, message: error.message || `Failed to create ${entityName}` });
    }
  };

  const update = async (req, res) => {
    try {
      const owner = ownerIdFromReq(req);
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid id' });
      }
      const item = await Model.findOne({ _id: req.params.id, owner });
      if (!item) return res.status(404).json({ success: false, message: `${entityName} not found` });
      const payload = sanitizeUpdate(req.body || {}, item);
      if (payload.error) {
        return res.status(400).json({ success: false, message: payload.error });
      }
      Object.assign(item, payload.data);
      item.updatedBy = owner;
      await item.save();
      await logAudit({
        owner,
        actor: owner,
        action: `${auditPrefix}.update`,
        entityType: entityName,
        entityId: item._id,
        details: `Updated ${entityName}`,
      });
      res.json({ success: true, item });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ success: false, message: error.message || `Failed to update ${entityName}` });
    }
  };

  const setStatus = async (req, res) => {
    try {
      const owner = ownerIdFromReq(req);
      const status = req.body?.status;
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ success: false, message: 'status must be active or inactive' });
      }
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid id' });
      }
      const item = await Model.findOne({ _id: req.params.id, owner });
      if (!item) return res.status(404).json({ success: false, message: `${entityName} not found` });
      item.status = status;
      item.updatedBy = owner;
      await item.save();
      await logAudit({
        owner,
        actor: owner,
        action: status === 'active' ? `${auditPrefix}.activate` : `${auditPrefix}.deactivate`,
        entityType: entityName,
        entityId: item._id,
        details: `${entityName} set to ${status}`,
      });
      res.json({ success: true, item });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ success: false, message: `Failed to update ${entityName} status` });
    }
  };

  return { list, getOne, create, update, setStatus };
};

export default { createOwnedCrud, ownerIdFromReq };
