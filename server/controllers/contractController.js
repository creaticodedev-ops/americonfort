import mongoose from 'mongoose';
import Contract from '../models/Contract.js';
import Booking from '../models/Booking.js';
import Invoice from '../models/Invoice.js';
import { publicUploadUrl } from '../services/pdfDocuments.js';
import { generateContractPdf, generateDocumentFromTemplate } from '../services/templatePdfExport.js';
import { buildDocumentHtml, buildTemplateVariables } from '../services/templateEngine.js';
import { logAudit } from '../utils/adminOps.js';
import { ensureDefaultTemplates } from './exportTemplateController.js';
import {
  getDefaultInvoiceTemplate,
  resolveContractTemplate,
} from '../utils/resolveExportTemplate.js';

const generateContractNumber = async (ownerId) => {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `CTR-${year}-`;

  const last = await Contract.findOne({
    owner: ownerId,
    contractNumber: { $regex: `^${prefix}` },
  })
    .sort({ contractNumber: -1 })
    .select('contractNumber')
    .lean();

  let seq = 1;
  if (last?.contractNumber) {
    const parts = last.contractNumber.split('-');
    const n = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
};

const createInvoiceForBooking = async ({ owner, booking, user, includeCompanyStamp = true }) => {
  const invoiceNumber = booking.reservationId
    ? `INV-${booking.reservationId.replace(/^RES-/, '')}`
    : `INV-${booking._id.toString().slice(-8).toUpperCase()}`;

  await ensureDefaultTemplates(owner._id || owner);
  const invoiceTemplate = await getDefaultInvoiceTemplate(owner._id || owner);

  if (!invoiceTemplate) {
    throw new Error('No invoice template found. Set a default invoice template in Admin → Export Templates.');
  }

  const invoiceResult = await generateDocumentFromTemplate({
    template: invoiceTemplate,
    booking: booking.toObject ? booking.toObject() : booking,
    owner: owner._id || owner,
    documentTitle: `Invoice ${invoiceNumber}`,
    includeCompanyStamp,
  });

  const invoicePath = invoiceResult.filePath;
  const invoicePdfUrl = invoiceResult.pdfUrl;

  await Invoice.findOneAndUpdate(
    { booking: booking._id, owner: owner._id || owner },
    {
      owner: owner._id || owner,
      booking: booking._id,
      invoiceNumber,
      pdfUrl: invoicePdfUrl || publicUploadUrl(invoicePath),
      pdfPath: invoicePath,
      generatedBy: user?._id || user || null,
      includeCompanyStamp,
      status: 'final',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { invoiceNumber, invoicePath, invoicePdfUrl };
};

export const listContracts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', customerName = '', cin = '', phone = '' } = req.query;
    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pg - 1) * lim;

    const query = { owner: req.user._id };
    const bookingQuery = [];

    if (search?.trim()) {
      const term = search.trim();
      query.$or = [
        { contractNumber: { $regex: term, $options: 'i' } },
      ];
    }

    if (customerName?.trim()) {
      bookingQuery.push({ customerName: { $regex: customerName.trim(), $options: 'i' } });
    }

    if (cin?.trim()) {
      const term = cin.trim();
      bookingQuery.push({
        $or: [
          { identityDocumentNumber: { $regex: term, $options: 'i' } },
          { passportNumber: { $regex: term, $options: 'i' } },
          { driverLicenseNumber: { $regex: term, $options: 'i' } },
        ],
      });
    }

    if (phone?.trim()) {
      bookingQuery.push({ customerPhone: { $regex: phone.trim(), $options: 'i' } });
    }

    let bookingIds = [];
    if (bookingQuery.length) {
      bookingIds = (await Booking.find({ owner: req.user._id, $or: bookingQuery }).select('_id').lean()).map((b) => b._id);
      if (!bookingIds.length) {
        return res.json({ success: true, contracts: [], pagination: { total: 0, page: pg, limit: lim, totalPages: 1 } });
      }
    }

    if (bookingIds.length) {
      query.booking = { $in: bookingIds };
    }

    const [contracts, total] = await Promise.all([
      Contract.find(query)
        .populate({
          path: 'booking',
          select: 'reservationId customerName customerPhone pickupDate returnDate price status car',
          populate: { path: 'car', select: 'brand model year' },
        })
        .populate('template', 'name type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      Contract.countDocuments(query),
    ]);

    res.json({
      success: true,
      contracts,
      pagination: {
        total,
        page: pg,
        limit: lim,
        totalPages: Math.ceil(total / lim) || 1,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load contracts' });
  }
};

export const getContract = async (req, res) => {
  try {
    const contract = await Contract.findOne({
      _id: req.params.id,
      owner: req.user._id,
    })
      .populate({
        path: 'booking',
        populate: { path: 'car' },
      })
      .populate('template')
      .lean();

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    res.json({ success: true, contract });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load contract' });
  }
};

export const generateContract = async (req, res) => {
  try {
    const { bookingId, templateId, includeCompanyStamp = true } = req.body;

    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      owner: req.user._id,
    }).populate('car');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    await ensureDefaultTemplates(req.user._id);

    const template = await resolveContractTemplate(
      req.user._id,
      templateId && mongoose.isValidObjectId(templateId) ? templateId : null,
    );
    if (!template) {
      return res.status(404).json({ success: false, message: 'No contract template found. Create one in Export Templates.' });
    }

    const contractNumber = await generateContractNumber(req.user._id);
    const { filePath, pdfUrl, renderedHtml } = await generateContractPdf({
      template: template.toObject ? template.toObject() : template,
      booking: booking.toObject ? booking.toObject() : booking,
      contractNumber,
      owner: req.user,
      includeCompanyStamp,
    });

    const contract = await Contract.create({
      owner: req.user._id,
      booking: booking._id,
      template: template._id,
      contractNumber,
      renderedHtml,
      pdfUrl,
      pdfPath: filePath,
      generatedBy: req.user._id,
      status: 'final',
    });

    await logAudit({
      owner: req.user._id,
      action: 'contract.generate',
      entityType: 'Contract',
      entityId: contract._id,
      details: `Contract ${contractNumber} generated for ${booking.reservationId}`,
    });

    res.status(201).json({
      success: true,
      message: 'Contract generated successfully',
      contract,
    });
  } catch (error) {
    console.error('Contract generation failed:', error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Contract number conflict, please retry' });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate contract',
    });
  }
};

export const previewContract = async (req, res) => {
  try {
    const contract = await Contract.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).lean();

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    res.json({ success: true, html: contract.renderedHtml });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to preview contract' });
  }
};

export const previewContractFromBooking = async (req, res) => {
  try {
    const { bookingId, templateId, includeCompanyStamp = true } = req.body;

    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      owner: req.user._id,
    }).populate('car').lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    await ensureDefaultTemplates(req.user._id);

    const template = await resolveContractTemplate(
      req.user._id,
      templateId && mongoose.isValidObjectId(templateId) ? templateId : null,
    );

    if (!template) {
      return res.status(404).json({ success: false, message: 'No template found' });
    }

    const contractNumber = 'PREVIEW';
    const variables = buildTemplateVariables(booking, { contractNumber, owner: req.user, template, includeCompanyStamp });
    const html = buildDocumentHtml(template, variables);

    res.json({ success: true, html, variables });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to preview contract' });
  }
};

export const downloadContractPdf = async (req, res) => {
  try {
    const contract = await Contract.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).lean();

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    if (contract.pdfUrl) {
      return res.json({ success: true, pdfUrl: contract.pdfUrl });
    }

    res.status(404).json({ success: false, message: 'PDF not available' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to download contract PDF' });
  }
};

export const listBookingsForContracts = async (req, res) => {
  try {
    const bookings = await Booking.find({
      owner: req.user._id,
      status: { $nin: ['cancelled'] },
    })
      .populate('car', 'brand model year licensePlate')
      .select('reservationId customerName customerPhone pickupDate returnDate price status channel dateOfBirth nationality driverLicenseNumber driverLicenseExpiry passportNumber secondDriver')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json({ success: true, bookings });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load bookings' });
  }
};

export default {
  listContracts,
  getContract,
  generateContract,
  previewContract,
  previewContractFromBooking,
  downloadContractPdf,
  listBookingsForContracts,
};
