import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireOwner } from '../middleware/ownerAuth.js';
import { requirePermission } from '../middleware/requirePermission.js';
import {
  listContracts,
  getContract,
  generateContract,
  previewContract,
  previewContractFromBooking,
  downloadContractPdf,
  listBookingsForContracts,
} from '../controllers/contractController.js';

const router = express.Router();
const gate = (perm) => [protect, requireOwner, requirePermission(perm)];

router.get('/', ...gate('contracts'), listContracts);
router.get('/bookings', ...gate('contracts'), listBookingsForContracts);
router.get('/:id', ...gate('contracts'), getContract);
router.get('/:id/preview', ...gate('contracts'), previewContract);
router.get('/:id/pdf', ...gate('contracts'), downloadContractPdf);
router.post('/generate', ...gate('contracts'), generateContract);
router.post('/preview', ...gate('contracts'), previewContractFromBooking);

export default router;
