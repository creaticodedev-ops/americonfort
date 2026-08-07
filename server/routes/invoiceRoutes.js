import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireOwner } from '../middleware/ownerAuth.js';
import { requirePermission } from '../middleware/requirePermission.js';
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
const gate = (perm) => [protect, requireOwner, requirePermission(perm)];

router.get('/', ...gate('contracts'), listInvoices);
router.post('/generate', ...gate('contracts'), generateInvoice);
router.post('/manual', ...gate('contracts'), createManualInvoice);
router.get('/:id/versions', ...gate('contracts'), listInvoiceVersions);
router.post('/:id/restore/:version', ...gate('contracts'), restoreInvoiceVersion);
router.get('/:id/preview', ...gate('contracts'), previewInvoice);
router.get('/:id/pdf', ...gate('contracts'), downloadInvoicePdf);
router.patch('/:id', ...gate('contracts'), updateInvoice);
router.get('/:id', ...gate('contracts'), getInvoice);

export default router;
