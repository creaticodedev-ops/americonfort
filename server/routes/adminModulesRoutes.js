import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireOwner } from '../middleware/ownerAuth.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { requireFeature } from '../middleware/requireFeature.js';
import { samsarCrud, partnerCrud, chauffeurCrud, employeeCrud } from '../controllers/partnerDirectoryController.js';
import {
  accountingOverview,
  listAccountingRevenues,
  listSamsarPayments,
  createSamsarPayment,
  updateSamsarPayment,
  listAgencyExpenses,
  createAgencyExpense,
  updateAgencyExpense,
  listVehicleExpenses,
  createVehicleExpense,
  updateVehicleExpense,
} from '../controllers/accountingController.js';
import { exportAccountingXlsx } from '../controllers/xlsxExportController.js';
import {
  listSignatures,
  generateSignature,
  ensureSignature,
  resendSignature,
  cancelSignature,
  signatureStatus,
  previewExtension,
  confirmExtension,
  listExtensions,
} from '../controllers/reservationOpsController.js';

const router = express.Router();

const gate = (perm, feature) => [
  protect,
  requireOwner,
  ...(feature ? [requireFeature(feature)] : []),
  requirePermission(perm),
];

/* Partners — Samsars */
router.get('/samsars', ...gate('partners', 'partners'), samsarCrud.list);
router.get('/samsars/:id', ...gate('partners', 'partners'), samsarCrud.getOne);
router.post('/samsars', ...gate('partners', 'partners'), samsarCrud.create);
router.patch('/samsars/:id', ...gate('partners', 'partners'), samsarCrud.update);
router.post('/samsars/:id/status', ...gate('partners', 'partners'), samsarCrud.setStatus);

/* Partners — Partner companies */
router.get('/partner-companies', ...gate('partners', 'partners'), partnerCrud.list);
router.get('/partner-companies/:id', ...gate('partners', 'partners'), partnerCrud.getOne);
router.post('/partner-companies', ...gate('partners', 'partners'), partnerCrud.create);
router.patch('/partner-companies/:id', ...gate('partners', 'partners'), partnerCrud.update);
router.post('/partner-companies/:id/status', ...gate('partners', 'partners'), partnerCrud.setStatus);

/* Chauffeurs */
router.get('/chauffeurs', ...gate('chauffeurs', 'chauffeurs'), chauffeurCrud.list);
router.get('/chauffeurs/:id', ...gate('chauffeurs', 'chauffeurs'), chauffeurCrud.getOne);
router.post('/chauffeurs', ...gate('chauffeurs', 'chauffeurs'), chauffeurCrud.create);
router.patch('/chauffeurs/:id', ...gate('chauffeurs', 'chauffeurs'), chauffeurCrud.update);
router.post('/chauffeurs/:id/status', ...gate('chauffeurs', 'chauffeurs'), chauffeurCrud.setStatus);

/* Employees — personnel records (not dashboard logins) */
router.get('/employees', ...gate('employees', 'employees'), employeeCrud.list);
router.get('/employees/:id', ...gate('employees', 'employees'), employeeCrud.getOne);
router.post('/employees', ...gate('employees', 'employees'), employeeCrud.create);
router.patch('/employees/:id', ...gate('employees', 'employees'), employeeCrud.update);
router.post('/employees/:id/status', ...gate('employees', 'employees'), employeeCrud.setStatus);

/* Signature requests */
router.get('/signature-requests', ...gate('signature_requests', 'signature_requests'), listSignatures);
router.get('/signature-requests/:bookingId', ...gate('signature_requests', 'signature_requests'), signatureStatus);
router.post('/signature-requests/generate', ...gate('signature_requests', 'signature_requests'), generateSignature);
router.post('/signature-requests/ensure', ...gate('signature_requests', 'signature_requests'), ensureSignature);
router.post('/signature-requests/resend', ...gate('signature_requests', 'signature_requests'), resendSignature);
router.post('/signature-requests/cancel', ...gate('signature_requests', 'signature_requests'), cancelSignature);

/* Contract extensions */
router.get('/booking-extensions', ...gate('contract_extensions', 'contract_extensions'), listExtensions);
router.post('/booking-extensions/preview', ...gate('contract_extensions', 'contract_extensions'), previewExtension);
router.post('/booking-extensions/confirm', ...gate('contract_extensions', 'contract_extensions'), confirmExtension);

/* Accounting */
router.get('/accounting/overview', ...gate('accounting', 'accounting'), accountingOverview);
router.get('/accounting/export', ...gate('accounting', 'accounting'), exportAccountingXlsx);
router.get('/accounting/revenues', ...gate('accounting', 'accounting'), listAccountingRevenues);
router.get('/accounting/samsar-payments', ...gate('accounting', 'accounting'), listSamsarPayments);
router.post('/accounting/samsar-payments', ...gate('accounting', 'accounting'), createSamsarPayment);
router.patch('/accounting/samsar-payments/:id', ...gate('accounting', 'accounting'), updateSamsarPayment);
router.get('/accounting/agency-expenses', ...gate('accounting', 'accounting'), listAgencyExpenses);
router.post('/accounting/agency-expenses', ...gate('accounting', 'accounting'), createAgencyExpense);
router.patch('/accounting/agency-expenses/:id', ...gate('accounting', 'accounting'), updateAgencyExpense);
router.get('/accounting/vehicle-expenses', ...gate('accounting', 'accounting'), listVehicleExpenses);
router.post('/accounting/vehicle-expenses', ...gate('accounting', 'accounting'), createVehicleExpense);
router.patch('/accounting/vehicle-expenses/:id', ...gate('accounting', 'accounting'), updateVehicleExpense);

export default router;
