import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/superAdminAuth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import {
  superAdminLogin,
  getSuperAdminProfile,
  getPlatformOverview,
  listAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  setAccountStatus,
  resetAdminPassword,
  setAdminPermissions,
  deleteAdmin,
  manageLicense,
  getPlatformAuditLogs,
  getPlatformActivity,
} from '../controllers/superAdminController.js';
import {
  listAgencies,
  getAgencyById,
  createAgency,
  updateAgency,
  setAgencyStatus,
} from '../controllers/agencyController.js';
import {
  listPlans,
  getPlanById,
  createPlan,
  updatePlan,
  setPlanActive,
  assignAgencyPlan,
} from '../controllers/planController.js';

const superAdminRouter = express.Router();

superAdminRouter.post(
  '/login',
  rateLimit({ windowMs: 60_000, max: 8, message: 'Too many login attempts' }),
  superAdminLogin
);

const gate = [protect, requireSuperAdmin];

superAdminRouter.get('/me', ...gate, getSuperAdminProfile);
superAdminRouter.get('/overview', ...gate, getPlatformOverview);

superAdminRouter.get('/admins', ...gate, listAdmins);
superAdminRouter.post('/admins', ...gate, createAdmin);
superAdminRouter.get('/admins/:id', ...gate, getAdminById);
superAdminRouter.patch('/admins/:id', ...gate, updateAdmin);
superAdminRouter.patch('/admins/:id/status', ...gate, setAccountStatus);
superAdminRouter.post('/admins/:id/password', ...gate, resetAdminPassword);
superAdminRouter.patch('/admins/:id/permissions', ...gate, setAdminPermissions);
superAdminRouter.delete('/admins/:id', ...gate, deleteAdmin);
superAdminRouter.post('/admins/:id/license', ...gate, manageLicense);

// Phase 1 — Agencies Management (owner User = agency root; no hard delete)
superAdminRouter.get('/agencies', ...gate, listAgencies);
superAdminRouter.post('/agencies', ...gate, createAgency);
superAdminRouter.get('/agencies/:id', ...gate, getAgencyById);
superAdminRouter.patch('/agencies/:id', ...gate, updateAgency);
superAdminRouter.patch('/agencies/:id/status', ...gate, setAgencyStatus);
superAdminRouter.patch('/agencies/:id/plan', ...gate, assignAgencyPlan);

// Phase 2 — SaaS Plans & Feature Entitlements (no billing)
superAdminRouter.get('/plans', ...gate, listPlans);
superAdminRouter.post('/plans', ...gate, createPlan);
superAdminRouter.get('/plans/:id', ...gate, getPlanById);
superAdminRouter.patch('/plans/:id', ...gate, updatePlan);
superAdminRouter.patch('/plans/:id/status', ...gate, setPlanActive);

superAdminRouter.get('/audit-logs', ...gate, getPlatformAuditLogs);
superAdminRouter.get('/activity', ...gate, getPlatformActivity);

export default superAdminRouter;
