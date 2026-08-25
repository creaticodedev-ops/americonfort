import {
  getBookingFinancialSummary,
  postOfflinePayment,
  postCharge,
  postRefund,
} from '../services/bookingLedgerService.js';

export const getBookingFinancial = async (req, res) => {
  try {
    const summary = await getBookingFinancialSummary(req.params.bookingId, req.user._id);
    res.json({ success: true, financial: summary });
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('[bookingLedger]', error.message);
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to load financial summary',
      code: error.code,
    });
  }
};

export const createLedgerPayment = async (req, res) => {
  try {
    const {
      amount,
      method,
      reference,
      notes,
      occurredAt,
      idempotencyKey,
      allowOverpayment,
    } = req.body || {};

    const result = await postOfflinePayment({
      ownerId: req.user._id,
      bookingId: req.params.bookingId,
      actorId: req.user._id,
      amount,
      method,
      reference,
      notes,
      occurredAt,
      idempotencyKey: idempotencyKey || req.get('Idempotency-Key') || '',
      allowOverpayment: Boolean(allowOverpayment),
    });

    res.status(result.duplicate ? 200 : 201).json({
      success: true,
      duplicate: Boolean(result.duplicate),
      entry: result.entry,
      financial: result.financial,
      message: result.duplicate ? 'Payment already recorded' : 'Payment recorded',
    });
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('[bookingLedger] payment', error.message);
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to record payment',
      code: error.code,
      balanceDue: error.balanceDue,
    });
  }
};

export const createLedgerCharge = async (req, res) => {
  try {
    const { amount, category, reference, notes, occurredAt, idempotencyKey } = req.body || {};

    const result = await postCharge({
      ownerId: req.user._id,
      bookingId: req.params.bookingId,
      actorId: req.user._id,
      amount,
      category,
      reference,
      notes,
      occurredAt,
      idempotencyKey: idempotencyKey || req.get('Idempotency-Key') || '',
    });

    res.status(result.duplicate ? 200 : 201).json({
      success: true,
      duplicate: Boolean(result.duplicate),
      entry: result.entry,
      financial: result.financial,
      message: result.duplicate ? 'Charge already recorded' : 'Charge recorded',
    });
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('[bookingLedger] charge', error.message);
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to record charge',
      code: error.code,
    });
  }
};

export const createLedgerRefund = async (req, res) => {
  try {
    const { amount, method, reference, notes, occurredAt, idempotencyKey } = req.body || {};

    const result = await postRefund({
      ownerId: req.user._id,
      bookingId: req.params.bookingId,
      actorId: req.user._id,
      amount,
      method,
      reference,
      notes,
      occurredAt,
      idempotencyKey: idempotencyKey || req.get('Idempotency-Key') || '',
    });

    res.status(result.duplicate ? 200 : 201).json({
      success: true,
      duplicate: Boolean(result.duplicate),
      entry: result.entry,
      financial: result.financial,
      message: result.duplicate ? 'Refund already recorded' : 'Refund recorded',
    });
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('[bookingLedger] refund', error.message);
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to record refund',
      code: error.code,
    });
  }
};

export default {
  getBookingFinancial,
  createLedgerPayment,
  createLedgerCharge,
  createLedgerRefund,
};
