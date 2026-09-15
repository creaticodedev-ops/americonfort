/**
 * Cross-booking cash journal — Encaissements / Décaissements.
 * Reuses BookingLedgerEntry + paid Agency/Vehicle/Samsar expenses.
 * Never treats deposit_claim_payment as new cash-in.
 */
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import BookingLedgerEntry from '../models/BookingLedgerEntry.js';
import AgencyExpense from '../models/AgencyExpense.js';
import VehicleExpense from '../models/VehicleExpense.js';
import SamsarPayment from '../models/SamsarPayment.js';
import { toMoney } from './bookingLedgerService.js';

const toOid = (id) => {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  return new mongoose.Types.ObjectId(String(id));
};

const startOfUtcDay = (d = new Date()) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));

const endOfUtcDay = (d = new Date()) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));

const parseDayBound = (value, end = false) => {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return end
    ? new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999))
    : new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
};

const normalizeMethod = (method) => {
  const m = String(method || 'other');
  if (m === 'card' || m === 'card_tpe') return 'card_tpe';
  if (m === 'check') return 'other';
  if (['cash', 'bank_transfer', 'other'].includes(m)) return m;
  return 'other';
};

const isDepositClaimPayment = (entry) =>
  Boolean(entry?.derivedFromDepositClaim) || entry?.links?.type === 'deposit_claim_payment';

/**
 * Classify a ledger entry for cash journal.
 * Returns null if the entry is not a cash movement (charges, deposit_claim, derived payments).
 */
export const classifyLedgerEntry = (entry) => {
  if (!entry || entry.status === 'voided') return null;
  if (entry.kind === 'charge') return null;
  if (entry.kind === 'deposit_claim') {
    return {
      direction: 'internal',
      cashType: 'deposit_claim',
      includeInEncaissement: false,
      includeInDecaissement: false,
    };
  }
  if (entry.kind === 'payment') {
    if (isDepositClaimPayment(entry)) {
      return {
        direction: 'internal',
        cashType: 'deposit_claim_payment',
        includeInEncaissement: false,
        includeInDecaissement: false,
      };
    }
    return {
      direction: 'in',
      cashType: 'customer_payment',
      includeInEncaissement: true,
      includeInDecaissement: false,
    };
  }
  if (entry.kind === 'deposit_hold') {
    return {
      direction: 'in',
      cashType: 'deposit_hold',
      includeInEncaissement: true,
      includeInDecaissement: false,
    };
  }
  if (entry.kind === 'refund') {
    return {
      direction: 'out',
      cashType: 'customer_refund',
      includeInEncaissement: false,
      includeInDecaissement: true,
    };
  }
  if (entry.kind === 'deposit_release') {
    return {
      direction: 'out',
      cashType: 'deposit_release',
      includeInEncaissement: false,
      includeInDecaissement: true,
    };
  }
  return null;
};

const actorPayload = (user) => {
  if (!user) return null;
  return {
    id: String(user._id || user),
    name: user.name || '',
    email: user.email || '',
  };
};

const bookingPayload = (booking) => {
  if (!booking) return null;
  return {
    id: String(booking._id || booking),
    reservationId: booking.reservationId || '',
    customerName: booking.customerName || '',
    customerPhone: booking.customerPhone || '',
  };
};

export const normalizeLedgerRow = (entry, bookingMap = new Map()) => {
  const cls = classifyLedgerEntry(entry);
  if (!cls || (!cls.includeInEncaissement && !cls.includeInDecaissement)) return null;
  const booking = bookingMap.get(String(entry.booking)) || entry.booking;
  const ref =
    entry.reference ||
    (booking?.reservationId ? `${booking.reservationId}-${String(entry._id).slice(-6)}` : String(entry._id).slice(-8));

  return {
    id: `ledger:${entry._id}`,
    sourceId: String(entry._id),
    sourceCollection: 'BookingLedgerEntry',
    direction: cls.direction,
    cashType: cls.cashType,
    kind: entry.kind,
    category: entry.category || 'other',
    reason: entry.notes || entry.reference || entry.kind,
    amount: toMoney(entry.amount),
    currency: entry.currency || process.env.CURRENCY || 'MAD',
    method: normalizeMethod(entry.method),
    status: entry.status || 'posted',
    occurredAt: entry.occurredAt || entry.createdAt,
    reference: ref,
    notes: entry.notes || '',
    customerName: booking?.customerName || '',
    beneficiary: cls.direction === 'out' ? booking?.customerName || '' : '',
    booking: bookingPayload(booking),
    actor: actorPayload(entry.createdBy),
    links: entry.links || {},
    derivedFromDepositClaim: isDepositClaimPayment(entry),
  };
};

export const normalizeExpenseRow = (doc, sourceCollection) => {
  const occurredAt =
    doc.paidAt ||
    (sourceCollection === 'SamsarPayment' ? doc.paymentDate : doc.expenseDate) ||
    doc.createdAt;
  const category =
    sourceCollection === 'SamsarPayment'
      ? 'samsar_commission'
      : sourceCollection === 'VehicleExpense'
        ? `vehicle_${doc.category || 'other'}`
        : `agency_${doc.category || 'other'}`;
  const beneficiary =
    sourceCollection === 'SamsarPayment'
      ? doc.samsar?.fullName || 'Samsar'
      : sourceCollection === 'VehicleExpense'
        ? `${doc.car?.brand || ''} ${doc.car?.model || ''}`.trim() || 'Vehicle'
        : doc.description || 'Agency';

  return {
    id: `expense:${sourceCollection}:${doc._id}`,
    sourceId: String(doc._id),
    sourceCollection,
    direction: 'out',
    cashType:
      sourceCollection === 'SamsarPayment'
        ? 'samsar_payment'
        : sourceCollection === 'VehicleExpense'
          ? 'vehicle_expense'
          : 'agency_expense',
    kind: 'expense',
    category,
    reason: doc.description || doc.notes || category,
    amount: toMoney(doc.amount),
    currency: doc.currency || process.env.CURRENCY || 'MAD',
    method: normalizeMethod(doc.paymentMethod),
    status: doc.paymentStatus || 'paid',
    occurredAt,
    reference: String(doc._id).slice(-8).toUpperCase(),
    notes: doc.notes || '',
    customerName: '',
    beneficiary,
    booking: doc.booking
      ? {
          id: String(doc.booking._id || doc.booking),
          reservationId: doc.booking.reservationId || '',
          customerName: doc.booking.customerName || '',
        }
      : null,
    actor: actorPayload(doc.createdBy),
    links: {},
    derivedFromDepositClaim: false,
  };
};

const matchDateRange = (from, to) => {
  const start = parseDayBound(from, false);
  const end = parseDayBound(to, true);
  if (!start && !end) return null;
  const range = {};
  if (start) range.$gte = start;
  if (end) range.$lte = end;
  return range;
};

const applyCommonFilters = (rows, filters = {}) => {
  let list = rows;
  const method = filters.method && filters.method !== 'all' ? normalizeMethod(filters.method) : null;
  const cashType = filters.cashType && filters.cashType !== 'all' ? filters.cashType : null;
  const category = filters.category && filters.category !== 'all' ? filters.category : null;
  const status = filters.status && filters.status !== 'all' ? filters.status : null;
  const userId = filters.userId ? String(filters.userId) : null;
  const bookingId = filters.bookingId ? String(filters.bookingId) : null;
  const reservationId = filters.reservationId ? String(filters.reservationId).toLowerCase() : null;
  const q = filters.q ? String(filters.q).trim().toLowerCase() : '';
  const minAmount = filters.minAmount != null && filters.minAmount !== '' ? Number(filters.minAmount) : null;
  const maxAmount = filters.maxAmount != null && filters.maxAmount !== '' ? Number(filters.maxAmount) : null;

  if (method) list = list.filter((r) => r.method === method);
  if (cashType) list = list.filter((r) => r.cashType === cashType);
  if (category) list = list.filter((r) => r.category === category);
  if (status) list = list.filter((r) => r.status === status);
  if (userId) list = list.filter((r) => r.actor?.id === userId);
  if (bookingId) list = list.filter((r) => r.booking?.id === bookingId);
  if (reservationId) {
    list = list.filter((r) => String(r.booking?.reservationId || '').toLowerCase().includes(reservationId));
  }
  if (Number.isFinite(minAmount)) list = list.filter((r) => r.amount >= minAmount);
  if (Number.isFinite(maxAmount)) list = list.filter((r) => r.amount <= maxAmount);
  if (q) {
    list = list.filter((row) => {
      const hay = [
        row.reference,
        row.reason,
        row.notes,
        row.customerName,
        row.beneficiary,
        row.booking?.reservationId,
        row.category,
        row.cashType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }
  return list;
};

const loadBookingMap = async (ownerId, bookingIds) => {
  const ids = [...new Set(bookingIds.map(String).filter(Boolean))];
  if (!ids.length) return new Map();
  const bookings = await Booking.find({
    owner: toOid(ownerId),
    _id: { $in: ids.map(toOid) },
  })
    .select('reservationId customerName customerPhone')
    .lean();
  return new Map(bookings.map((b) => [String(b._id), b]));
};

export const loadLedgerCashRows = async (ownerId, { from, to, includeVoided = false } = {}) => {
  const filter = { owner: toOid(ownerId) };
  if (!includeVoided) filter.status = 'posted';
  const range = matchDateRange(from, to);
  if (range) filter.occurredAt = range;

  const entries = await BookingLedgerEntry.find(filter)
    .sort({ occurredAt: -1, createdAt: -1 })
    .populate('createdBy', 'name email')
    .lean();

  const bookingMap = await loadBookingMap(
    ownerId,
    entries.map((e) => e.booking),
  );

  return entries.map((e) => normalizeLedgerRow(e, bookingMap)).filter(Boolean);
};

export const loadExpenseCashRows = async (ownerId, { from, to } = {}) => {
  const owner = toOid(ownerId);
  const range = matchDateRange(from, to);

  const agencyFilter = { owner, paymentStatus: 'paid' };
  const vehicleFilter = { owner, paymentStatus: 'paid' };
  const samsarFilter = { owner, paymentStatus: 'paid' };

  // Prefer paidAt; fall back to expense/payment date for legacy rows without paidAt
  if (range) {
    const dateOr = (dateField) => ({
      $or: [
        { paidAt: range },
        { $and: [{ paidAt: null }, { [dateField]: range }] },
        { $and: [{ paidAt: { $exists: false } }, { [dateField]: range }] },
      ],
    });
    Object.assign(agencyFilter, dateOr('expenseDate'));
    Object.assign(vehicleFilter, dateOr('expenseDate'));
    Object.assign(samsarFilter, dateOr('paymentDate'));
  }

  const [agency, vehicles, samsars] = await Promise.all([
    AgencyExpense.find(agencyFilter).populate('createdBy', 'name email').lean(),
    VehicleExpense.find(vehicleFilter)
      .populate('createdBy', 'name email')
      .populate('car', 'brand model licensePlate')
      .populate('booking', 'reservationId customerName')
      .lean(),
    SamsarPayment.find(samsarFilter)
      .populate('createdBy', 'name email')
      .populate('samsar', 'fullName')
      .populate('booking', 'reservationId customerName')
      .lean(),
  ]);

  return [
    ...agency.map((d) => normalizeExpenseRow(d, 'AgencyExpense')),
    ...vehicles.map((d) => normalizeExpenseRow(d, 'VehicleExpense')),
    ...samsars.map((d) => normalizeExpenseRow(d, 'SamsarPayment')),
  ];
};

export const listCashJournal = async (
  ownerId,
  {
    direction = 'in', // 'in' | 'out'
    from,
    to,
    page = 1,
    limit = 25,
    ...filters
  } = {},
) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));

  const ledgerRows = await loadLedgerCashRows(ownerId, { from, to });
  let rows =
    direction === 'out'
      ? [
          ...ledgerRows.filter((r) => r.direction === 'out'),
          ...(await loadExpenseCashRows(ownerId, { from, to })),
        ]
      : ledgerRows.filter((r) => r.direction === 'in');

  rows = applyCommonFilters(rows, filters);
  rows.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));

  const total = rows.length;
  const totalAmount = toMoney(rows.reduce((s, r) => s + r.amount, 0));
  const start = (safePage - 1) * safeLimit;
  const items = rows.slice(start, start + safeLimit);

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit) || 1,
    },
    totals: { count: total, amount: totalAmount },
  };
};

const methodBreakdown = (rows) => {
  const map = new Map();
  for (const row of rows) {
    const key = row.method || 'other';
    const cur = map.get(key) || { method: key, count: 0, amount: 0 };
    cur.count += 1;
    cur.amount = toMoney(cur.amount + row.amount);
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
};

export const getCashOverview = async (ownerId, { from, to } = {}) => {
  const now = new Date();
  const todayFrom = startOfUtcDay(now).toISOString().slice(0, 10);
  const todayTo = todayFrom;

  const periodFrom = from || todayFrom;
  const periodTo = to || todayTo;

  const [periodIn, periodOut, todayIn, todayOut, outstandingAgg, depositsHeldAgg] = await Promise.all([
    listCashJournal(ownerId, { direction: 'in', from: periodFrom, to: periodTo, page: 1, limit: 8 }),
    listCashJournal(ownerId, { direction: 'out', from: periodFrom, to: periodTo, page: 1, limit: 8 }),
    listCashJournal(ownerId, { direction: 'in', from: todayFrom, to: todayTo, page: 1, limit: 5 }),
    listCashJournal(ownerId, { direction: 'out', from: todayFrom, to: todayTo, page: 1, limit: 5 }),
    Booking.aggregate([
      {
        $match: {
          owner: toOid(ownerId),
          status: { $nin: ['cancelled'] },
          'financial.balanceDue': { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          balanceDue: { $sum: '$financial.balanceDue' },
        },
      },
    ]),
    Booking.aggregate([
      {
        $match: {
          owner: toOid(ownerId),
          status: { $nin: ['cancelled'] },
          'financial.depositHeld': { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          depositHeld: { $sum: '$financial.depositHeld' },
        },
      },
    ]),
  ]);

  const inAmount = periodIn.totals.amount;
  const outAmount = periodOut.totals.amount;
  const refunds = toMoney(
    (await loadLedgerCashRows(ownerId, { from: periodFrom, to: periodTo }))
      .filter((r) => r.cashType === 'customer_refund')
      .reduce((s, r) => s + r.amount, 0),
  );

  const outstanding = outstandingAgg[0] || { count: 0, balanceDue: 0 };
  const deposits = depositsHeldAgg[0] || { count: 0, depositHeld: 0 };

  const recent = [...periodIn.items, ...periodOut.items]
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
    .slice(0, 12);

  return {
    period: { from: periodFrom, to: periodTo },
    kpis: {
      todayIn: todayIn.totals.amount,
      todayOut: todayOut.totals.amount,
      todayNet: toMoney(todayIn.totals.amount - todayOut.totals.amount),
      periodIn: inAmount,
      periodOut: outAmount,
      periodNet: toMoney(inAmount - outAmount),
      outstandingBalance: toMoney(outstanding.balanceDue),
      outstandingCount: outstanding.count || 0,
      depositsHeld: toMoney(deposits.depositHeld),
      depositsHeldCount: deposits.count || 0,
      refunds,
    },
    methodBreakdownIn: methodBreakdown(
      (await listCashJournal(ownerId, { direction: 'in', from: periodFrom, to: periodTo, page: 1, limit: 10000 }))
        .items,
    ),
    methodBreakdownOut: methodBreakdown(
      (await listCashJournal(ownerId, { direction: 'out', from: periodFrom, to: periodTo, page: 1, limit: 10000 }))
        .items,
    ),
    recent,
  };
};

export const getCashTransactionDetail = async (ownerId, compositeId) => {
  const raw = String(compositeId || '');
  if (raw.startsWith('ledger:')) {
    const id = raw.slice('ledger:'.length);
    if (!mongoose.isValidObjectId(id)) {
      const err = new Error('Invalid transaction id');
      err.status = 400;
      throw err;
    }
    const entry = await BookingLedgerEntry.findOne({ _id: id, owner: toOid(ownerId) })
      .populate('createdBy', 'name email')
      .lean();
    if (!entry) {
      const err = new Error('Transaction not found');
      err.status = 404;
      throw err;
    }
    const bookingMap = await loadBookingMap(ownerId, [entry.booking]);
    const cls = classifyLedgerEntry(entry);
    const row =
      normalizeLedgerRow(entry, bookingMap) ||
      ({
        id: `ledger:${entry._id}`,
        sourceId: String(entry._id),
        sourceCollection: 'BookingLedgerEntry',
        direction: cls?.direction || 'internal',
        cashType: cls?.cashType || entry.kind,
        kind: entry.kind,
        category: entry.category,
        reason: entry.notes || entry.kind,
        amount: toMoney(entry.amount),
        currency: entry.currency || 'MAD',
        method: normalizeMethod(entry.method),
        status: entry.status,
        occurredAt: entry.occurredAt,
        reference: entry.reference || '',
        notes: entry.notes || '',
        customerName: bookingMap.get(String(entry.booking))?.customerName || '',
        beneficiary: '',
        booking: bookingPayload(bookingMap.get(String(entry.booking))),
        actor: actorPayload(entry.createdBy),
        links: entry.links || {},
        derivedFromDepositClaim: isDepositClaimPayment(entry),
      });

    const related = await BookingLedgerEntry.find({
      owner: toOid(ownerId),
      booking: entry.booking,
      status: 'posted',
      _id: { $ne: entry._id },
    })
      .sort({ occurredAt: -1 })
      .limit(20)
      .populate('createdBy', 'name email')
      .lean();

    return {
      transaction: row,
      related: related.map((e) => normalizeLedgerRow(e, bookingMap)).filter(Boolean),
      voidable: entry.status === 'posted' && ['payment', 'refund', 'deposit_hold', 'deposit_release', 'charge', 'deposit_claim'].includes(entry.kind),
    };
  }

  if (raw.startsWith('expense:')) {
    const [, collection, id] = raw.split(':');
    if (!mongoose.isValidObjectId(id)) {
      const err = new Error('Invalid transaction id');
      err.status = 400;
      throw err;
    }
    let doc = null;
    let sourceCollection = collection;
    if (collection === 'AgencyExpense') {
      doc = await AgencyExpense.findOne({ _id: id, owner: toOid(ownerId) })
        .populate('createdBy', 'name email')
        .lean();
    } else if (collection === 'VehicleExpense') {
      doc = await VehicleExpense.findOne({ _id: id, owner: toOid(ownerId) })
        .populate('createdBy', 'name email')
        .populate('car', 'brand model licensePlate')
        .populate('booking', 'reservationId customerName')
        .lean();
    } else if (collection === 'SamsarPayment') {
      doc = await SamsarPayment.findOne({ _id: id, owner: toOid(ownerId) })
        .populate('createdBy', 'name email')
        .populate('samsar', 'fullName')
        .populate('booking', 'reservationId customerName')
        .lean();
    }
    if (!doc) {
      const err = new Error('Transaction not found');
      err.status = 404;
      throw err;
    }
    return {
      transaction: normalizeExpenseRow(doc, sourceCollection),
      related: [],
      voidable: false,
    };
  }

  const err = new Error('Invalid transaction id');
  err.status = 400;
  throw err;
};

export default {
  classifyLedgerEntry,
  listCashJournal,
  getCashOverview,
  getCashTransactionDetail,
  loadLedgerCashRows,
  loadExpenseCashRows,
};
