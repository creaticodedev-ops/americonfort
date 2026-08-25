import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireOwner } from '../middleware/ownerAuth.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { requireFeature } from '../middleware/requireFeature.js';
import {
  listContracts,
  getContract,
  generateContract,
  updateContract,
  listContractVersions,
  restoreContractVersion,
  previewContract,
  previewContractFromBooking,
  downloadContractPdf,
  listBookingsForContracts,
  deleteContract,
  deleteContractsBulk,
} from '../controllers/contractController.js';
import { exportContractsXlsx } from '../controllers/xlsxExportController.js';

const router = express.Router();
const gate = (perm, feature) => [
  protect,
  requireOwner,
  ...(feature ? [requireFeature(feature)] : []),
  requirePermission(perm),
];

router.get('/', ...gate('contracts', 'contracts'), listContracts);
router.get('/export', ...gate('contracts', 'contracts'), exportContractsXlsx);
router.get('/bookings', ...gate('contracts', 'contracts'), listBookingsForContracts);
router.post('/generate', ...gate('contracts', 'contracts'), generateContract);
router.post('/preview', ...gate('contracts', 'contracts'), previewContractFromBooking);
router.post('/delete', ...gate('contracts', 'contracts'), deleteContract);
router.post('/delete-bulk', ...gate('contracts', 'contracts'), deleteContractsBulk);
router.get('/:id/versions', ...gate('contracts', 'contracts'), listContractVersions);
router.post('/:id/restore/:version', ...gate('contracts', 'contracts'), restoreContractVersion);
router.get('/:id/preview', ...gate('contracts', 'contracts'), previewContract);
router.get('/:id/pdf', ...gate('contracts', 'contracts'), downloadContractPdf);
router.patch('/:id', ...gate('contracts', 'contracts'), updateContract);
router.get('/:id', ...gate('contracts', 'contracts'), getContract);

export default router;
