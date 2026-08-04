import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User, { OWNER_PERMISSIONS } from '../models/User.js';
import Car from '../models/Car.js';
import Booking from '../models/Booking.js';
import AuditLog from '../models/AuditLog.js';
import GuestCustomer from '../models/GuestCustomer.js';
import { logAudit } from '../utils/adminOps.js';
import {
  createTrialDefaults,
  serializeLicense,
  syncLicenseStatus,
  activateLicense,
  startTrial,
  extendTrial,
  expireLicense,
  TRIAL_DAYS,
} from '../services/licenseService.js';
import { escapeRegex } from '../utils/helpers.js';
import { normalizeEmail, findUserByEmail } from '../utils/emailUtils.js';

const generateToken = (user) =>
  jwt.sign(
    { _id: user._id.toString(), tv: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const sanitizeAdmin = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  return {
    ...obj,
    license: serializeLicense(user),
    permissions: Array.isArray(obj.permissions) ? obj.permissions : [],
  };
};

const findOwnerOrFail = async (id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  return User.findOne({ _id: id, role: 'owner' });
};

const audit = (superAdmin, target, action, details, meta = {}) =>
  logAudit({
    owner: target?._id || superAdmin._id,
    actor: superAdmin._id,
    action,
    entityType: 'User',
    entityId: target?._id,
    details,
    meta: { ...meta, via: 'superadmin' },
  });

// ─── Auth ───────────────────────────────────────────────

export const superAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await findUserByEmail(User, normalizedEmail);
    if (!user || user.role !== 'superadmin') {
      return res.status(401).json({ success: false, message: 'Invalid Super Admin credentials' });
    }

    if (user.accountStatus && user.accountStatus !== 'active') {
      return res.status(403).json({ success: false, message: 'This Super Admin account is locked' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid Super Admin credentials' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user);
    res.json({
      success: true,
      token,
      user: sanitizeAdmin(user),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

export const getSuperAdminProfile = async (req, res) => {
  try {
    res.json({ success: true, user: sanitizeAdmin(req.user) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load profile' });
  }
};

// ─── Dashboard overview ─────────────────────────────────

export const getPlatformOverview = async (req, res) => {
  try {
    const [
      totalAdmins,
      activeAdmins,
      suspendedAdmins,
      trialAdmins,
      licensedAdmins,
      expiredAdmins,
      totalCars,
      totalBookings,
      totalCustomers,
    ] = await Promise.all([
      User.countDocuments({ role: 'owner' }),
      User.countDocuments({ role: 'owner', accountStatus: 'active' }),
      User.countDocuments({ role: 'owner', accountStatus: { $in: ['suspended', 'disabled'] } }),
      User.countDocuments({ role: 'owner', licenseStatus: 'trial' }),
      User.countDocuments({ role: 'owner', licenseStatus: 'active' }),
      User.countDocuments({ role: 'owner', licenseStatus: 'expired' }),
      Car.countDocuments({ owner: { $ne: null } }),
      Booking.countDocuments({}),
      GuestCustomer.countDocuments({}),
    ]);

    const recentAdmins = await User.find({ role: 'owner' })
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(8);

    res.json({
      success: true,
      overview: {
        totalAdmins,
        activeAdmins,
        suspendedAdmins,
        trialAdmins,
        licensedAdmins,
        expiredAdmins,
        totalCars,
        totalBookings,
        totalCustomers,
      },
      recentAdmins: recentAdmins.map(sanitizeAdmin),
      permissionCatalog: OWNER_PERMISSIONS,
      trialDaysDefault: TRIAL_DAYS,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load overview' });
  }
};

// ─── Admin account CRUD ─────────────────────────────────

export const listAdmins = async (req, res) => {
  try {
    const { search = '', status = '', license = '', page = 1, limit = 20 } = req.query;
    const filter = { role: 'owner' };

    if (status) filter.accountStatus = status;
    if (license) filter.licenseStatus = license;
    if (search.trim()) {
      const q = escapeRegex(search.trim());
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { agencyName: new RegExp(q, 'i') },
      ];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const lim = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * lim;

    const [admins, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(lim),
      User.countDocuments(filter),
    ]);

    // Sync license status for listed accounts (non-blocking best-effort)
    for (const admin of admins) {
      await syncLicenseStatus(admin);
    }

    res.json({
      success: true,
      admins: admins.map(sanitizeAdmin),
      pagination: {
        total,
        page: pageNum,
        limit: lim,
        totalPages: Math.max(1, Math.ceil(total / lim)),
      },
      permissionCatalog: OWNER_PERMISSIONS,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to list admins' });
  }
};

export const getAdminById = async (req, res) => {
  try {
    const admin = await findOwnerOrFail(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    await syncLicenseStatus(admin);

    const [cars, bookings, customers] = await Promise.all([
      Car.countDocuments({ owner: admin._id }),
      Booking.countDocuments({ owner: admin._id }),
      GuestCustomer.countDocuments({ owner: admin._id }),
    ]);

    res.json({
      success: true,
      admin: sanitizeAdmin(admin),
      stats: { cars, bookings, customers },
      permissionCatalog: OWNER_PERMISSIONS,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load admin' });
  }
};

export const createAdmin = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      agencyName = '',
      accountStatus = 'active',
      permissions = [],
      startTrial: shouldStartTrial = true,
      notes = '',
    } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const trial = shouldStartTrial ? createTrialDefaults() : {
      licenseStatus: 'expired',
      trialStartedAt: null,
      trialEndsAt: null,
      licensedAt: null,
    };

    const perms = Array.isArray(permissions)
      ? permissions.filter((p) => OWNER_PERMISSIONS.includes(p))
      : [];

    const admin = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashed,
      role: 'owner',
      agencyName: agencyName.trim(),
      accountStatus: ['active', 'suspended', 'disabled'].includes(accountStatus) ? accountStatus : 'active',
      permissions: perms,
      notes: String(notes || ''),
      ...trial,
    });

    await audit(req.user, admin, 'superadmin.admin.create', `Created admin ${admin.email}`);

    res.status(201).json({
      success: true,
      message: 'Admin account created',
      admin: sanitizeAdmin(admin),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to create admin' });
  }
};

export const updateAdmin = async (req, res) => {
  try {
    const admin = await findOwnerOrFail(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    const { name, email, agencyName, notes, permissions } = req.body;

    if (name !== undefined) admin.name = String(name).trim();
    if (agencyName !== undefined) admin.agencyName = String(agencyName).trim();
    if (notes !== undefined) admin.notes = String(notes);
    if (email !== undefined) {
      const normalized = String(email).trim().toLowerCase();
      if (normalized !== admin.email) {
        const clash = await User.findOne({ email: normalized, _id: { $ne: admin._id } });
        if (clash) {
          return res.status(409).json({ success: false, message: 'Email already in use' });
        }
        admin.email = normalized;
      }
    }
    if (permissions !== undefined) {
      const normalizedPermissions = Array.isArray(permissions)
        ? permissions.filter((p) => OWNER_PERMISSIONS.includes(p))
        : [];

      const oldPermissions = Array.isArray(admin.permissions) ? admin.permissions : [];
      const permissionsChanged =
        normalizedPermissions.length !== oldPermissions.length ||
        normalizedPermissions.some((p) => !oldPermissions.includes(p)) ||
        oldPermissions.some((p) => !normalizedPermissions.includes(p));

      admin.permissions = normalizedPermissions;
      if (permissionsChanged) {
        admin.tokenVersion = (admin.tokenVersion || 0) + 1;
      }
    }

    await admin.save();
    await audit(req.user, admin, 'superadmin.admin.update', `Updated admin ${admin.email}`);

    res.json({ success: true, message: 'Admin updated', admin: sanitizeAdmin(admin) });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to update admin' });
  }
};

export const setAccountStatus = async (req, res) => {
  try {
    const admin = await findOwnerOrFail(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    const { status } = req.body;
    if (!['active', 'suspended', 'disabled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid account status' });
    }

    admin.accountStatus = status;
    // Revoke existing sessions when locking an account
    if (status === 'suspended' || status === 'disabled') {
      admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    }
    await admin.save();
    await audit(
      req.user,
      admin,
      'superadmin.admin.status',
      `Set accountStatus=${status} for ${admin.email}`,
      { status }
    );

    res.json({
      success: true,
      message: `Account ${status}`,
      admin: sanitizeAdmin(admin),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

export const resetAdminPassword = async (req, res) => {
  try {
    const admin = await findOwnerOrFail(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    const { password } = req.body;
    if (!password || String(password).length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    admin.password = await bcrypt.hash(password, 10);
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    await admin.save();
    await audit(req.user, admin, 'superadmin.admin.password_reset', `Password reset for ${admin.email}`);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};

export const setAdminPermissions = async (req, res) => {
  try {
    const admin = await findOwnerOrFail(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    const { permissions } = req.body;
    const normalizedPermissions = Array.isArray(permissions)
      ? permissions.filter((p) => OWNER_PERMISSIONS.includes(p))
      : [];

    const oldPermissions = Array.isArray(admin.permissions) ? admin.permissions : [];
    const permissionsChanged =
      normalizedPermissions.length !== oldPermissions.length ||
      normalizedPermissions.some((p) => !oldPermissions.includes(p)) ||
      oldPermissions.some((p) => !normalizedPermissions.includes(p));

    admin.permissions = normalizedPermissions;
    if (permissionsChanged) {
      admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    }

    await admin.save();
    await audit(
      req.user,
      admin,
      'superadmin.admin.permissions',
      `Updated permissions for ${admin.email}`,
      { permissions: admin.permissions }
    );

    res.json({
      success: true,
      message: 'Permissions updated',
      admin: sanitizeAdmin(admin),
      note: 'Empty permissions list means full access',
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to update permissions' });
  }
};

export const deleteAdmin = async (req, res) => {
  try {
    const admin = await findOwnerOrFail(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    const email = admin.email;
    // Soft-lock instead of hard-delete by default if they have data
    const [cars, bookings] = await Promise.all([
      Car.countDocuments({ owner: admin._id }),
      Booking.countDocuments({ owner: admin._id }),
    ]);

    if (cars > 0 || bookings > 0) {
      admin.accountStatus = 'disabled';
      admin.licenseStatus = 'expired';
      await admin.save();
      await audit(
        req.user,
        admin,
        'superadmin.admin.disable',
        `Disabled admin ${email} (has ${cars} cars / ${bookings} bookings — data preserved)`,
        { cars, bookings }
      );
      return res.json({
        success: true,
        message: 'Admin has existing data and was disabled instead of deleted. All data preserved.',
        admin: sanitizeAdmin(admin),
        softDeleted: true,
      });
    }

    await User.deleteOne({ _id: admin._id });
    await audit(req.user, { _id: admin._id }, 'superadmin.admin.delete', `Deleted admin ${email}`);

    res.json({ success: true, message: 'Admin account deleted', softDeleted: false });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to delete admin' });
  }
};

// ─── License management ─────────────────────────────────

export const manageLicense = async (req, res) => {
  try {
    const admin = await findOwnerOrFail(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    const { action, days } = req.body;
    const n = Math.max(1, Number(days) || TRIAL_DAYS);

    switch (action) {
      case 'activate':
        await activateLicense(admin);
        break;
      case 'trial':
        await startTrial(admin, n);
        break;
      case 'extend':
        await extendTrial(admin, n);
        break;
      case 'expire':
        await expireLicense(admin);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Use activate | trial | extend | expire',
        });
    }

    await audit(
      req.user,
      admin,
      `superadmin.license.${action}`,
      `License ${action} for ${admin.email}`,
      { days: n, licenseStatus: admin.licenseStatus }
    );

    res.json({
      success: true,
      message: `License ${action} applied`,
      admin: sanitizeAdmin(admin),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to update license' });
  }
};

// ─── System activity ────────────────────────────────────

export const getPlatformAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 30, search = '' } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const lim = Math.min(100, Math.max(1, Number(limit) || 30));
    const filter = {};

    if (search.trim()) {
      const q = escapeRegex(search.trim());
      filter.$or = [
        { action: new RegExp(q, 'i') },
        { details: new RegExp(q, 'i') },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('owner', 'name email agencyName role')
        .populate('actor', 'name email role')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * lim)
        .limit(lim),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: lim,
        totalPages: Math.max(1, Math.ceil(total / lim)),
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load audit logs' });
  }
};

export const getPlatformActivity = async (req, res) => {
  try {
    const recentBookings = await Booking.find({})
      .populate('car', 'brand model')
      .populate('owner', 'name email agencyName')
      .sort({ createdAt: -1 })
      .limit(15)
      .select('reservationId customerName status paymentStatus price pickupDate createdAt owner car');

    const recentCars = await Car.find({ owner: { $ne: null } })
      .populate('owner', 'name email agencyName')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('brand model category pricePerDay isAvaliable owner createdAt');

    res.json({
      success: true,
      recentBookings,
      recentCars,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load activity' });
  }
};
