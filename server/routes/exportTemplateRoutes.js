import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireOwner } from '../middleware/ownerAuth.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { requireFeature } from '../middleware/requireFeature.js';
import upload, { handleMulterError } from '../middleware/multer.js';
import {
  listExportTemplates,
  getExportTemplate,
  createExportTemplate,
  updateExportTemplate,
  deleteExportTemplate,
  uploadTemplateLogo,
  uploadTemplateSignature,
  getTemplateVariables,
  previewTemplate,
} from '../controllers/exportTemplateController.js';

const router = express.Router();
const gate = (perm, feature) => [
  protect,
  requireOwner,
  ...(feature ? [requireFeature(feature)] : []),
  requirePermission(perm),
];

router.get('/variables', ...gate('templates', 'templates'), getTemplateVariables);
router.get('/', ...gate('templates', 'templates'), listExportTemplates);
router.post('/preview', ...gate('templates', 'templates'), previewTemplate);
router.post('/', ...gate('templates', 'templates'), createExportTemplate);
router.post('/:id/logo', ...gate('templates', 'templates'), upload.single('logo'), handleMulterError, uploadTemplateLogo);
router.post('/:id/signature', ...gate('templates', 'templates'), upload.single('signature'), handleMulterError, uploadTemplateSignature);
router.get('/:id', ...gate('templates', 'templates'), getExportTemplate);
router.put('/:id', ...gate('templates', 'templates'), updateExportTemplate);
router.delete('/:id', ...gate('templates', 'templates'), deleteExportTemplate);

export default router;
