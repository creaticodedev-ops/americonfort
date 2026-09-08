import fs from 'fs';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Booking from '../models/Booking.js';
import Contract from '../models/Contract.js';
import { publicUploadUrl } from '../services/pdfDocuments.js';
import { generateDocumentFromTemplate } from '../services/templatePdfExport.js';
import { buildDocumentHtml } from '../services/templateEngine.js';
import { ensureDefaultTemplates } from './exportTemplateController.js';
import { getDefaultInvoiceTemplate } from '../utils/resolveExportTemplate.js';
import { logAudit } from '../utils/adminOps.js';
import { streamPdfFile } from '../utils/streamPdfFile.js';
import {
  normalizeInvoiceNumber,
  invoiceNumberValidationMessage,
  suggestNextInvoiceNumber as suggestNextNumber,
} from '../utils/invoiceNumber.js';
import { normalizeInvoiceItems } from '../services/templateEngine.js';
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

import {
  resolveBookingIdsForDocumentFilters,
  applyCreatedAtRange,
  escapeRegex,
} from '../utils/documentListQuery.js';

const tryRemoveLocalPdf = (invoice) => {
  const filePath = invoice?.pdfPath;
  if (!filePath || !fs.existsSync(filePath)) return;
  try {
    fs.unlinkSync(filePath);
  } catch {
    /* best-effort cleanup */
  }
};

const assertUniqueInvoiceNumber = async (ownerId, invoiceNumber, excludeId = null) => {
  const query = { owner: ownerId, invoiceNumber };
  if (excludeId) query._id = { $ne: excludeId };
  const clash = await Invoice.findOne(query).select('_id invoiceNumber');
  if (clash) {
    const err = new Error('Invoice number already exists. Choose another XXX/YYYY number.');
    err.status = 409;
    err.code = 'INVOICE_NUMBER_TAKEN';
    throw err;
  }
};

const resolveManualInvoiceNumber = async (ownerId, raw, { excludeId = null } = {}) => {
  const formatError = invoiceNumberValidationMessage(raw);
  if (formatError) {
    const err = new Error(formatError);
    err.status = 400;
    err.code = 'INVALID_INVOICE_NUMBER';
    throw err;
  }
  const invoiceNumber = normalizeInvoiceNumber(raw);
  await assertUniqueInvoiceNumber(ownerId, invoiceNumber, excludeId);
  return invoiceNumber;
};

const daysBetween = (start, end) => {
  if (!start || !end) return null;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null;
  return Math.max(1, Math.ceil((b - a) / (24 * 60 * 60 * 1000)));
};

const buildDraftFromBooking = async (ownerId, booking) => {
  const bookingObj = booking?.toObject ? booking.toObject() : booking;
  const contract = await Contract.findOne({ owner: ownerId, booking: bookingObj._id })
    .select('contractNumber')
    .lean();
  const existing = await Invoice.findOne({ owner: ownerId, booking: bookingObj._id })
    .select('_id invoiceNumber sourceLocked dueDate invoiceDate')
    .lean();

  const existingNumbers = await Invoice.find({ owner: ownerId }).select('invoiceNumber').lean();
  const suggestedInvoiceNumber = suggestNextNumber(
    existingNumbers.map((row) => row.invoiceNumber),
    new Date().getFullYear(),
  );

  const totalAmount = Number(bookingObj.price || 0) || 0;
  const amountPaid = Number(
    bookingObj.paymentStatus === 'paid'
      ? totalAmount
      : (bookingObj.completion?.amountPaid || 0),
  ) || 0;
  const rentalDays = bookingObj.priceBreakdown?.days
    || daysBetween(bookingObj.pickupDate, bookingObj.returnDate)
    || 1;
  const pricePerDay = bookingObj.priceBreakdown?.pricePerDay
    ?? bookingObj.car?.pricePerDay
    ?? (rentalDays ? totalAmount / rentalDays : totalAmount);

  const invoiceDate = new Date();
  const dueDate = bookingObj.returnDate
    ? new Date(bookingObj.returnDate)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return {
    suggestedInvoiceNumber,
    existingInvoice: existing
      ? {
          _id: existing._id,
          invoiceNumber: existing.invoiceNumber,
          sourceLocked: Boolean(existing.sourceLocked),
        }
      : null,
    draft: {
      invoiceNumber: existing?.invoiceNumber || '',
      invoiceDate: (existing?.invoiceDate || invoiceDate).toISOString(),
      dueDate: (existing?.dueDate || dueDate).toISOString(),
      reservationId: bookingObj.reservationId || '',
      contractNumber: contract?.contractNumber || '',
      customerName: bookingObj.customerName || '',
      customerEmail: bookingObj.customerEmail || '',
      customerPhone: bookingObj.customerPhone || '',
      customerAddress: bookingObj.customerAddress || '',
      customerTaxId: '',
      currency: 'MAD',
      vehicleBrand: bookingObj.car?.brand || '',
      vehicleModel: bookingObj.car?.model || '',
      vehicleYear: bookingObj.car?.year != null ? String(bookingObj.car.year) : '',
      vehiclePlate: bookingObj.car?.licensePlate || '',
      vehicleType: bookingObj.car?.category || '',
      pickupDate: bookingObj.pickupDate || null,
      returnDate: bookingObj.returnDate || null,
      pickupLocation: bookingObj.pickupLocation || '',
      returnLocation: bookingObj.returnLocation || '',
      rentalDays,
      pricePerDay,
      pickupFee: Number(bookingObj.priceBreakdown?.pickupDeliveryFee || 0) || 0,
      dropoffFee: Number(bookingObj.priceBreakdown?.dropoffDeliveryFee || 0) || 0,
      subtotal: Number(bookingObj.priceBreakdown?.rentalPrice ?? totalAmount) || 0,
      discountAmount: Number(bookingObj.priceBreakdown?.discountTotal || 0) || 0,
      taxAmount: Number(bookingObj.priceBreakdown?.taxTotal || 0) || 0,
      totalAmount,
      amountPaid,
      balanceDue: Math.max(0, totalAmount - amountPaid),
      paymentStatus: bookingObj.paymentStatus || 'pending',
      paymentMethod: 'cash',
      paymentReference: '',
      notes: bookingObj.notes || '',
      items: [{
        description: `Location ${bookingObj.car?.brand || ''} ${bookingObj.car?.model || ''}`.trim() || 'Location véhicule',
        quantity: rentalDays || 1,
        unitPrice: Number(pricePerDay) || totalAmount,
        taxRate: 0,
      }],
      includeCompanyStamp: true,
    },
  };
};

const normalizeInvoicePayload = (body = {}, { booking = null } = {}) => {
  const items = normalizeInvoiceItems(body.items);

  const subtotal = items.length
    ? items.reduce((sum, item) => sum + item.lineTotal, 0)
    : Number(body.subtotal ?? booking?.price ?? 0) || 0;
  const taxAmount = Number(
    body.taxAmount
    ?? items.reduce((sum, item) => sum + (item.lineTotal * (item.taxRate || 0) / 100), 0),
  ) || 0;
  const discountAmount = Number(body.discountAmount || 0) || 0;
  const totalAmount = Math.max(
    0,
    Number(body.totalAmount != null ? body.totalAmount : (subtotal + taxAmount - discountAmount)) || 0,
  );
  const amountPaid = Number(body.amountPaid || 0) || 0;

  const invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : new Date();
  const dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (Number.isNaN(invoiceDate.getTime())) {
    const err = new Error('Invalid invoice date');
    err.status = 400;
    throw err;
  }
  if (body.dueDate && Number.isNaN(dueDate.getTime())) {
    const err = new Error('Invalid due date');
    err.status = 400;
    throw err;
  }

  const pickupDate = body.pickupDate
    ? new Date(body.pickupDate)
    : (booking?.pickupDate ? new Date(booking.pickupDate) : null);
  const returnDate = body.returnDate
    ? new Date(body.returnDate)
    : (booking?.returnDate ? new Date(booking.returnDate) : null);

  return {
    customerName: String(body.customerName || booking?.customerName || '').trim(),
    customerEmail: String(body.customerEmail || booking?.customerEmail || '').trim(),
    customerPhone: String(body.customerPhone || booking?.customerPhone || '').trim(),
    customerAddress: String(body.customerAddress || booking?.customerAddress || '').trim(),
    customerTaxId: String(body.customerTaxId || '').trim(),
    customerNationality: String(body.customerNationality || booking?.nationality || '').trim(),
    customerDob: body.customerDob || booking?.dateOfBirth || '',
    invoiceDate,
    dueDate,
    currency: String(body.currency || 'MAD').trim() || 'MAD',
    reservationId: String(body.reservationId || booking?.reservationId || '').trim(),
    contractNumber: String(body.contractNumber || '').trim(),
    vehicleBrand: String(body.vehicleBrand || booking?.car?.brand || '').trim(),
    vehicleModel: String(body.vehicleModel || booking?.car?.model || '').trim(),
    vehicleYear: body.vehicleYear != null && body.vehicleYear !== ''
      ? String(body.vehicleYear)
      : (booking?.car?.year != null ? String(booking.car.year) : ''),
    vehiclePlate: String(body.vehiclePlate || booking?.car?.licensePlate || '').trim(),
    vehicleType: String(body.vehicleType || booking?.car?.category || '').trim(),
    pickupDate: pickupDate && !Number.isNaN(pickupDate.getTime()) ? pickupDate : null,
    returnDate: returnDate && !Number.isNaN(returnDate.getTime()) ? returnDate : null,
    pickupLocation: String(body.pickupLocation || booking?.pickupLocation || '').trim(),
    returnLocation: String(body.returnLocation || booking?.returnLocation || '').trim(),
    rentalDays: body.rentalDays != null && body.rentalDays !== ''
      ? Number(body.rentalDays)
      : (booking?.priceBreakdown?.days || daysBetween(pickupDate, returnDate) || null),
    pricePerDay: body.pricePerDay != null ? Number(body.pricePerDay) : (booking?.priceBreakdown?.pricePerDay ?? null),
    pickupFee: Number(body.pickupFee ?? booking?.priceBreakdown?.pickupDeliveryFee ?? 0) || 0,
    dropoffFee: Number(body.dropoffFee ?? booking?.priceBreakdown?.dropoffDeliveryFee ?? 0) || 0,
    items: items.length ? items.map(({ description, quantity, unitPrice, taxRate }) => ({
      description,
      quantity,
      unitPrice,
      taxRate,
    })) : [{
      description: `Location ${booking?.car?.brand || ''} ${booking?.car?.model || ''}`.trim() || 'Location véhicule',
      quantity: 1,
      unitPrice: totalAmount,
      taxRate: 0,
    }],
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount,
    amountPaid,
    paymentStatus: String(body.paymentStatus || booking?.paymentStatus || 'pending'),
    paymentMethod: String(body.paymentMethod || 'cash'),
    paymentReference: String(body.paymentReference || ''),
    notes: String(body.notes || '').trim(),
  };
};

const validateInvoiceBusinessData = (invoiceData) => {
  if (!invoiceData.customerName) {
    const err = new Error('Customer name is required');
    err.status = 400;
    throw err;
  }
  if (!invoiceData.invoiceDate) {
    const err = new Error('Invoice date is required');
    err.status = 400;
    throw err;
  }
  if (!invoiceData.dueDate) {
    const err = new Error('Due date is required');
    err.status = 400;
    throw err;
  }
  if (!(Number(invoiceData.totalAmount) >= 0)) {
    const err = new Error('Invoice total is invalid');
    err.status = 400;
    throw err;
  }
  if (!Array.isArray(invoiceData.items) || !invoiceData.items.length) {
    const err = new Error('At least one invoice item is required');
    err.status = 400;
    throw err;
  }
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
      contractNumber: invoiceData.contractNumber || '',
      customerName: invoiceData.customerName,
      customerEmail: invoiceData.customerEmail,
      customerPhone: invoiceData.customerPhone,
      customerAddress: invoiceData.customerAddress,
      customerTaxId: invoiceData.customerTaxId,
      vehicleBrand: invoiceData.vehicleBrand,
      vehicleModel: invoiceData.vehicleModel,
      vehicleYear: invoiceData.vehicleYear,
      vehiclePlate: invoiceData.vehiclePlate,
      vehicleType: invoiceData.vehicleType,
      invoiceDate: invoiceData.invoiceDate,
      dueDate: invoiceData.dueDate,
      currency: invoiceData.currency,
      subtotal: invoiceData.subtotal,
      discountAmount: invoiceData.discountAmount,
      taxAmount: invoiceData.taxAmount,
      totalAmount: invoiceData.totalAmount,
      amountPaid: invoiceData.amountPaid,
      paymentStatus: invoiceData.paymentStatus,
      paymentMethod: invoiceData.paymentMethod,
      paymentReference: invoiceData.paymentReference,
      notes: invoiceData.notes,
      items: invoiceData.items,
      source: booking ? 'booking' : 'manual',
      sourceData: {
        structured: {
          reservationId: invoiceData.reservationId || booking?.reservationId || '',
          contractNumber: invoiceData.contractNumber || '',
          pickupDate: invoiceData.pickupDate,
          returnDate: invoiceData.returnDate,
          pickupLocation: invoiceData.pickupLocation,
          returnLocation: invoiceData.returnLocation,
          rentalDays: invoiceData.rentalDays,
          pricePerDay: invoiceData.pricePerDay,
          amountPaid: invoiceData.amountPaid,
        },
      },
    },
    booking?.toObject ? booking.toObject() : booking,
  );

  const invoiceResult = await generateDocumentFromTemplate({
    template: invoiceTemplate.toObject ? invoiceTemplate.toObject() : invoiceTemplate,
    booking: bookingLike,
    owner: owner._id || owner,
    documentTitle: `Facture ${invoiceNumber}`,
    includeCompanyStamp,
    invoiceNumber,
    invoiceDate: invoiceData.invoiceDate,
    dueDate: invoiceData.dueDate,
    contractNumber: invoiceData.contractNumber || '',
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
    const {
      page = 1,
      limit = 20,
      search = '',
      customerName = '',
      cin = '',
      phone = '',
      invoiceNumber = '',
      plate = '',
      vehicleModel = '',
      vehicleId = '',
      pickupFrom = '',
      pickupTo = '',
      returnFrom = '',
      returnTo = '',
      createdFrom = '',
      createdTo = '',
      status = '',
      paymentStatus = '',
      source = '',
      signatureStatus = '',
    } = req.query;
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pg - 1) * lim;

    const query = { owner: req.user._id };
    const and = [];

    if (search?.trim()) {
      const term = escapeRegex(search.trim());
      and.push({
        $or: [
          { invoiceNumber: { $regex: term, $options: 'i' } },
          { customerName: { $regex: term, $options: 'i' } },
          { customerEmail: { $regex: term, $options: 'i' } },
          { customerPhone: { $regex: term, $options: 'i' } },
          { customerTaxId: { $regex: term, $options: 'i' } },
          { vehiclePlate: { $regex: term, $options: 'i' } },
          { vehicleBrand: { $regex: term, $options: 'i' } },
          { vehicleModel: { $regex: term, $options: 'i' } },
        ],
      });
    }

    if (customerName?.trim()) {
      and.push({ customerName: { $regex: escapeRegex(customerName.trim()), $options: 'i' } });
    }

    if (phone?.trim()) {
      and.push({ customerPhone: { $regex: escapeRegex(phone.trim()), $options: 'i' } });
    }

    if (cin?.trim()) {
      and.push({ customerTaxId: { $regex: escapeRegex(cin.trim()), $options: 'i' } });
    }

    if (invoiceNumber?.trim()) {
      and.push({ invoiceNumber: { $regex: escapeRegex(invoiceNumber.trim()), $options: 'i' } });
    }

    if (status === 'draft' || status === 'final') {
      and.push({ status });
    }

    if (paymentStatus?.trim()) {
      and.push({ paymentStatus: paymentStatus.trim() });
    }

    if (source === 'manual' || source === 'booking') {
      and.push({ source });
    }

    if (plate?.trim()) {
      and.push({ vehiclePlate: { $regex: escapeRegex(plate.trim()), $options: 'i' } });
    }

    if (vehicleModel?.trim()) {
      const term = escapeRegex(vehicleModel.trim());
      and.push({
        $or: [
          { vehicleBrand: { $regex: term, $options: 'i' } },
          { vehicleModel: { $regex: term, $options: 'i' } },
        ],
      });
    }

    applyCreatedAtRange(query, createdFrom, createdTo);

    const bookingSideIds = await resolveBookingIdsForDocumentFilters(req.user._id, {
      vehicleId,
      pickupFrom,
      pickupTo,
      returnFrom,
      returnTo,
      signatureStatus,
    });

    if (bookingSideIds) {
      if (!bookingSideIds.length) {
        return res.json({
          success: true,
          invoices: [],
          pagination: { total: 0, page: pg, limit: lim, totalPages: 1 },
        });
      }
      and.push({ booking: { $in: bookingSideIds } });
    }

    if (and.length) query.$and = and;

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .select('-renderedHtml -versions.sourceData -versions.renderedHtml -versions.templateSnapshot')
        .populate({
          path: 'booking',
          select: 'reservationId customerName customerPhone pickupDate returnDate price status car completion.signatureComplete completion.signatureRequestStatus',
          populate: { path: 'car', select: 'brand model year licensePlate' },
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

export const getInvoiceDraftFromBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }
    const booking = await Booking.findOne({ _id: bookingId, owner: req.user._id }).populate('car');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    const payload = await buildDraftFromBooking(req.user._id, booking);
    res.json({ success: true, ...payload });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load invoice draft' });
  }
};

export const suggestInvoiceNumber = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const rows = await Invoice.find({ owner: req.user._id }).select('invoiceNumber').lean();
    const suggested = suggestNextNumber(rows.map((row) => row.invoiceNumber), year);
    res.json({ success: true, suggestedInvoiceNumber: suggested });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to suggest invoice number' });
  }
};

export const generateInvoice = async (req, res) => {
  try {
    const {
      bookingId,
      includeCompanyStamp = true,
      forceFromBooking = false,
      invoiceNumber: rawInvoiceNumber,
    } = req.body;

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

    const existing = await Invoice.findOne({ booking: booking._id, owner: req.user._id });
    const invoiceNumber = await resolveManualInvoiceNumber(
      req.user._id,
      rawInvoiceNumber || existing?.invoiceNumber,
      { excludeId: existing?._id || null },
    );

    const contract = await Contract.findOne({ owner: req.user._id, booking: booking._id })
      .select('contractNumber')
      .lean();

    const invoiceData = normalizeInvoicePayload(
      {
        ...req.body,
        contractNumber: req.body.contractNumber || contract?.contractNumber || '',
        reservationId: req.body.reservationId || booking.reservationId || '',
      },
      { booking },
    );
    validateInvoiceBusinessData(invoiceData);

    const { filePath, pdfUrl, renderedHtml, variables, template } = await generateInvoiceDocument({
      owner: req.user,
      invoiceNumber,
      invoiceData,
      includeCompanyStamp,
      booking,
    });

    const sourceData = await buildInvoiceSourceData({
      owner: req.user,
      template,
      invoiceNumber,
      invoiceData,
      booking,
      includeCompanyStamp,
    });
    // Keep full template variables from PDF generation (includes amount in words, dates, refs).
    sourceData.variables = { ...(sourceData.variables || {}), ...(variables || {}) };
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
        customerTaxId: invoiceData.customerTaxId || '',
        vehicleBrand: invoiceData.vehicleBrand || '',
        vehicleModel: invoiceData.vehicleModel || '',
        vehicleYear: invoiceData.vehicleYear || '',
        vehiclePlate: invoiceData.vehiclePlate || '',
        vehicleType: invoiceData.vehicleType || '',
        items: invoiceData.items,
        subtotal: invoiceData.subtotal,
        discountAmount: invoiceData.discountAmount,
        taxAmount: invoiceData.taxAmount,
        totalAmount: invoiceData.totalAmount,
        paymentStatus: invoiceData.paymentStatus || 'pending',
        paymentMethod: invoiceData.paymentMethod || 'cash',
        paymentReference: invoiceData.paymentReference || '',
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
        customerTaxId: invoiceData.customerTaxId || '',
        vehicleBrand: invoiceData.vehicleBrand || '',
        vehicleModel: invoiceData.vehicleModel || '',
        vehicleYear: invoiceData.vehicleYear || '',
        vehiclePlate: invoiceData.vehiclePlate || '',
        vehicleType: invoiceData.vehicleType || '',
        items: invoiceData.items,
        subtotal: invoiceData.subtotal,
        discountAmount: invoiceData.discountAmount,
        taxAmount: invoiceData.taxAmount,
        totalAmount: invoiceData.totalAmount,
        paymentStatus: invoiceData.paymentStatus || 'pending',
        paymentMethod: invoiceData.paymentMethod || 'cash',
        paymentReference: invoiceData.paymentReference || '',
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
      details: `Invoice ${invoiceNumber} generated for booking ${booking.reservationId || booking._id}`,
    });

    res.status(201).json({ success: true, message: 'Invoice generated successfully', invoice });
  } catch (error) {
    console.error(error.message);
    const status = error.status || (error.code === 11000 ? 409 : 500);
    res.status(status).json({
      success: false,
      code: error.code || undefined,
      message: error.message || 'Failed to generate invoice',
    });
  }
};

export const createManualInvoice = async (req, res) => {
  try {
    const { includeCompanyStamp = true } = req.body;
    const invoiceNumber = await resolveManualInvoiceNumber(req.user._id, req.body.invoiceNumber);
    const invoiceData = normalizeInvoicePayload(req.body);
    validateInvoiceBusinessData(invoiceData);

    const { filePath, pdfUrl, renderedHtml, variables, template } = await generateInvoiceDocument({
      owner: req.user,
      invoiceNumber,
      invoiceData,
      includeCompanyStamp,
    });

    const sourceData = await buildInvoiceSourceData({
      owner: req.user,
      template,
      invoiceNumber,
      invoiceData,
      includeCompanyStamp,
    });
    sourceData.variables = { ...(sourceData.variables || {}), ...(variables || {}) };

    const invoice = await Invoice.create({
      owner: req.user._id,
      booking: null,
      source: 'manual',
      invoiceNumber,
      invoiceDate: invoiceData.invoiceDate,
      dueDate: invoiceData.dueDate,
      currency: invoiceData.currency,
      customerName: invoiceData.customerName,
      customerEmail: invoiceData.customerEmail,
      customerPhone: invoiceData.customerPhone,
      customerAddress: invoiceData.customerAddress,
      customerTaxId: invoiceData.customerTaxId,
      vehicleBrand: invoiceData.vehicleBrand,
      vehicleModel: invoiceData.vehicleModel,
      vehicleYear: invoiceData.vehicleYear,
      vehiclePlate: invoiceData.vehiclePlate,
      vehicleType: invoiceData.vehicleType,
      items: invoiceData.items,
      subtotal: invoiceData.subtotal,
      discountAmount: invoiceData.discountAmount,
      taxAmount: invoiceData.taxAmount,
      totalAmount: invoiceData.totalAmount,
      paymentStatus: invoiceData.paymentStatus,
      paymentMethod: invoiceData.paymentMethod,
      paymentReference: invoiceData.paymentReference,
      notes: invoiceData.notes,
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
      details: `Manual invoice ${invoiceNumber} created`,
    });

    res.status(201).json({ success: true, message: 'Manual invoice created successfully', invoice });
  } catch (error) {
    console.error(error.message);
    const status = error.status || (error.code === 11000 ? 409 : 500);
    res.status(status).json({
      success: false,
      code: error.code || undefined,
      message: error.code === 11000
        ? 'Invoice number already exists, please choose another one'
        : (error.message || 'Failed to create manual invoice'),
    });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid invoice ID' });
    }

    const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.user._id });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invoiceNumber = invoice.invoiceNumber;
    tryRemoveLocalPdf(invoice);
    await Invoice.deleteOne({ _id: invoice._id, owner: req.user._id });

    await logAudit({
      owner: req.user._id,
      actor: req.user._id,
      action: 'invoice.delete',
      entityType: 'Invoice',
      entityId: invoice._id,
      details: `Invoice ${invoiceNumber} deleted`,
    });

    res.json({ success: true, message: 'Invoice deleted' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to delete invoice' });
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

    if (req.body.invoiceNumber != null && String(req.body.invoiceNumber).trim()) {
      const nextNumber = await resolveManualInvoiceNumber(
        req.user._id,
        req.body.invoiceNumber,
        { excludeId: invoice._id },
      );
      req.body.invoiceNumber = nextNumber;
    }

    pushVersion(invoice, req.user, req.body.note || 'Updated');

    applyInvoiceStructuredEdits(invoice, req.body);
    if (req.body.sections) {
      applySectionEdits(invoice, req.body.sections);
    }

    markSourceLocked(invoice);

    const variables = await rebuildVariablesFromStructured(invoice, {
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
    res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to update invoice' });
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
      const variables = await rebuildVariablesFromStructured(invoice, {
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
      try {
        await renderAndStorePdf({ type: 'invoice', doc: invoice, owner: req.user });
      } catch (renderError) {
        console.error('[invoice pdf] render failed:', renderError?.message || renderError);
        return res.status(500).json({
          success: false,
          message: renderError?.message || 'Failed to generate invoice PDF',
        });
      }
      try {
        await invoice.save();
      } catch (saveError) {
        console.error('[invoice pdf] save after render failed:', saveError?.message || saveError);
      }
      filePath = invoice.pdfPath;
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'PDF not available' });
    }

    return streamPdfFile(res, filePath, `${invoice.invoiceNumber || 'invoice'}.pdf`);
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

export const getInvoiceShareLink = async (req, res) => {
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
      try {
        await renderAndStorePdf({ type: 'invoice', doc: invoice, owner: req.user });
        await invoice.save();
      } catch (renderError) {
        console.error('[invoice share] render failed:', renderError?.message || renderError);
        return res.status(500).json({
          success: false,
          message: renderError?.message || 'Failed to prepare invoice PDF for sharing',
        });
      }
      filePath = invoice.pdfPath;
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'PDF not available' });
    }

    const shareUrl = invoice.pdfUrl || publicUploadUrl(filePath);
    if (!shareUrl) {
      return res.status(404).json({ success: false, message: 'Share link not available' });
    }

    return res.json({
      success: true,
      shareUrl,
      invoiceNumber: invoice.invoiceNumber || '',
    });
  } catch (error) {
    console.error('[invoice share]', error?.message || error);
    return res.status(500).json({ success: false, message: 'Failed to prepare share link' });
  }
};

export default {
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
};
