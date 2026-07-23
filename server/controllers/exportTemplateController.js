import mongoose from 'mongoose';
import ExportTemplate from '../models/ExportTemplate.js';
import { TEMPLATE_VARIABLES } from '../services/templateEngine.js';
import {
  DEFAULT_CONTRACT_BODY,
  DEFAULT_CONTRACT_HEADER,
  DEFAULT_CONTRACT_FOOTER,
  DEFAULT_INVOICE_BODY,
} from '../services/defaultTemplates.js';
import { publicUploadUrl } from '../services/pdfDocuments.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cleanupUploadedFile } from '../middleware/multer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_DIR = path.join(__dirname, '..', 'uploads', 'templates');

const ensureLogoDir = () => {
  if (!fs.existsSync(LOGO_DIR)) fs.mkdirSync(LOGO_DIR, { recursive: true });
};

/** Seed default contract + invoice templates for an owner if none exist */
export const ensureDefaultTemplates = async (ownerId) => {
  const count = await ExportTemplate.countDocuments({ owner: ownerId });
  if (count > 0) return;

  await ExportTemplate.insertMany([
    {
      owner: ownerId,
      name: 'Standard Rental Contract',
      type: 'contract',
      headerHtml: DEFAULT_CONTRACT_HEADER,
      bodyHtml: DEFAULT_CONTRACT_BODY,
      footerHtml: DEFAULT_CONTRACT_FOOTER,
      isDefault: true,
      isActive: true,
    },
    {
      owner: ownerId,
      name: 'Standard Invoice',
      type: 'invoice',
      headerHtml: DEFAULT_CONTRACT_HEADER,
      bodyHtml: DEFAULT_INVOICE_BODY,
      footerHtml: DEFAULT_CONTRACT_FOOTER,
      isDefault: true,
      isActive: true,
    },
  ]);
};

export const listExportTemplates = async (req, res) => {
  try {
    const ownerId = req.user._id;
    await ensureDefaultTemplates(ownerId);

    const { type } = req.query;
    const query = { owner: ownerId, isActive: true };
    if (type && ['contract', 'invoice', 'custom'].includes(type)) {
      query.type = type;
    }

    const templates = await ExportTemplate.find(query).sort({ isDefault: -1, name: 1 }).lean();
    res.json({ success: true, templates });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load templates' });
  }
};

export const getExportTemplate = async (req, res) => {
  try {
    const template = await ExportTemplate.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).lean();

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.json({ success: true, template });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load template' });
  }
};

export const createExportTemplate = async (req, res) => {
  try {
    const { name, type, headerHtml, bodyHtml, footerHtml, customCss, pageSize, isDefault } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Template name is required' });
    }

    const templateType = ['contract', 'invoice', 'custom'].includes(type) ? type : 'custom';

    if (isDefault) {
      await ExportTemplate.updateMany(
        { owner: req.user._id, type: templateType },
        { $set: { isDefault: false } }
      );
    }

    const template = await ExportTemplate.create({
      owner: req.user._id,
      name: name.trim(),
      type: templateType,
      headerHtml: headerHtml || '',
      bodyHtml: bodyHtml || '',
      footerHtml: footerHtml || '',
      customCss: customCss || '',
      pageSize: pageSize === 'Letter' ? 'Letter' : 'A4',
      isDefault: Boolean(isDefault),
    });

    res.status(201).json({ success: true, message: 'Template created', template });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to create template' });
  }
};

export const updateExportTemplate = async (req, res) => {
  try {
    const template = await ExportTemplate.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const { name, type, headerHtml, bodyHtml, footerHtml, customCss, pageSize, isDefault, isActive } = req.body;

    if (name !== undefined) template.name = String(name).trim();
    if (type !== undefined && ['contract', 'invoice', 'custom'].includes(type)) template.type = type;
    if (headerHtml !== undefined) template.headerHtml = headerHtml;
    if (bodyHtml !== undefined) template.bodyHtml = bodyHtml;
    if (footerHtml !== undefined) template.footerHtml = footerHtml;
    if (customCss !== undefined) template.customCss = customCss;
    if (pageSize !== undefined) template.pageSize = pageSize === 'Letter' ? 'Letter' : 'A4';
    if (isActive !== undefined) template.isActive = Boolean(isActive);

    if (isDefault) {
      await ExportTemplate.updateMany(
        { owner: req.user._id, type: template.type, _id: { $ne: template._id } },
        { $set: { isDefault: false } }
      );
      template.isDefault = true;
    } else if (isDefault === false) {
      template.isDefault = false;
    }

    await template.save();
    res.json({ success: true, message: 'Template updated', template });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to update template' });
  }
};

export const deleteExportTemplate = async (req, res) => {
  try {
    const template = await ExportTemplate.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    template.isActive = false;
    await template.save();

    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to delete template' });
  }
};

export const uploadTemplateLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Logo image is required' });
    }

    const template = await ExportTemplate.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!template) {
      cleanupUploadedFile(req.file);
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    ensureLogoDir();
    const ext = path.extname(req.file.originalname) || '.png';
    const fileName = `logo-${template._id}${ext}`;
    const destPath = path.join(LOGO_DIR, fileName);

    fs.renameSync(req.file.path, destPath);
    template.logoUrl = publicUploadUrl(destPath);
    await template.save();

    res.json({ success: true, message: 'Logo uploaded', logoUrl: template.logoUrl, template });
  } catch (error) {
    cleanupUploadedFile(req.file);
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to upload logo' });
  }
};

export const getTemplateVariables = async (_req, res) => {
  res.json({ success: true, variables: TEMPLATE_VARIABLES });
};

export const previewTemplate = async (req, res) => {
  try {
    const { templateId, bookingId } = req.body;
    if (!mongoose.isValidObjectId(templateId)) {
      return res.status(400).json({ success: false, message: 'Invalid template ID' });
    }

    const template = await ExportTemplate.findOne({
      _id: templateId,
      owner: req.user._id,
    }).lean();

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    let booking = null;
    if (bookingId && mongoose.isValidObjectId(bookingId)) {
      const Booking = (await import('../models/Booking.js')).default;
      booking = await Booking.findOne({ _id: bookingId, owner: req.user._id }).populate('car').lean();
    }

    const { buildTemplateVariables, buildDocumentHtml } = await import('../services/templateEngine.js');
    const variables = buildTemplateVariables(booking || {}, { owner: req.user });
    const html = buildDocumentHtml(template, variables);

    res.json({ success: true, html, variables });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to preview template' });
  }
};

export default {
  listExportTemplates,
  getExportTemplate,
  createExportTemplate,
  updateExportTemplate,
  deleteExportTemplate,
  uploadTemplateLogo,
  getTemplateVariables,
  previewTemplate,
  ensureDefaultTemplates,
};
