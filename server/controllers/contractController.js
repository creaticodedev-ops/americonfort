import fs from 'fs';
import mongoose from 'mongoose';
import Contract from '../models/Contract.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { generateContractPdf } from '../services/templatePdfExport.js';
import { buildDocumentHtml, buildTemplateVariables, buildTemplateVariablesAsync } from '../services/templateEngine.js';
import { resolveIncludeCompanyStamp } from '../services/documentSettings.js';
import { logAudit } from '../utils/adminOps.js';
import { ensureDefaultTemplates } from './exportTemplateController.js';
import { resolveContractTemplate } from '../utils/resolveExportTemplate.js';
import { streamPdfFile } from '../utils/streamPdfFile.js';
import { nextContractNumber } from '../services/contractNumberService.js';
import {
  snapshotTemplate,
  buildContractSourceData,
  pushVersion,
  applySectionEdits,
  applyContractStructuredEdits,
  rebuildVariablesFromStructured,
  renderAndStorePdf,
  hydrateLegacyDocument,
  markSourceLocked,
  syncDocumentListFields,
  resolveExistingPdfPath,
  versionSummary,
  templateFromSnapshot,
} from '../services/documentInstanceService.js';

const syncBookingCompletionPdfUrl = async (contract) => {
  if (!contract?.booking || !contract.pdfUrl) return;
  await Booking.findByIdAndUpdate(contract.booking, {
    $set: { 'completion.contractPdfUrl': contract.pdfUrl },
  });
};

const generateContractNumber = async (ownerId) => nextContractNumber(ownerId);

/** Upsert a Contract instance from a booking (admin generate + completion). */
export const upsertContractFromBooking = async ({
  owner,
  booking,
  user,
  template,
  includeCompanyStamp = true,
  contractNumber: providedNumber,
  note = 'Generated',
  /** Explicit regenerate from booking/template — required to overwrite locked edits */
  forceFromBooking = false,
}) => {
  const ownerId = owner._id || owner;
  const bookingObj = booking.toObject ? booking.toObject() : booking;
  const templateObj = template.toObject ? template.toObject() : template;
  const templateSnap = snapshotTemplate(templateObj);

  const existing = await Contract.findOne({ owner: ownerId, booking: booking._id });

  // Preserve manual edits unless caller explicitly forces regenerate from booking
  if (existing?.sourceLocked && !forceFromBooking) {
    return existing;
  }

  // Prefer existing number so completion/admin regenerations never create duplicates or renumber
  let contractNumber = existing?.contractNumber || providedNumber;
  if (!contractNumber) {
    contractNumber = await generateContractNumber(ownerId);
  }

  const { filePath, pdfUrl, renderedHtml, variables } = await generateContractPdf({
    template: templateObj,
    booking: bookingObj,
    contractNumber,
    owner,
    includeCompanyStamp,
  });

  const sourceData = await buildContractSourceData(bookingObj, {
    contractNumber,
    owner,
    template: templateObj,
    includeCompanyStamp,
  });
  // Prefer variables returned from PDF gen (same stamp/signature embeds)
  sourceData.variables = variables || sourceData.variables;

  if (existing) {
    pushVersion(existing, user, note);
    existing.template = template._id || template;
    existing.templateSnapshot = templateSnap;
    existing.sourceData = sourceData;
    existing.renderedHtml = renderedHtml;
    existing.pdfUrl = pdfUrl;
    existing.pdfPath = filePath;
    existing.includeCompanyStamp = Boolean(includeCompanyStamp);
    existing.sourceLocked = false;
    existing.manuallyEditedAt = null;
    existing.customerName = bookingObj.customerName || '';
    existing.customerPhone = bookingObj.customerPhone || '';
    existing.customerEmail = bookingObj.customerEmail || '';
    existing.reservationId = bookingObj.reservationId || '';
    existing.vehicleSummary = [bookingObj.car?.brand, bookingObj.car?.model].filter(Boolean).join(' ');
    existing.totalAmount = bookingObj.price ?? null;
    existing.updatedBy = user?._id || user || null;
    existing.generatedBy = existing.generatedBy || user?._id || user || null;
    existing.createdBy = existing.createdBy || existing.generatedBy;
    existing.lastGeneratedAt = new Date();
    existing.status = 'final';
    syncDocumentListFields(existing, 'contract');
    await existing.save();
    return existing;
  }

  const contract = await Contract.create({
    owner: ownerId,
    booking: booking._id,
    template: template._id || template,
    contractNumber,
    templateSnapshot: templateSnap,
    sourceData,
    renderedHtml,
    pdfUrl,
    pdfPath: filePath,
    includeCompanyStamp: Boolean(includeCompanyStamp),
    sourceLocked: false,
    customerName: bookingObj.customerName || '',
    customerPhone: bookingObj.customerPhone || '',
    customerEmail: bookingObj.customerEmail || '',
    reservationId: bookingObj.reservationId || '',
    vehicleSummary: [bookingObj.car?.brand, bookingObj.car?.model].filter(Boolean).join(' '),
    totalAmount: bookingObj.price ?? null,
    generatedBy: user?._id || user || null,
    createdBy: user?._id || user || null,
    updatedBy: user?._id || user || null,
    version: 1,
    versions: [],
    lastGeneratedAt: new Date(),
    status: 'final',
  });
  return contract;
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
        { customerName: { $regex: term, $options: 'i' } },
        { customerPhone: { $regex: term, $options: 'i' } },
        { customerEmail: { $regex: term, $options: 'i' } },
      ];
    }

    if (customerName?.trim()) {
      query.customerName = { $regex: customerName.trim(), $options: 'i' };
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
      query.customerPhone = { $regex: phone.trim(), $options: 'i' };
    }

    let bookingIds = [];
    if (bookingQuery.length) {
      bookingIds = (await Booking.find({ owner: req.user._id, $or: bookingQuery }).select('_id').lean()).map((b) => b._id);
      if (!bookingIds.length) {
        return res.json({ success: true, contracts: [], pagination: { total: 0, page: pg, limit: lim, totalPages: 1 } });
      }
      query.booking = { $in: bookingIds };
    }

    const [contracts, total] = await Promise.all([
      Contract.find(query)
        .select('-renderedHtml -versions.sourceData -versions.renderedHtml -versions.templateSnapshot')
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
    }).populate('template', 'name type');

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    await hydrateLegacyDocument(contract, { type: 'contract', owner: req.user });
    if (contract.isModified()) {
      await contract.save();
    }

    await contract.populate({
      path: 'booking',
      populate: { path: 'car' },
    });

    // Return version metadata only in detail payload (full snapshots via /versions)
    const payload = contract.toObject();
    res.json({
      success: true,
      contract: {
        ...payload,
        versions: versionSummary(payload.versions),
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load contract' });
  }
};

export const generateContract = async (req, res) => {
  try {
    const { bookingId, templateId, forceFromBooking = false } = req.body;

    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    const ownerUser = await User.findById(req.user._id).select('documentSettings agencyName email');
    const includeCompanyStamp = resolveIncludeCompanyStamp({
      bodyValue: req.body?.includeCompanyStamp,
      owner: ownerUser || req.user,
      documentType: 'contracts',
    });

    const booking = await Booking.findOne({
      _id: bookingId,
      owner: req.user._id,
    }).populate('car');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const existing = await Contract.findOne({ owner: req.user._id, booking: bookingId }).select('_id contractNumber sourceLocked');
    if (existing?.sourceLocked && !forceFromBooking) {
      return res.status(409).json({
        success: false,
        code: 'SOURCE_LOCKED',
        message: 'This contract has manual edits. Confirm regenerate from booking to replace them.',
        contractId: existing._id,
        contractNumber: existing.contractNumber,
      });
    }

    await ensureDefaultTemplates(req.user._id);

    const template = await resolveContractTemplate(
      req.user._id,
      templateId && mongoose.isValidObjectId(templateId) ? templateId : null,
    );
    if (!template) {
      return res.status(404).json({ success: false, message: 'No contract template found. Create one in Export Templates.' });
    }

    const contract = await upsertContractFromBooking({
      owner: ownerUser || req.user,
      booking,
      user: req.user,
      template,
      includeCompanyStamp,
      note: forceFromBooking ? 'Regenerated from booking (replaced manual edits)' : 'Generated from booking',
      forceFromBooking: Boolean(forceFromBooking) || !existing,
    });

    await syncBookingCompletionPdfUrl(contract);

    await logAudit({
      owner: req.user._id,
      action: 'contract.generate',
      entityType: 'Contract',
      entityId: contract._id,
      details: `Contract ${contract.contractNumber} generated for ${booking.reservationId}`,
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

export const updateContract = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid contract ID' });
    }

    const contract = await Contract.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    await hydrateLegacyDocument(contract, { type: 'contract', owner: req.user });

    const regeneratePdf = req.body.regeneratePdf !== false;
    pushVersion(contract, req.user, req.body.note || 'Updated');

    applyContractStructuredEdits(contract, req.body);
    if (req.body.sections) {
      applySectionEdits(contract, req.body.sections);
    }

    // Edits become the permanent source of truth for this instance
    markSourceLocked(contract);

    // Rebuild from structured only (booking ignored while locked)
    const variables = await rebuildVariablesFromStructured(contract, {
      type: 'contract',
      owner: req.user,
      booking: null,
    });
    contract.sourceData = {
      ...(contract.sourceData || {}),
      variables,
    };

    const snap = templateFromSnapshot(contract.templateSnapshot || {});
    contract.renderedHtml = buildDocumentHtml(snap, variables);
    contract.updatedBy = req.user._id;
    syncDocumentListFields(contract, 'contract');

    if (regeneratePdf) {
      await renderAndStorePdf({
        type: 'contract',
        doc: contract,
        owner: req.user,
      });
    }

    await contract.save();
    if (regeneratePdf) {
      await syncBookingCompletionPdfUrl(contract);
    }

    await logAudit({
      owner: req.user._id,
      action: regeneratePdf ? 'contract.regenerate' : 'contract.update',
      entityType: 'Contract',
      entityId: contract._id,
      details: `Contract ${contract.contractNumber} updated (v${contract.version})`,
    });

    res.json({
      success: true,
      message: 'Contract updated',
      contract: {
        ...contract.toObject(),
        versions: versionSummary(contract.versions),
      },
    });
  } catch (error) {
    console.error('[contract update]', error?.message || error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update contract' });
  }
};

export const listContractVersions = async (req, res) => {
  try {
    const contract = await Contract.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).select('versions contractNumber version').lean();
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }
    res.json({
      success: true,
      currentVersion: contract.version,
      versions: contract.versions || [],
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load versions' });
  }
};

export const restoreContractVersion = async (req, res) => {
  try {
    const versionNum = parseInt(req.params.version, 10);
    if (!Number.isFinite(versionNum)) {
      return res.status(400).json({ success: false, message: 'Invalid version' });
    }

    const contract = await Contract.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    const snap = (contract.versions || []).find((v) => v.version === versionNum);
    if (!snap) {
      return res.status(404).json({ success: false, message: 'Version not found' });
    }

    pushVersion(contract, req.user, `Restored version ${versionNum}`);
    contract.sourceData = snap.sourceData || {};
    contract.templateSnapshot = snap.templateSnapshot || {};
    contract.renderedHtml = snap.renderedHtml || '';
    contract.pdfUrl = snap.pdfUrl || '';
    contract.pdfPath = snap.pdfPath || '';
    contract.status = snap.status || 'final';
    markSourceLocked(contract);
    syncDocumentListFields(contract, 'contract');
    contract.updatedBy = req.user._id;

    await renderAndStorePdf({ type: 'contract', doc: contract, owner: req.user });
    await syncBookingCompletionPdfUrl(contract);
    await contract.save();

    await logAudit({
      owner: req.user._id,
      action: 'contract.restore',
      entityType: 'Contract',
      entityId: contract._id,
      details: `Contract ${contract.contractNumber} restored to v${versionNum}`,
    });

    res.json({
      success: true,
      message: `Restored version ${versionNum}`,
      contract: {
        ...contract.toObject(),
        versions: versionSummary(contract.versions),
      },
    });
  } catch (error) {
    console.error('[contract restore]', error?.message || error);
    res.status(500).json({ success: false, message: error.message || 'Failed to restore version' });
  }
};

export const previewContract = async (req, res) => {
  try {
    const contract = await Contract.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }
    // Prefer persisted HTML (reflects last save). Rebuild only if missing.
    if (!contract.renderedHtml) {
      await hydrateLegacyDocument(contract, { type: 'contract', owner: req.user });
      const booking = (!contract.sourceLocked && contract.booking)
        ? await Booking.findById(contract.booking).populate('car')
        : null;
      const variables = await rebuildVariablesFromStructured(contract, {
        type: 'contract',
        owner: req.user,
        booking,
      });
      contract.sourceData = { ...(contract.sourceData || {}), variables };
      contract.renderedHtml = buildDocumentHtml(
        templateFromSnapshot(contract.templateSnapshot || {}),
        variables,
      );
      await contract.save();
    }
    res.json({ success: true, html: contract.renderedHtml });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to preview contract' });
  }
};

export const previewContractFromBooking = async (req, res) => {
  try {
    const { bookingId, templateId } = req.body;

    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    const ownerUser = await User.findById(req.user._id).select('documentSettings agencyName email');
    const includeCompanyStamp = resolveIncludeCompanyStamp({
      bodyValue: req.body?.includeCompanyStamp,
      owner: ownerUser || req.user,
      documentType: 'contracts',
    });

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
    const variables = await buildTemplateVariablesAsync(booking, {
      contractNumber,
      owner: ownerUser || req.user,
      template,
      includeCompanyStamp,
    });
    const html = buildDocumentHtml(template, variables);

    res.json({ success: true, html, variables, includeCompanyStamp });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to preview contract' });
  }
};

export const downloadContractPdf = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid contract ID' });
    }

    const contract = await Contract.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    let filePath = resolveExistingPdfPath(contract);
    if (!filePath) {
      await hydrateLegacyDocument(contract, { type: 'contract', owner: req.user });
      try {
        await renderAndStorePdf({ type: 'contract', doc: contract, owner: req.user });
      } catch (renderError) {
        console.error('[contract pdf] render failed:', renderError?.message || renderError);
        return res.status(500).json({
          success: false,
          message: renderError?.message || 'Failed to generate contract PDF',
        });
      }

      // Persist metadata, but still stream the file if Mongo save fails (e.g. BSON size).
      try {
        await contract.save();
      } catch (saveError) {
        console.error('[contract pdf] save after render failed:', saveError?.message || saveError);
      }
      filePath = contract.pdfPath;
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'PDF not available' });
    }

    return streamPdfFile(res, filePath, `${contract.contractNumber || 'contract'}.pdf`);
  } catch (error) {
    console.error('[contract pdf]', error?.message || error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message || 'Failed to download contract PDF' });
    }
  }
};

export const listBookingsForContracts = async (req, res) => {
  try {
    const bookings = await Booking.find({
      owner: req.user._id,
      status: { $nin: ['cancelled'] },
    })
      .populate('car', 'brand model year licensePlate category fuel_type fuelType transmission gearbox')
      .select('reservationId customerName customerEmail customerPhone customerAddress pickupDate returnDate pickupLocation returnLocation price status channel dateOfBirth placeOfBirth nationality identityDocumentNumber identityIssuedOn driverLicenseNumber driverLicenseIssuedOn driverLicenseExpiry passportNumber deliveredBy receivedBy fuelLevelStart kmDepart kmRetour franchiseAmount paymentStatus notes secondDriver')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json({ success: true, bookings });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load bookings' });
  }
};

const BULK_DELETE_MAX = 100;

const tryRemoveLocalPdf = (contract) => {
  const filePath = resolveExistingPdfPath(contract);
  if (!filePath) return;
  try {
    fs.unlinkSync(filePath);
  } catch {
    /* ephemeral disk / already gone */
  }
};

const clearBookingContractPdfRefs = async (contracts) => {
  await Promise.all(
    contracts.map(async (c) => {
      if (!c.booking || !c.pdfUrl) return;
      try {
        await Booking.updateOne(
          {
            _id: c.booking,
            owner: c.owner,
            'completion.contractPdfUrl': c.pdfUrl,
          },
          { $unset: { 'completion.contractPdfUrl': 1 } },
        );
      } catch {
        /* non-fatal */
      }
    }),
  );
};

export const deleteContract = async (req, res) => {
  try {
    const { contractId } = req.body || {};
    if (!mongoose.isValidObjectId(contractId)) {
      return res.status(400).json({ success: false, message: 'Invalid contract ID' });
    }

    const contract = await Contract.findOne({
      _id: contractId,
      owner: req.user._id,
    });
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    await clearBookingContractPdfRefs([contract]);
    tryRemoveLocalPdf(contract);
    await Contract.deleteOne({ _id: contract._id, owner: req.user._id });

    await logAudit({
      owner: req.user._id,
      actor: req.user._id,
      action: 'contract.delete',
      entityType: 'Contract',
      entityId: contract._id,
      details: `Contract ${contract.contractNumber} deleted`,
    });

    res.json({ success: true, message: 'Contract deleted' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to delete contract' });
  }
};

export const deleteContractsBulk = async (req, res) => {
  try {
    const rawIds = Array.isArray(req.body?.contractIds) ? req.body.contractIds : [];
    const uniqueIds = [...new Set(rawIds.map((id) => String(id || '').trim()))].filter((id) =>
      mongoose.isValidObjectId(id),
    );

    if (!uniqueIds.length) {
      return res.status(400).json({ success: false, message: 'No contracts selected' });
    }
    if (uniqueIds.length > BULK_DELETE_MAX) {
      return res.status(400).json({
        success: false,
        message: `Too many contracts selected (max ${BULK_DELETE_MAX})`,
      });
    }

    const owned = await Contract.find({
      _id: { $in: uniqueIds },
      owner: req.user._id,
    });

    if (!owned.length) {
      return res.status(404).json({ success: false, message: 'No matching contracts found' });
    }

    await clearBookingContractPdfRefs(owned);
    owned.forEach(tryRemoveLocalPdf);

    const ownedIds = owned.map((c) => c._id);
    const result = await Contract.deleteMany({ _id: { $in: ownedIds }, owner: req.user._id });
    const deletedCount = result.deletedCount || 0;

    await logAudit({
      owner: req.user._id,
      actor: req.user._id,
      action: 'contract.delete_bulk',
      entityType: 'Contract',
      entityId: ownedIds[0],
      details: `Deleted ${deletedCount} contract(s)`,
    });

    res.json({
      success: true,
      deletedCount,
      message:
        deletedCount === 1
          ? '1 contract deleted'
          : `${deletedCount} contracts deleted`,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to delete contracts' });
  }
};

export default {
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
  upsertContractFromBooking,
};
