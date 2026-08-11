import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireOwner } from '../middleware/ownerAuth.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { requireFeature } from '../middleware/requireFeature.js';
import {
  listInvoices,
  getInvoice,
  generateInvoice,
  createManualInvoice,
  updateInvoice,
  listInvoiceVersions,
  restoreInvoiceVersion,
  previewInvoice,
  downloadInvoicePdf,
} from '../controllers/invoiceController.js';

const router = express.Router();
const gate = (perm, feature) => [
  protect,
  requireOwner,
  ...(feature ? [requireFeature(feature)] : []),
  requirePermission(perm),
];

router.get('/', ...gate('contracts', 'invoices'), listInvoices);
router.post('/generate', ...gate('contracts', 'invoices'), generateInvoice);
router.post('/manual', ...gate('contracts', 'invoices'), createManualInvoice);
router.get('/:id/versions', ...gate('contracts', 'invoices'), listInvoiceVersions);
router.post('/:id/restore/:version', ...gate('contracts', 'invoices'), restoreInvoiceVersion);
router.get('/:id/preview', ...gate('contracts', 'invoices'), previewInvoice);
router.get('/:id/pdf', ...gate('contracts', 'invoices'), downloadInvoicePdf);
router.patch('/:id', ...gate('contracts', 'invoices'), updateInvoice);
router.get('/:id', ...gate('contracts', 'invoices'), getInvoice);

export default router;
