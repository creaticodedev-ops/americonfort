import {
  generateSignatureRequest,
  resendSignatureRequest,
  cancelSignatureRequest,
  getSignatureRequestStatus,
  listSignatureRequests,
  ensureSignatureLink,
} from '../services/signatureRequestService.js';
import {
  previewBookingExtension,
  confirmBookingExtension,
  listBookingExtensions,
} from '../services/bookingExtensionService.js';

const handleServiceError = (res, error, fallback) => {
  const status = error.status || 500;
  console.error(error.message);
  return res.status(status).json({
    success: false,
    message: error.message || fallback,
    code: error.code,
  });
};

export const listSignatures = async (req, res) => {
  try {
    const result = await listSignatureRequests({ ownerId: req.user._id, query: req.query });
    res.json({ success: true, ...result });
  } catch (error) {
    handleServiceError(res, error, 'Failed to list signature requests');
  }
};

export const generateSignature = async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ success: false, message: 'bookingId required' });
    const result = await generateSignatureRequest({
      bookingId,
      ownerId: req.user._id,
      actorId: req.user._id,
      resend: Boolean(req.body.resend),
    });
    res.json({
      success: true,
      completionUrl: result.completionUrl,
      status: result.status,
      bookingId: result.booking._id,
    });
  } catch (error) {
    handleServiceError(res, error, 'Failed to generate signature link');
  }
};

export const ensureSignature = async (req, res) => {
  try {
    const { bookingId, refresh } = req.body;
    if (!bookingId) return res.status(400).json({ success: false, message: 'bookingId required' });
    const result = await ensureSignatureLink({
      bookingId,
      ownerId: req.user._id,
      actorId: req.user._id,
      refresh: Boolean(refresh),
    });
    res.json({
      success: true,
      completionUrl: result.completionUrl,
      shareableCompletionUrl: result.completionUrl,
      status: result.status,
    });
  } catch (error) {
    handleServiceError(res, error, 'Failed to ensure signature link');
  }
};

export const resendSignature = async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ success: false, message: 'bookingId required' });
    const result = await resendSignatureRequest({
      bookingId,
      ownerId: req.user._id,
      actorId: req.user._id,
    });
    res.json({
      success: true,
      completionUrl: result.completionUrl,
      status: result.status,
    });
  } catch (error) {
    handleServiceError(res, error, 'Failed to resend signature link');
  }
};

export const cancelSignature = async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ success: false, message: 'bookingId required' });
    const result = await cancelSignatureRequest({
      bookingId,
      ownerId: req.user._id,
      actorId: req.user._id,
    });
    res.json({ success: true, status: result.status });
  } catch (error) {
    handleServiceError(res, error, 'Failed to cancel signature request');
  }
};

export const signatureStatus = async (req, res) => {
  try {
    const bookingId = req.params.bookingId || req.query.bookingId;
    if (!bookingId) return res.status(400).json({ success: false, message: 'bookingId required' });
    const result = await getSignatureRequestStatus({
      bookingId,
      ownerId: req.user._id,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    handleServiceError(res, error, 'Failed to load signature status');
  }
};

export const previewExtension = async (req, res) => {
  try {
    const { bookingId, newReturnDate } = req.body;
    if (!bookingId || !newReturnDate) {
      return res.status(400).json({ success: false, message: 'bookingId and newReturnDate required' });
    }
    const preview = await previewBookingExtension({
      bookingId,
      ownerId: req.user._id,
      newReturnDate,
    });
    res.json({ success: true, preview });
  } catch (error) {
    handleServiceError(res, error, 'Failed to preview extension');
  }
};

export const confirmExtension = async (req, res) => {
  try {
    const { bookingId, newReturnDate, reason, notes } = req.body;
    if (!bookingId || !newReturnDate) {
      return res.status(400).json({ success: false, message: 'bookingId and newReturnDate required' });
    }
    const result = await confirmBookingExtension({
      bookingId,
      ownerId: req.user._id,
      actorId: req.user._id,
      newReturnDate,
      reason,
      notes,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    handleServiceError(res, error, 'Failed to confirm extension');
  }
};

export const listExtensions = async (req, res) => {
  try {
    const items = await listBookingExtensions({
      ownerId: req.user._id,
      bookingId: req.query.bookingId || req.params.bookingId,
    });
    res.json({ success: true, items });
  } catch (error) {
    handleServiceError(res, error, 'Failed to list extensions');
  }
};
