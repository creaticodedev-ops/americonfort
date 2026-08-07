import fs from 'fs';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Booking from '../models/Booking.js';
import { publicUploadUrl } from '../services/pdfDocuments.js';
import { generateDocumentFromTemplate } from '../services/templatePdfExport.js';
import { buildDocumentHtml } from '../services/templateEngine.js';
import { ensureDefaultTemplates } from './exportTemplateController.js';
import { getDefaultInvoiceTemplate } from '../utils/resolveExportTemplate.js';
import { logAudit } from '../utils/adminOps.js';
import {
  snapshotTemplate,
  buildInvoiceSourceData,
  buildBookingLikeFromInvoice,
  pushVersion,
  applySectionEdits,
  applyInvoiceStructuredEdits,
  rebuildVariablesFromStructured,
  renderAndStorePdf,
  hydrateLegacyDocument,
  markSourceLocked,
  syncDocumentListFields,
  resolveExistingPdfPath,
  versionSummary,
  templateFromSnapshot,
} from '../services/documentInstanceService.js';

const buildInvoiceNumber = (booking, provided = '') => {
  const trimmed = String(provided || '').trim();
  if (trimmed) return trimmed.toUpperCase();
  if (booking?.reservationId) return `INV-${booking.reservationId.replace(/^RES-/, '')}`;
  return `INV-${Date.now().toString().slice(-8).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
};

const generateInvoiceDocument = async ({
  owner,
  invoiceNumber,
  invoiceData,
  includeCompanyStamp,
  booking = null,
  template = null,
}) => {
  await ensureDefaultTemplates(owner._id || owner);
  const invoiceTemplate = template || await getDefaultInvoiceTemplate(owner._id || owner);

  if (!invoiceTemplate) {
    throw new Error('No invoice template found. Set a default invoice template in Admin → Export Templates.');
  }

  const bookingLike = buildBookingLikeFromInvoice(
    {
      invoiceNumber,
      customerName: invoiceData.customerName,
      customerEmail: invoiceData.customerEmail,
      customerPhone: invoiceData.customerPhone,
      customerAddress: invoiceData.customerAddress,
      vehicleBrand: invoiceData.vehicleBrand,
      vehicleModel: invoiceData.vehicleModel,
      vehicleYear: invoiceData.vehicleYear,
      vehiclePlate: invoiceData.vehiclePlate,
      vehicleType: invoiceData.vehicleType,
      invoiceDate: invoiceData.invoiceDate,
      dueDate: invoiceData.dueDate,
      subtotal: invoiceData.subtotal,
      discountAmount: invoiceData.discountAmount,
      totalAmount: invoiceData.totalAmount,
      paymentStatus: invoiceData.paymentStatus,
      notes: invoiceData.notes,
      source: booking ? 'booking' : 'manual',
    },
    booking?.toObject ? booking.toObject() : booking,
  );

  const invoiceResult = await generateDocumentFromTemplate({
    template: invoiceTemplate.toObject ? invoiceTemplate.toObject() : invoiceTemplate,
    booking: bookingLike,
    owner: owner._id || owner,
    documentTitle: `Invoice ${invoiceNumber}`,
    includeCompanyStamp,
  });

  return {
    filePath: invoiceResult.filePath,
    pdfUrl: invoiceResult.pdfUrl,
    renderedHtml: invoiceResult.renderedHtml,
    variables: invoiceResult.variables,
    template: invoiceTemplate,
  };
};

export const listInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', customerName = '', cin = '', phone = '' } = req.query;
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pg - 1) * lim;

    const query = { owner: req.user._id };
    const invoiceFilters = [];

    if (search?.trim()) {
      const term = search.trim();
      invoiceFilters.push(
        { invoiceNumber: { $regex: term, $options: 'i' } },
        { customerName: { $regex: term, $options: 'i' } },
        { customerEmail: { $regex: term, $options: 'i' } },
        { customerPhone: { $regex: term, $options: 'i' } },
      );
    }

    if (customerName?.trim()) {
      invoiceFilters.push({ customerName: { $regex: customerName.trim(), $options: 'i' } });
    }

    if (cin?.trim()) {
      const term = cin.trim();
      invoiceFilters.push({ customerTaxId: { $regex: term, $options: 'i' } });
    }

    if (phone?.trim()) {
      invoiceFilters.push({ customerPhone: { $regex: phone.trim(), $options: 'i' } });
    }

    if (invoiceFilters.length) {
      query.$or = invoiceFilters;
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .select('-renderedHtml -versions.sourceData -versions.renderedHtml -versions.templateSnapshot')
        .populate({
          path: 'booking',
          select: 'reservationId customerName customerPhone pickupDate returnDate price status car',
          populate: { path: 'car', select: 'brand model year' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      Invoice.countDocuments(query),
    ]);

    res.json({
      success: true,
      invoices,
      pagination: {
        total,
        page: pg,
        limit: lim,
        totalPages: Math.ceil(total / lim) || 1,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load invoices' });
  }
};

export const getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.user._id })
      .populate('template', 'name type');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    await hydrateLegacyDocument(invoice, { type: 'invoice', owner: req.user });
    if (invoice.isModified()) {
      await invoice.save();
    }

    await invoice.populate({ path: 'booking', populate: { path: 'car' } });

    const payload = invoice.toObject();
    res.json({
      success: true,
      invoice: {
        ...payload,
        versions: versionSummary(payload.versions),
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load invoice' });
  }
};

export const generateInvoice = async (req, res) => {
  try {
    const { bookingId, includeCompanyStamp = true, forceFromBooking = false } = req.body;

    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    const booking = await Booking.findOne({ _id: bookingId, owner: req.user._id }).populate('car');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const existingLocked = await Invoice.findOne({ booking: booking._id, owner: req.user._id })
      .select('_id invoiceNumber sourceLocked');
    if (existingLocked?.sourceLocked && !forceFromBooking) {
      return res.status(409).json({
        success: false,
        code: 'SOURCE_LOCKED',
        message: 'This invoice has manual edits. Confirm regenerate from booking to replace them.',
        invoiceId: existingLocked._id,
        invoiceNumber: existingLocked.invoiceNumber,
      });
    }

    const invoiceData = {
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      customerAddress: booking.customerAddress || '',
      customerNationality: booking.nationality || '',
      customerDob: booking.dateOfBirth || '',
      invoiceDate: booking.pickupDate || new Date(),
      dueDate: booking.returnDate || booking.pickupDate || new Date(),
      currency: req.body.currency || 'MAD',
      subtotal: booking.price || 0,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: booking.price || 0,
      paymentStatus: booking.paymentStatus || 'pending',
      notes: booking.notes || '',
      vehicleBrand: booking.car?.brand || '',
      vehicleModel: booking.car?.model || '',
      vehicleYear: booking.car?.year || '',
      vehiclePlate: booking.car?.licensePlate || '',
      items: [{
        description: `Rental ${booking.car?.brand || ''} ${booking.car?.model || ''}`.trim() || 'Rental',
        quantity: 1,
        unitPrice: booking.price || 0,
        taxRate: 0,
      }],
    };

    const existing = await Invoice.findOne({ booking: booking._id, owner: req.user._id });
    const invoiceNumber = existing?.invoiceNumber || buildInvoiceNumber(booking);

    const { filePath, pdfUrl, renderedHtml, variables, template } = await generateInvoiceDocument({
      owner: req.user,
      invoiceNumber,
      invoiceData,
      includeCompanyStamp,
      booking,
    });

    const sourceData = buildInvoiceSourceData({
      owner: req.user,
      template,
      invoiceNumber,
      invoiceData,
      booking,
      includeCompanyStamp,
    });
    sourceData.variables = variables || sourceData.variables;
    const templateSnap = snapshotTemplate(template);

    let invoice;
    if (existing) {
      pushVersion(existing, req.user, forceFromBooking
        ? 'Regenerated from booking (replaced manual edits)'
        : 'Regenerated from booking');
      Object.assign(existing, {
        source: 'booking',
        invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        dueDate: invoiceData.dueDate,
        currency: invoiceData.currency,
        customerName: invoiceData.customerName || '',
        customerEmail: invoiceData.customerEmail || '',
        customerPhone: invoiceData.customerPhone || '',
        customerAddress: invoiceData.customerAddress || '',
        vehicleBrand: invoiceData.vehicleBrand || '',
        vehicleModel: invoiceData.vehicleModel || '',
        vehicleYear: invoiceData.vehicleYear || '',
        vehiclePlate: invoiceData.vehiclePlate || '',
        items: invoiceData.items,
        subtotal: invoiceData.subtotal,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: invoiceData.totalAmount,
        paymentStatus: invoiceData.paymentStatus || 'pending',
        notes: invoiceData.notes || '',
        template: template._id,
        templateSnapshot: templateSnap,
        sourceData,
        renderedHtml,
        pdfUrl: pdfUrl || publicUploadUrl(filePath),
        pdfPath: filePath,
        includeCompanyStamp: Boolean(includeCompanyStamp),
        sourceLocked: false,
        manuallyEditedAt: null,
        updatedBy: req.user._id,
        generatedBy: existing.generatedBy || req.user._id,
        createdBy: existing.createdBy || existing.generatedBy || req.user._id,
        lastGeneratedAt: new Date(),
        status: 'final',
      });
      await existing.save();
      invoice = existing;
    } else {
      invoice = await Invoice.create({
        owner: req.user._id,
        booking: booking._id,
        source: 'booking',
        invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        dueDate: invoiceData.dueDate,
        currency: invoiceData.currency,
        customerName: invoiceData.customerName || '',
        customerEmail: invoiceData.customerEmail || '',
        customerPhone: invoiceData.customerPhone || '',
        customerAddress: invoiceData.customerAddress || '',
        vehicleBrand: invoiceData.vehicleBrand || '',
        vehicleModel: invoiceData.vehicleModel || '',
        vehicleYear: invoiceData.vehicleYear || '',
        vehiclePlate: invoiceData.vehiclePlate || '',
        items: invoiceData.items,
        subtotal: invoiceData.subtotal,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: invoiceData.totalAmount,
        paymentStatus: invoiceData.paymentStatus || 'pending',
        notes: invoiceData.notes || '',
        template: template._id,
        templateSnapshot: templateSnap,
        sourceData,
        renderedHtml,
        pdfUrl: pdfUrl || publicUploadUrl(filePath),
        pdfPath: filePath,
        generatedBy: req.user._id,
        createdBy: req.user._id,
        updatedBy: req.user._id,
        includeCompanyStamp: Boolean(includeCompanyStamp),
        version: 1,
        versions: [],
        lastGeneratedAt: new Date(),
        status: 'final',
      });
    }

    await logAudit({
      owner: req.user._id,
      action: 'invoice.generate',
      entityType: 'Invoice',
      entityId: invoice._id,
      details: `Invoice ${invoiceNumber} generated for ${booking.reservationId}`,
    });

    res.status(201).json({ success: true, message: 'Invoice generated successfully', invoice });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate invoice' });
  }
};

export const createManualInvoice = async (req, res) => {
  try {
    const {
      invoiceNumber,
      invoiceDate,
      dueDate,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerTaxId,
      vehicleBrand,
      vehicleModel,
      vehicleYear,
      vehiclePlate,
      vehicleType,
      items = [],
      discountAmount = 0,
      taxAmount: suppliedTaxAmount,
      paymentStatus = 'pending',
      paymentMethod = 'cash',
      paymentReference = '',
      notes = '',
      currency = 'MAD',
      includeCompanyStamp = true,
    } = req.body;

    if (!customerName?.trim()) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }

    const normalizedItems = (Array.isArray(items) ? items : [])
      .map((item) => ({
        description: String(item.description || '').trim(),
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        taxRate: Number(item.taxRate || 0),
      }))
      .filter((item) => item.description || item.quantity || item.unitPrice);

    if (!normalizedItems.length) {
      return res.status(400).json({ success: false, message: 'At least one invoice item is required' });
    }

    const subtotal = normalizedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const computedTaxAmount = Number(suppliedTaxAmount ?? normalizedItems.reduce((sum, item) => sum + ((item.quantity * item.unitPrice) * (item.taxRate || 0) / 100), 0));
    const discount = Number(discountAmount || 0);
    const totalAmount = Math.max(0, subtotal + computedTaxAmount - discount);
    const finalInvoiceNumber = buildInvoiceNumber(null, invoiceNumber);
    const invoiceDateValue = invoiceDate ? new Date(invoiceDate) : new Date();
    const dueDateValue = dueDate ? new Date(dueDate) : null;
    const itemsSummary = normalizedItems.map((item) => `${item.description || 'Item'} x${item.quantity || 1} @ ${currency} ${Number(item.unitPrice || 0).toFixed(2)}`).join('\n');
    const finalNotes = [notes, itemsSummary].filter(Boolean).join('\n\n');

    const invoiceData = {
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerTaxId,
      customerNationality: '',
      customerDob: '',
      invoiceDate: invoiceDateValue,
      dueDate: dueDateValue,
      currency,
      subtotal,
      discountAmount: discount,
      taxAmount: computedTaxAmount,
      totalAmount,
      paymentStatus,
      paymentMethod,
      paymentReference,
      notes: finalNotes,
      vehicleBrand,
      vehicleModel,
      vehicleYear,
      vehiclePlate,
      vehicleType,
      items: normalizedItems,
    };

    const { filePath, pdfUrl, renderedHtml, variables, template } = await generateInvoiceDocument({
      owner: req.user,
      invoiceNumber: finalInvoiceNumber,
      invoiceData,
      includeCompanyStamp,
    });

    const sourceData = buildInvoiceSourceData({
      owner: req.user,
      template,
      invoiceNumber: finalInvoiceNumber,
      invoiceData,
      includeCompanyStamp,
    });
    sourceData.variables = variables || sourceData.variables;

    const invoice = await Invoice.create({
      owner: req.user._id,
      booking: null,
      source: 'manual',
      invoiceNumber: finalInvoiceNumber,
      invoiceDate: invoiceDateValue,
      dueDate: dueDateValue,
      currency,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerTaxId,
      vehicleBrand,
      vehicleModel,
      vehicleYear,
      vehiclePlate,
      vehicleType,
      items: normalizedItems,
      subtotal,
      discountAmount: discount,
      taxAmount: computedTaxAmount,
      totalAmount,
      paymentStatus,
      paymentMethod,
      paymentReference,
      notes: finalNotes,
      template: template._id,
      templateSnapshot: snapshotTemplate(template),
      sourceData,
      renderedHtml,
      pdfUrl: pdfUrl || publicUploadUrl(filePath),
      pdfPath: filePath,
      generatedBy: req.user._id,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      includeCompanyStamp: Boolean(includeCompanyStamp),
      version: 1,
      versions: [],
      lastGeneratedAt: new Date(),
      status: 'final',
    });

    await logAudit({
      owner: req.user._id,
      action: 'invoice.generate',
      entityType: 'Invoice',
      entityId: invoice._id,
      details: `Manual invoice ${finalInvoiceNumber} created`,
    });

    res.status(201).json({ success: true, message: 'Manual invoice created successfully', invoice });
  } catch (error) {
    console.error(error.message);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Invoice number already exists, please choose another one' });
    }
    res.status(500).json({ success: false, message: error.message || 'Failed to create manual invoice' });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid invoice ID' });
    }

    const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.user._id });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    await hydrateLegacyDocument(invoice, { type: 'invoice', owner: req.user });
    const regeneratePdf = req.body.regeneratePdf !== false;
    pushVersion(invoice, req.user, req.body.note || 'Updated');

    applyInvoiceStructuredEdits(invoice, req.body);
    if (req.body.sections) {
      applySectionEdits(invoice, req.body.sections);
    }

    markSourceLocked(invoice);

    const variables = rebuildVariablesFromStructured(invoice, {
      type: 'invoice',
      owner: req.user,
      booking: null,
    });
    invoice.sourceData = {
      ...(invoice.sourceData || {}),
      variables,
    };
    invoice.renderedHtml = buildDocumentHtml(
      templateFromSnapshot(invoice.templateSnapshot || {}),
      variables,
    );
    invoice.updatedBy = req.user._id;
    syncDocumentListFields(invoice, 'invoice');

    if (regeneratePdf) {
      await renderAndStorePdf({ type: 'invoice', doc: invoice, owner: req.user });
    }

    await invoice.save();

    await logAudit({
      owner: req.user._id,
      action: regeneratePdf ? 'invoice.regenerate' : 'invoice.update',
      entityType: 'Invoice',
      entityId: invoice._id,
      details: `Invoice ${invoice.invoiceNumber} updated (v${invoice.version})`,
    });

    res.json({
      success: true,
      message: 'Invoice updated',
      invoice: {
        ...invoice.toObject(),
        versions: versionSummary(invoice.versions),
      },
    });
  } catch (error) {
    console.error('[invoice update]', error?.message || error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update invoice' });
  }
};

export const listInvoiceVersions = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).select('versions invoiceNumber version').lean();
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.json({
      success: true,
      currentVersion: invoice.version,
      versions: invoice.versions || [],
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load versions' });
  }
};

export const restoreInvoiceVersion = async (req, res) => {
  try {
    const versionNum = parseInt(req.params.version, 10);
    if (!Number.isFinite(versionNum)) {
      return res.status(400).json({ success: false, message: 'Invalid version' });
    }

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const snap = (invoice.versions || []).find((v) => v.version === versionNum);
    if (!snap) {
      return res.status(404).json({ success: false, message: 'Version not found' });
    }

    pushVersion(invoice, req.user, `Restored version ${versionNum}`);
    invoice.sourceData = snap.sourceData || {};
    invoice.templateSnapshot = snap.templateSnapshot || {};
    invoice.renderedHtml = snap.renderedHtml || '';
    invoice.pdfUrl = snap.pdfUrl || '';
    invoice.pdfPath = snap.pdfPath || '';
    invoice.status = snap.status || 'final';

    const structured = invoice.sourceData?.structured || {};
    for (const key of [
      'customerName', 'customerEmail', 'customerPhone', 'customerAddress', 'customerTaxId',
      'vehicleBrand', 'vehicleModel', 'vehicleYear', 'vehiclePlate', 'vehicleType',
      'subtotal', 'discountAmount', 'taxAmount', 'totalAmount',
      'paymentStatus', 'paymentMethod', 'paymentReference', 'notes', 'currency',
    ]) {
      if (structured[key] !== undefined) invoice[key] = structured[key];
    }
    if (Array.isArray(structured.items)) invoice.items = structured.items;
    if (structured.invoiceDate) invoice.invoiceDate = structured.invoiceDate;
    if (structured.dueDate !== undefined) invoice.dueDate = structured.dueDate;

    markSourceLocked(invoice);
    syncDocumentListFields(invoice, 'invoice');
    invoice.updatedBy = req.user._id;
    await renderAndStorePdf({ type: 'invoice', doc: invoice, owner: req.user });
    await invoice.save();

    await logAudit({
      owner: req.user._id,
      action: 'invoice.restore',
      entityType: 'Invoice',
      entityId: invoice._id,
      details: `Invoice ${invoice.invoiceNumber} restored to v${versionNum}`,
    });

    res.json({
      success: true,
      message: `Restored version ${versionNum}`,
      invoice: {
        ...invoice.toObject(),
        versions: versionSummary(invoice.versions),
      },
    });
  } catch (error) {
    console.error('[invoice restore]', error?.message || error);
    res.status(500).json({ success: false, message: error.message || 'Failed to restore version' });
  }
};

export const previewInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    if (!invoice.renderedHtml) {
      await hydrateLegacyDocument(invoice, { type: 'invoice', owner: req.user });
      const booking = (!invoice.sourceLocked && invoice.booking)
        ? await Booking.findById(invoice.booking).populate('car')
        : null;
      const variables = rebuildVariablesFromStructured(invoice, {
        type: 'invoice',
        owner: req.user,
        booking,
      });
      invoice.sourceData = { ...(invoice.sourceData || {}), variables };
      invoice.renderedHtml = buildDocumentHtml(
        templateFromSnapshot(invoice.templateSnapshot || {}),
        variables,
      );
      await invoice.save();
    }
    res.json({ success: true, html: invoice.renderedHtml });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to preview invoice' });
  }
};

export const downloadInvoicePdf = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid invoice ID' });
    }

    const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.user._id });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    let filePath = resolveExistingPdfPath(invoice);
    if (!filePath) {
      await hydrateLegacyDocument(invoice, { type: 'invoice', owner: req.user });
      await renderAndStorePdf({ type: 'invoice', doc: invoice, owner: req.user });
      await invoice.save();
      filePath = invoice.pdfPath;
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'PDF not available' });
    }

    const safeName = String(invoice.invoiceNumber || 'invoice').replace(/[^\w.-]+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('[invoice pdf]', error?.message || error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to download invoice PDF',
      });
    }
  }
};

export default {
  listInvoices,
  getInvoice,
  generateInvoice,
  createManualInvoice,
  updateInvoice,
  listInvoiceVersions,
  restoreInvoiceVersion,
  previewInvoice,
  downloadInvoicePdf,
};
