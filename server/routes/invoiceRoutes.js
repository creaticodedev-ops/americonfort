import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireOwner } from '../middleware/ownerAuth.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { requireFeature } from '../middleware/requireFeature.js';
import {
  listInvoices,
  getInvoice,
  getInvoiceDraftFromBooking,
  suggestInvoiceNumber,
  generateInvoice,
  createManualInvoice,
  updateInvoice,
  deleteInvoice,
  listInvoiceVersions,
  restoreInvoiceVersion,
  previewInvoice,
  downloadInvoicePdf,
  getInvoiceShareLink,
} from '../controllers/invoiceController.js';
import { exportInvoicesXlsx } from '../controllers/xlsxExportController.js';

const router = express.Router();
const gate = (perm, feature) => [
  protect,
  requireOwner,
  ...(feature ? [requireFeature(feature)] : []),
  requirePermission(perm),
];

router.get('/', ...gate('contracts', 'invoices'), listInvoices);
router.get('/export', ...gate('contracts', 'invoices'), exportInvoicesXlsx);
router.get('/suggest-number', ...gate('contracts', 'invoices'), suggestInvoiceNumber);
router.get('/draft-from-booking/:bookingId', ...gate('contracts', 'invoices'), getInvoiceDraftFromBooking);
router.post('/generate', ...gate('contracts', 'invoices'), generateInvoice);
router.post('/manual', ...gate('contracts', 'invoices'), createManualInvoice);
router.get('/:id/versions', ...gate('contracts', 'invoices'), listInvoiceVersions);
router.post('/:id/restore/:version', ...gate('contracts', 'invoices'), restoreInvoiceVersion);
router.get('/:id/preview', ...gate('contracts', 'invoices'), previewInvoice);
router.get('/:id/pdf', ...gate('contracts', 'invoices'), downloadInvoicePdf);
router.get('/:id/share-link', ...gate('contracts', 'invoices'), getInvoiceShareLink);
router.patch('/:id', ...gate('contracts', 'invoices'), updateInvoice);
router.delete('/:id', ...gate('contracts', 'invoices'), deleteInvoice);
router.get('/:id', ...gate('contracts', 'invoices'), getInvoice);

export default router;
