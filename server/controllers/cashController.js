import mongoose from 'mongoose';
import {
  getCashOverview,
  getCashTransactionDetail,
  listCashJournal,
} from '../services/cashJournalService.js';
import {
  postOfflinePayment,
  postRefund,
  voidLedgerEntry,
} from '../services/bookingLedgerService.js';
import { holdDeposit, releaseDeposit } from '../services/depositService.js';
import AgencyExpense from '../models/AgencyExpense.js';
import VehicleExpense from '../models/VehicleExpense.js';
import SamsarPayment from '../models/SamsarPayment.js';
import { logAudit } from '../utils/adminOps.js';

const ownerId = (req) => req.user._id;

const money = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
};

const parseListQuery = (query) => ({
  from: query.from || undefined,
  to: query.to || undefined,
  page: query.page,
  limit: query.limit,
  method: query.method,
  cashType: query.cashType || query.type,
  category: query.category,
  status: query.status,
  userId: query.userId,
  bookingId: query.bookingId,
  reservationId: query.reservationId,
  q: query.q || query.search,
  minAmount: query.minAmount,
  maxAmount: query.maxAmount,
});

export const cashOverview = async (req, res) => {
  try {
    const overview = await getCashOverview(ownerId(req), {
      from: req.query.from,
      to: req.query.to,
    });
    res.json({ success: true, overview });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load cash overview' });
  }
};

export const listEncaissements = async (req, res) => {
  try {
    const result = await listCashJournal(ownerId(req), {
      direction: 'in',
      ...parseListQuery(req.query),
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to list encaissements' });
  }
};

export const listDecaissements = async (req, res) => {
  try {
    const result = await listCashJournal(ownerId(req), {
      direction: 'out',
      ...parseListQuery(req.query),
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to list décaissements' });
  }
};

export const getCashTransaction = async (req, res) => {
  try {
    const detail = await getCashTransactionDetail(ownerId(req), req.params.id);
    res.json({ success: true, ...detail });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to load transaction',
    });
  }
};

export const createEncaissement = async (req, res) => {
  try {
    const owner = ownerId(req);
    const amount = money(req.body.amount);
    if (amount == null || !(amount > 0)) {
      return res.status(400).json({ success: false, message: 'Valid amount required' });
    }
    if (!mongoose.isValidObjectId(req.body.bookingId)) {
      return res.status(400).json({ success: false, message: 'bookingId required' });
    }

    const type = String(req.body.type || 'payment');
    const method = req.body.method || 'cash';
    const idempotencyKey =
      req.body.idempotencyKey || req.get('Idempotency-Key') || undefined;

    let result;
    if (type === 'deposit_hold') {
      result = await holdDeposit({
        ownerId: owner,
        bookingId: req.body.bookingId,
        actorId: owner,
        amount,
        method,
        reference: req.body.reference || '',
        notes: req.body.notes || '',
        occurredAt: req.body.occurredAt,
        idempotencyKey,
      });
    } else {
      result = await postOfflinePayment({
        ownerId: owner,
        bookingId: req.body.bookingId,
        actorId: owner,
        amount,
        method,
        reference: req.body.reference || '',
        notes: req.body.notes || '',
        occurredAt: req.body.occurredAt,
        idempotencyKey,
        allowOverpayment: Boolean(req.body.allowOverpayment),
      });
    }

    res.status(201).json({
      success: true,
      entry: result.entry,
      financial: result.financial,
      duplicate: Boolean(result.duplicate),
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to record encaissement',
      code: error.code,
      balanceDue: error.balanceDue,
    });
  }
};

export const createDecaissement = async (req, res) => {
  try {
    const owner = ownerId(req);
    const amount = money(req.body.amount);
    if (amount == null || !(amount > 0)) {
      return res.status(400).json({ success: false, message: 'Valid amount required' });
    }

    const type = String(req.body.type || 'refund');
    const method = req.body.method || 'cash';
    const idempotencyKey =
      req.body.idempotencyKey || req.get('Idempotency-Key') || undefined;

    if (type === 'refund' || type === 'deposit_release') {
      if (!mongoose.isValidObjectId(req.body.bookingId)) {
        return res.status(400).json({ success: false, message: 'bookingId required' });
      }
      let result;
      if (type === 'deposit_release') {
        result = await releaseDeposit({
          ownerId: owner,
          bookingId: req.body.bookingId,
          actorId: owner,
          amount,
          method,
          reference: req.body.reference || '',
          notes: req.body.notes || '',
          occurredAt: req.body.occurredAt,
          idempotencyKey,
        });
      } else {
        result = await postRefund({
          ownerId: owner,
          bookingId: req.body.bookingId,
          actorId: owner,
          amount,
          method,
          reference: req.body.reference || '',
          notes: req.body.notes || '',
          occurredAt: req.body.occurredAt,
          idempotencyKey,
        });
      }
      return res.status(201).json({
        success: true,
        entry: result.entry,
        financial: result.financial,
        duplicate: Boolean(result.duplicate),
      });
    }

    // Operational expense cash-out
    const paymentStatus = 'paid';
    const paidAt = req.body.occurredAt ? new Date(req.body.occurredAt) : new Date();
    if (type === 'agency_expense') {
      const item = await AgencyExpense.create({
        owner,
        category: req.body.category || 'other',
        amount,
        currency: process.env.CURRENCY || 'MAD',
        expenseDate: paidAt,
        paidAt,
        description: String(req.body.description || req.body.reason || '').slice(0, 500),
        paymentStatus,
        paymentMethod: method === 'card_tpe' ? 'card' : method,
        notes: String(req.body.notes || '').slice(0, 2000),
        createdBy: owner,
        updatedBy: owner,
      });
      await logAudit({
        owner,
        actor: owner,
        action: 'agency_expense.create',
        entityType: 'AgencyExpense',
        entityId: item._id,
        details: `Cash décaissement agency ${amount}`,
      });
      return res.status(201).json({ success: true, item, sourceCollection: 'AgencyExpense' });
    }

    if (type === 'vehicle_expense') {
      if (!mongoose.isValidObjectId(req.body.carId)) {
        return res.status(400).json({ success: false, message: 'carId required' });
      }
      const item = await VehicleExpense.create({
        owner,
        car: req.body.carId,
        category: req.body.category || 'other',
        amount,
        currency: process.env.CURRENCY || 'MAD',
        expenseDate: paidAt,
        paidAt,
        description: String(req.body.description || req.body.reason || '').slice(0, 500),
        paymentStatus,
        paymentMethod: method === 'card_tpe' ? 'card' : method,
        notes: String(req.body.notes || '').slice(0, 2000),
        booking: mongoose.isValidObjectId(req.body.bookingId) ? req.body.bookingId : null,
        createdBy: owner,
        updatedBy: owner,
      });
      await logAudit({
        owner,
        actor: owner,
        action: 'vehicle_expense.create',
        entityType: 'VehicleExpense',
        entityId: item._id,
        details: `Cash décaissement vehicle ${amount}`,
      });
      return res.status(201).json({ success: true, item, sourceCollection: 'VehicleExpense' });
    }

    if (type === 'samsar_payment') {
      if (!mongoose.isValidObjectId(req.body.samsarId)) {
        return res.status(400).json({ success: false, message: 'samsarId required' });
      }
      const item = await SamsarPayment.create({
        owner,
        samsar: req.body.samsarId,
        amount,
        currency: process.env.CURRENCY || 'MAD',
        paymentDate: paidAt,
        paidAt,
        paymentStatus,
        paymentMethod: method === 'card_tpe' ? 'other' : method,
        notes: String(req.body.notes || '').slice(0, 2000),
        booking: mongoose.isValidObjectId(req.body.bookingId) ? req.body.bookingId : null,
        createdBy: owner,
        updatedBy: owner,
      });
      await logAudit({
        owner,
        actor: owner,
        action: 'samsar_payment.create',
        entityType: 'SamsarPayment',
        entityId: item._id,
        details: `Cash décaissement samsar ${amount}`,
      });
      return res.status(201).json({ success: true, item, sourceCollection: 'SamsarPayment' });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid type. Use refund, deposit_release, agency_expense, vehicle_expense, or samsar_payment',
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to record décaissement',
      code: error.code,
    });
  }
};

export const voidCashTransaction = async (req, res) => {
  try {
    const raw = String(req.params.id || '');
    if (!raw.startsWith('ledger:')) {
      return res.status(400).json({
        success: false,
        message: 'Only ledger transactions can be voided from cash modules',
      });
    }
    const entryId = raw.slice('ledger:'.length);
    const result = await voidLedgerEntry({
      ownerId: ownerId(req),
      entryId,
      actorId: ownerId(req),
      reason: req.body.reason || '',
    });
    res.json({
      success: true,
      entry: result.entry,
      financial: result.financial,
      alreadyVoided: Boolean(result.alreadyVoided),
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to void transaction',
    });
  }
};

export default {
  cashOverview,
  listEncaissements,
  listDecaissements,
  getCashTransaction,
  createEncaissement,
  createDecaissement,
  voidCashTransaction,
};
