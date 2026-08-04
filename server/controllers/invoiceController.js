import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Booking from '../models/Booking.js';
import { publicUploadUrl } from '../services/pdfDocuments.js';
import { generateDocumentFromTemplate } from '../services/templatePdfExport.js';
import { ensureDefaultTemplates } from './exportTemplateController.js';
import { getDefaultInvoiceTemplate } from '../utils/resolveExportTemplate.js';

const buildInvoiceNumber = (booking, provided = '') => {
  const trimmed = String(provided || '').trim();
  if (trimmed) return trimmed.toUpperCase();
  if (booking?.reservationId) return `INV-${booking.reservationId.replace(/^RES-/, '')}`;
  return `INV-${Date.now().toString().slice(-8).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
};

const generateInvoiceDocument = async ({ owner, invoiceNumber, invoiceData, includeCompanyStamp, booking = null }) => {
  await ensureDefaultTemplates(owner._id || owner);
  const invoiceTemplate = await getDefaultInvoiceTemplate(owner._id || owner);

  if (!invoiceTemplate) {
    throw new Error('No invoice template found. Set a default invoice template in Admin → Export Templates.');
  }

  const bookingLike = {
    ...(booking || {}),
    _id: booking?._id || null,
    reservationId: invoiceNumber,
    customerName: invoiceData.customerName || '—',
    customerEmail: invoiceData.customerEmail || '',
    customerPhone: invoiceData.customerPhone || '',
    nationality: invoiceData.customerNationality || '',
    dateOfBirth: invoiceData.customerDob || '',
    pickupDate: invoiceData.invoiceDate || new Date(),
    returnDate: invoiceData.dueDate || invoiceData.invoiceDate || new Date(),
    price: invoiceData.totalAmount || 0,
    paymentStatus: invoiceData.paymentStatus || 'pending',
    notes: invoiceData.notes || '',
    channel: 'manual',
    car: invoiceData.vehicleBrand || invoiceData.vehicleModel || invoiceData.vehiclePlate
      ? {
          brand: invoiceData.vehicleBrand || '',
          model: invoiceData.vehicleModel || '',
          year: invoiceData.vehicleYear || '',
          licensePlate: invoiceData.vehiclePlate || '',
          category: invoiceData.vehicleType || '',
        }
      : undefined,
    priceBreakdown: {
      rentalPrice: invoiceData.subtotal || 0,
      pickupDeliveryFee: 0,
      dropoffDeliveryFee: 0,
      discountTotal: invoiceData.discountAmount || 0,
    },
    customerAddress: invoiceData.customerAddress || '',
  };

  const invoiceResult = await generateDocumentFromTemplate({
    template: invoiceTemplate,
    booking: bookingLike,
    owner: owner._id || owner,
    documentTitle: `Invoice ${invoiceNumber}`,
    includeCompanyStamp,
  });
  return { filePath: invoiceResult.filePath, pdfUrl: invoiceResult.pdfUrl };
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
    const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.user._id }).populate('booking').lean();
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.json({ success: true, invoice });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load invoice' });
  }
};

export const generateInvoice = async (req, res) => {
  try {
    const { bookingId, includeCompanyStamp = true } = req.body;

    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    const booking = await Booking.findOne({ _id: bookingId, owner: req.user._id }).populate('car');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const invoiceNumber = buildInvoiceNumber(booking);
    const { filePath, pdfUrl } = await generateInvoiceDocument({
      owner: req.user,
      invoiceNumber,
      invoiceData: {
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        customerAddress: booking.customerAddress || '',
        customerNationality: booking.nationality || '',
        customerDob: booking.dateOfBirth || '',
        invoiceDate: booking.pickupDate || new Date(),
        dueDate: booking.returnDate || booking.pickupDate || new Date(),
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
      },
      includeCompanyStamp,
      booking,
    });

    const invoice = await Invoice.findOneAndUpdate(
      { booking: booking._id, owner: req.user._id },
      {
        owner: req.user._id,
        booking: booking._id,
        source: 'booking',
        invoiceNumber,
        invoiceDate: new Date(),
        currency: req.body.currency || 'MAD',
        customerName: booking.customerName || '',
        customerEmail: booking.customerEmail || '',
        customerPhone: booking.customerPhone || '',
        customerAddress: booking.customerAddress || '',
        vehicleBrand: booking.car?.brand || '',
        vehicleModel: booking.car?.model || '',
        vehicleYear: booking.car?.year || '',
        vehiclePlate: booking.car?.licensePlate || '',
        subtotal: booking.price || 0,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: booking.price || 0,
        paymentStatus: booking.paymentStatus || 'pending',
        notes: booking.notes || '',
        pdfUrl: pdfUrl || publicUploadUrl(filePath),
        pdfPath: filePath,
        generatedBy: req.user._id,
        includeCompanyStamp,
        status: 'final',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    res.status(201).json({ success: true, message: 'Invoice generated successfully', invoice });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to generate invoice' });
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

    const { filePath, pdfUrl } = await generateInvoiceDocument({
      owner: req.user,
      invoiceNumber: finalInvoiceNumber,
      invoiceData: {
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        customerNationality: '',
        customerDob: '',
        invoiceDate: invoiceDateValue,
        dueDate: dueDateValue,
        subtotal,
        discountAmount: discount,
        taxAmount: computedTaxAmount,
        totalAmount,
        paymentStatus,
        notes: finalNotes,
        vehicleBrand,
        vehicleModel,
        vehicleYear,
        vehiclePlate,
        vehicleType,
      },
      includeCompanyStamp,
    });

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
      pdfUrl: pdfUrl || publicUploadUrl(filePath),
      pdfPath: filePath,
      generatedBy: req.user._id,
      includeCompanyStamp,
      status: 'final',
    });

    res.status(201).json({ success: true, message: 'Manual invoice created successfully', invoice });
  } catch (error) {
    console.error(error.message);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Invoice number already exists, please choose another one' });
    }
    res.status(500).json({ success: false, message: 'Failed to create manual invoice' });
  }
};

export const downloadInvoicePdf = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.user._id }).lean();
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.pdfUrl) {
      return res.json({ success: true, pdfUrl: invoice.pdfUrl });
    }

    res.status(404).json({ success: false, message: 'PDF not available' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to download invoice PDF' });
  }
};

export default {
  listInvoices,
  getInvoice,
  generateInvoice,
  createManualInvoice,
  downloadInvoicePdf,
};
