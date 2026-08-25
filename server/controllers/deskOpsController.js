import {
  holdDeposit,
  releaseDeposit,
  claimDeposit,
} from '../services/depositService.js';
import {
  listInspectionsForBooking,
  getOrCreateDraftInspection,
  updateDraftInspection,
  addInspectionPhoto,
  completeInspection,
} from '../services/inspectionService.js';
import { cleanupUploadedFile } from '../middleware/multer.js';

export const postDepositHold = async (req, res) => {
  try {
    const result = await holdDeposit({
      ownerId: req.user._id,
      bookingId: req.params.bookingId,
      actorId: req.user._id,
      amount: req.body?.amount,
      method: req.body?.method,
      reference: req.body?.reference,
      notes: req.body?.notes,
      idempotencyKey: req.body?.idempotencyKey || req.get('Idempotency-Key'),
      occurredAt: req.body?.occurredAt,
    });
    res.status(result.duplicate ? 200 : 201).json({
      success: true,
      duplicate: Boolean(result.duplicate),
      entry: result.entry,
      financial: result.financial,
      message: result.duplicate ? 'Deposit hold already recorded' : 'Deposit held',
    });
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('[deposit] hold', error.message);
    res.status(status).json({ success: false, message: error.message, code: error.code });
  }
};

export const postDepositRelease = async (req, res) => {
  try {
    const result = await releaseDeposit({
      ownerId: req.user._id,
      bookingId: req.params.bookingId,
      actorId: req.user._id,
      amount: req.body?.amount,
      method: req.body?.method,
      reference: req.body?.reference,
      notes: req.body?.notes,
      idempotencyKey: req.body?.idempotencyKey || req.get('Idempotency-Key'),
      occurredAt: req.body?.occurredAt,
    });
    res.status(result.duplicate ? 200 : 201).json({
      success: true,
      duplicate: Boolean(result.duplicate),
      entry: result.entry,
      financial: result.financial,
      message: result.duplicate ? 'Deposit release already recorded' : 'Deposit released',
    });
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('[deposit] release', error.message);
    res.status(status).json({ success: false, message: error.message, code: error.code });
  }
};

export const postDepositClaim = async (req, res) => {
  try {
    const result = await claimDeposit({
      ownerId: req.user._id,
      bookingId: req.params.bookingId,
      actorId: req.user._id,
      amount: req.body?.amount,
      method: req.body?.method,
      reference: req.body?.reference,
      notes: req.body?.notes,
      idempotencyKey: req.body?.idempotencyKey || req.get('Idempotency-Key'),
      occurredAt: req.body?.occurredAt,
      applyAsPayment: req.body?.applyAsPayment !== false,
    });
    res.status(result.duplicate ? 200 : 201).json({
      success: true,
      duplicate: Boolean(result.duplicate),
      entry: result.entry,
      paymentEntry: result.paymentEntry,
      financial: result.financial,
      message: result.duplicate ? 'Deposit claim already recorded' : 'Deposit claimed',
    });
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('[deposit] claim', error.message);
    res.status(status).json({ success: false, message: error.message, code: error.code });
  }
};

export const getBookingInspections = async (req, res) => {
  try {
    const inspections = await listInspectionsForBooking(req.params.bookingId, req.user._id);
    res.json({ success: true, inspections });
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('[inspection] list', error.message);
    res.status(status).json({ success: false, message: error.message });
  }
};

export const createBookingInspection = async (req, res) => {
  try {
    const type = req.body?.type || req.query?.type;
    const inspection = await getOrCreateDraftInspection({
      bookingId: req.params.bookingId,
      ownerId: req.user._id,
      actorId: req.user._id,
      type,
    });
    res.json({ success: true, inspection });
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('[inspection] create', error.message);
    res.status(status).json({ success: false, message: error.message });
  }
};

export const patchInspection = async (req, res) => {
  try {
    const inspection = await updateDraftInspection({
      inspectionId: req.params.inspectionId,
      ownerId: req.user._id,
      actorId: req.user._id,
      patch: req.body || {},
    });
    res.json({ success: true, inspection });
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('[inspection] patch', error.message);
    res.status(status).json({ success: false, message: error.message, code: error.code });
  }
};

export const uploadInspectionPhoto = async (req, res) => {
  let file = req.file;
  try {
    const inspection = await addInspectionPhoto({
      inspectionId: req.params.inspectionId,
      ownerId: req.user._id,
      file,
      caption: req.body?.caption,
    });
    file = null;
    res.json({ success: true, inspection, message: 'Photo uploaded' });
  } catch (error) {
    cleanupUploadedFile(file);
    const status = error.status || 500;
    if (status >= 500) console.error('[inspection] photo', error.message);
    res.status(status).json({ success: false, message: error.message });
  }
};

export const completeBookingInspection = async (req, res) => {
  try {
    const result = await completeInspection({
      inspectionId: req.params.inspectionId,
      ownerId: req.user._id,
      actorId: req.user._id,
      postDamageCharges: req.body?.postDamageCharges !== false,
    });
    res.json({
      success: true,
      inspection: result.inspection,
      damageCharges: result.damageCharges || [],
      alreadyCompleted: Boolean(result.alreadyCompleted),
      message: result.alreadyCompleted ? 'Inspection already completed' : 'Inspection completed',
    });
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('[inspection] complete', error.message);
    res.status(status).json({ success: false, message: error.message, code: error.code });
  }
};

export default {
  postDepositHold,
  postDepositRelease,
  postDepositClaim,
  getBookingInspections,
  createBookingInspection,
  patchInspection,
  uploadInspectionPhoto,
  completeBookingInspection,
};
