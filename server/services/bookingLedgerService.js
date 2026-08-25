/**
 * Offline booking ledger — read + write (Phase 1–2).
 * Posted BookingLedgerEntry rows are SSOT for money movements.
 * Legacy Payment (1:1) is dual-written / synced — never removed in Phase 2.
 */

import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import BookingLedgerEntry, {
  LEDGER_CATEGORIES,
  LEDGER_KINDS,
  LEDGER_METHODS,
} from '../models/BookingLedgerEntry.js';
import { logAudit } from '../utils/adminOps.js';

const toMoney = (n) => Math.round((Number(n) || 0) * 100) / 100;
export { toMoney };

const CHARGE_KINDS = new Set(['charge']);
const PAYMENT_KINDS = new Set(['payment']);
const REFUND_KINDS = new Set(['refund']);
const DEPOSIT_HOLD = 'deposit_hold';
const DEPOSIT_RELEASE = 'deposit_release';
const DEPOSIT_CLAIM = 'deposit_claim';

const CHARGE_CATEGORIES = new Set([
  'rental',
  'extension',
  'delivery',
  'second_driver',
  'late_fee',
  'fuel',
  'damage',
  'extra',
  'cancellation',
  'adjustment',
  'other',
]);

const PAYMENT_METHODS = new Set(LEDGER_METHODS);

export const computeTotalsFromEntries = (entries = []) => {
  let chargesTotal = 0;
  let paymentsTotal = 0;
  let refundsTotal = 0;
  let depositHeldIn = 0;
  let depositReleased = 0;
  let depositClaimed = 0;

  for (const e of entries) {
    const amount = toMoney(e.amount);
    if (CHARGE_KINDS.has(e.kind)) chargesTotal += amount;
    else if (PAYMENT_KINDS.has(e.kind)) paymentsTotal += amount;
    else if (REFUND_KINDS.has(e.kind)) refundsTotal += amount;
    else if (e.kind === DEPOSIT_HOLD) depositHeldIn += amount;
    else if (e.kind === DEPOSIT_RELEASE) depositReleased += amount;
    else if (e.kind === DEPOSIT_CLAIM) depositClaimed += amount;
  }

  const balanceDue = toMoney(chargesTotal - paymentsTotal + refundsTotal);
  const depositHeld = toMoney(Math.max(0, depositHeldIn - depositReleased - depositClaimed));

  return {
    chargesTotal: toMoney(chargesTotal),
    paymentsTotal: toMoney(paymentsTotal),
    refundsTotal: toMoney(refundsTotal),
    balanceDue,
    depositHeld,
    depositReleased: toMoney(depositReleased),
    depositClaimed: toMoney(depositClaimed),
    depositHeldGross: toMoney(depositHeldIn),
  };
};

export const deriveSettlementStatus = ({
  chargesTotal,
  paymentsTotal,
  refundsTotal,
  balanceDue,
  paymentStatus,
}) => {
  if (refundsTotal > 0 && paymentsTotal > 0 && balanceDue >= -0.001 && paymentsTotal <= refundsTotal + 0.001) {
    return 'refunded';
  }
  if (paymentStatus === 'refunded' && refundsTotal > 0 && paymentsTotal <= refundsTotal) {
    return 'refunded';
  }
  if (chargesTotal <= 0 && paymentsTotal <= 0) {
    if (paymentStatus === 'paid') return 'paid';
    return 'unpaid';
  }
  if (balanceDue <= 0.001 && paymentsTotal > 0) return 'paid';
  if (paymentsTotal > 0 && balanceDue > 0) return 'partial';
  return 'unpaid';
};

export const deriveDepositStatus = ({
  depositRequired,
  depositHeld,
  depositReleased,
  depositClaimed,
  depositHeldGross,
}) => {
  const required = toMoney(depositRequired);
  if (required <= 0 && depositHeldGross <= 0) return 'none';
  if (depositHeld > 0.001 && (depositReleased > 0 || depositClaimed > 0)) {
    return 'partially_released';
  }
  if (depositHeld > 0.001) return 'held';
  if (depositClaimed > 0 && depositHeld <= 0.001 && depositReleased <= 0.001) return 'claimed';
  if (depositReleased > 0 && depositHeld <= 0.001) return 'released';
  if (required > 0) return 'pending';
  return 'none';
};

export const projectLegacyFinancial = (booking, paymentDoc = null) => {
  const price = toMoney(booking?.price);
  const franchise = toMoney(booking?.franchiseAmount);
  const completionPaid = toMoney(booking?.completion?.amountPaid);
  const paymentAmount = toMoney(paymentDoc?.amount);
  const paymentStatus = booking?.paymentStatus || paymentDoc?.status || 'pending';

  let paymentsTotal = 0;
  let refundsTotal = 0;

  if (paymentStatus === 'paid') {
    paymentsTotal = completionPaid > 0 ? completionPaid : (paymentAmount > 0 ? paymentAmount : price);
  } else if (paymentStatus === 'refunded') {
    paymentsTotal = completionPaid > 0 ? completionPaid : (paymentAmount > 0 ? paymentAmount : price);
    refundsTotal = paymentsTotal;
  } else if (completionPaid > 0) {
    paymentsTotal = completionPaid;
  }

  const chargesTotal = price;
  const balanceDue = toMoney(chargesTotal - paymentsTotal + refundsTotal);

  const totals = {
    chargesTotal,
    paymentsTotal,
    refundsTotal,
    balanceDue,
    depositRequired: franchise,
    depositHeld: 0,
    depositReleased: 0,
    depositClaimed: 0,
    depositHeldGross: 0,
  };

  return {
    source: 'legacy',
    ...totals,
    settlementStatus: deriveSettlementStatus({ ...totals, paymentStatus }),
    depositStatus: deriveDepositStatus({
      depositRequired: franchise,
      depositHeld: 0,
      depositReleased: 0,
      depositClaimed: 0,
      depositHeldGross: 0,
    }),
    legacy: {
      paymentStatus,
      paymentDocStatus: paymentDoc?.status || null,
      paymentDocAmount: paymentDoc ? paymentAmount : null,
      paymentDocMethod: paymentDoc?.method || null,
      paymentDocGateway: paymentDoc?.gateway || null,
      completionAmountPaid: completionPaid,
      completionPaymentType: booking?.completion?.paymentType || '',
      franchiseAmount: franchise,
      bookingPrice: price,
    },
  };
};

export const serializeLedgerEntry = (e) => ({
  id: String(e._id),
  kind: e.kind,
  category: e.category,
  amount: toMoney(e.amount),
  currency: e.currency || 'MAD',
  method: e.method || null,
  status: e.status,
  occurredAt: e.occurredAt,
  reference: e.reference || '',
  notes: e.notes || '',
  createdAt: e.createdAt,
  idempotencyKey: e.idempotencyKey || '',
  links: e.links || {},
  createdBy: e.createdBy
    ? {
        id: String(e.createdBy._id || e.createdBy),
        name: e.createdBy.name || '',
        email: e.createdBy.email || '',
      }
    : null,
});

const loadPostedEntries = async (bookingId, ownerId) =>
  BookingLedgerEntry.find({
    booking: bookingId,
    owner: ownerId,
    status: 'posted',
  })
    .sort({ occurredAt: 1, createdAt: 1 })
    .populate('createdBy', 'name email')
    .lean();

const settlementToPaymentStatus = (settlementStatus) => {
  if (settlementStatus === 'paid') return 'paid';
  if (settlementStatus === 'refunded') return 'refunded';
  return 'pending';
};

/**
 * Persist booking.financial cache + sync legacy Payment + paymentStatus.
 */
export const recomputeAndSyncBookingFinancial = async (bookingId, ownerId) => {
  const booking = await Booking.findOne({ _id: bookingId, owner: ownerId });
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }

  const posted = await BookingLedgerEntry.find({
    booking: bookingId,
    owner: ownerId,
    status: 'posted',
  }).lean();

  const totals = computeTotalsFromEntries(posted);
  const depositRequired = toMoney(booking.franchiseAmount);
  const settlementStatus = deriveSettlementStatus({
    ...totals,
    paymentStatus: booking.paymentStatus,
  });
  const depositStatus = deriveDepositStatus({
    depositRequired,
    depositHeld: totals.depositHeld,
    depositReleased: totals.depositReleased,
    depositClaimed: totals.depositClaimed,
    depositHeldGross: totals.depositHeldGross,
  });

  booking.financial = {
    chargesTotal: totals.chargesTotal,
    paymentsTotal: totals.paymentsTotal,
    refundsTotal: totals.refundsTotal,
    balanceDue: totals.balanceDue,
    depositRequired,
    depositHeld: totals.depositHeld,
    depositReleased: totals.depositReleased,
    depositClaimed: totals.depositClaimed,
    depositStatus,
    settlementStatus,
    source: posted.length ? 'ledger' : (booking.financial?.source || ''),
    recomputedAt: new Date(),
  };

  if (posted.length > 0) {
    booking.paymentStatus = settlementToPaymentStatus(settlementStatus);
  }

  booking.markModified('financial');
  await booking.save();

  if (posted.length > 0) {
    try {
      await Payment.findOneAndUpdate(
        { booking: bookingId },
        {
          status: booking.paymentStatus,
          amount: totals.paymentsTotal > 0 ? totals.paymentsTotal : toMoney(booking.price),
          gateway: 'offline',
          reference: booking.reservationId || '',
        },
        { upsert: true, setDefaultsOnInsert: true },
      );
    } catch (syncErr) {
      console.error('[ledger] Payment sync failed:', syncErr.message);
    }
  }

  return {
    booking,
    totals: {
      ...totals,
      depositRequired,
      depositStatus,
      settlementStatus,
    },
    entryCount: posted.length,
  };
};

const findByIdempotency = async ({ ownerId, bookingId, idempotencyKey }) => {
  const key = String(idempotencyKey || '').trim();
  if (!key) return null;
  return BookingLedgerEntry.findOne({
    owner: ownerId,
    booking: bookingId,
    idempotencyKey: key,
  })
    .populate('createdBy', 'name email')
    .lean();
};

const assertOwnedBooking = async (bookingId, ownerId) => {
  if (!mongoose.isValidObjectId(bookingId)) {
    const err = new Error('Invalid booking ID');
    err.status = 400;
    throw err;
  }
  const booking = await Booking.findOne({ _id: bookingId, owner: ownerId });
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }
  return booking;
};

/**
 * Append a posted ledger entry (never updates historical rows).
 */
export const postLedgerEntry = async ({
  ownerId,
  bookingId,
  actorId,
  kind,
  category,
  amount,
  method = undefined,
  reference = '',
  notes = '',
  occurredAt = new Date(),
  idempotencyKey = '',
  links = {},
  allowOverpayment = false,
}) => {
  if (!LEDGER_KINDS.includes(kind)) {
    const err = new Error('Invalid ledger kind');
    err.status = 400;
    throw err;
  }
  if (!LEDGER_CATEGORIES.includes(category)) {
    const err = new Error('Invalid ledger category');
    err.status = 400;
    throw err;
  }

  const money = toMoney(amount);
  if (!(money > 0)) {
    const err = new Error('Amount must be greater than 0');
    err.status = 400;
    throw err;
  }

  const existing = await findByIdempotency({ ownerId, bookingId, idempotencyKey });
  if (existing) {
    const summary = await getBookingFinancialSummary(bookingId, ownerId);
    return { entry: serializeLedgerEntry(existing), financial: summary, duplicate: true };
  }

  await assertOwnedBooking(bookingId, ownerId);

  if (kind === 'payment' || kind === 'refund' || String(kind).startsWith('deposit_')) {
    if (!method || !PAYMENT_METHODS.has(method)) {
      const err = new Error('Payment method is required (cash, card_tpe, bank_transfer, other)');
      err.status = 400;
      throw err;
    }
  }

  if (kind === 'payment') {
    const posted = await BookingLedgerEntry.find({
      booking: bookingId,
      owner: ownerId,
      status: 'posted',
    }).lean();
    const totals = computeTotalsFromEntries(posted);
    // If no charges yet, treat booking.price as implied charge ceiling for overpay check
    const booking = await Booking.findById(bookingId).select('price').lean();
    const effectiveCharges = totals.chargesTotal > 0 ? totals.chargesTotal : toMoney(booking?.price);
    const effectiveBalance = toMoney(effectiveCharges - totals.paymentsTotal + totals.refundsTotal);
    if (!allowOverpayment && money > effectiveBalance + 0.001) {
      const err = new Error(
        `Payment exceeds balance due (${effectiveBalance}). Enable allowOverpayment to record overpayment.`,
      );
      err.status = 400;
      err.code = 'OVERPAYMENT';
      err.balanceDue = effectiveBalance;
      throw err;
    }
  }

  if (kind === 'refund') {
    const posted = await BookingLedgerEntry.find({
      booking: bookingId,
      owner: ownerId,
      status: 'posted',
    }).lean();
    const totals = computeTotalsFromEntries(posted);
    const maxRefund = toMoney(Math.max(0, totals.paymentsTotal - totals.refundsTotal));
    if (money > maxRefund + 0.001) {
      const err = new Error(`Refund exceeds net payments received (${maxRefund})`);
      err.status = 400;
      err.code = 'REFUND_EXCEEDS_PAID';
      throw err;
    }
  }

  let entry;
  try {
    entry = await BookingLedgerEntry.create({
      owner: ownerId,
      booking: bookingId,
      kind,
      category,
      amount: money,
      currency: process.env.CURRENCY || 'MAD',
      method: method || undefined,
      status: 'posted',
      occurredAt: occurredAt instanceof Date ? occurredAt : new Date(occurredAt || Date.now()),
      reference: String(reference || '').slice(0, 200),
      notes: String(notes || '').slice(0, 2000),
      idempotencyKey: String(idempotencyKey || '').trim(),
      createdBy: actorId || null,
      links: links || {},
    });
  } catch (createErr) {
    if (createErr?.code === 11000 && idempotencyKey) {
      const dup = await findByIdempotency({ ownerId, bookingId, idempotencyKey });
      if (dup) {
        const summary = await getBookingFinancialSummary(bookingId, ownerId);
        return { entry: serializeLedgerEntry(dup), financial: summary, duplicate: true };
      }
    }
    throw createErr;
  }

  await recomputeAndSyncBookingFinancial(bookingId, ownerId);

  try {
    await logAudit({
      owner: ownerId,
      actor: actorId || ownerId,
      action: `ledger.${kind}`,
      entityType: 'BookingLedgerEntry',
      entityId: entry._id,
      details: `${kind}/${category} ${money} on booking ${bookingId}`,
      meta: { bookingId: String(bookingId), kind, category, amount: money, method: method || null },
    });
  } catch {
    /* non-fatal */
  }

  const populated = await BookingLedgerEntry.findById(entry._id)
    .populate('createdBy', 'name email')
    .lean();
  const financial = await getBookingFinancialSummary(bookingId, ownerId);
  return { entry: serializeLedgerEntry(populated), financial, duplicate: false };
};

export const postOfflinePayment = async ({
  ownerId,
  bookingId,
  actorId,
  amount,
  method,
  reference,
  notes,
  occurredAt,
  idempotencyKey,
  allowOverpayment = false,
}) => {
  const booking = await assertOwnedBooking(bookingId, ownerId);
  const hasCharge = await BookingLedgerEntry.exists({
    booking: bookingId,
    owner: ownerId,
    status: 'posted',
    kind: 'charge',
  });
  if (!hasCharge) {
    await ensureRentalChargeForBooking({
      ownerId,
      bookingId,
      actorId,
      amount: booking.price,
      reservationId: booking.reservationId,
    });
  }

  return postLedgerEntry({
    ownerId,
    bookingId,
    actorId,
    kind: 'payment',
    category: 'other',
    amount,
    method,
    reference,
    notes,
    occurredAt,
    idempotencyKey,
    allowOverpayment,
    links: { type: 'offline_payment' },
  });
};

export const postCharge = async ({
  ownerId,
  bookingId,
  actorId,
  amount,
  category,
  reference,
  notes,
  occurredAt,
  idempotencyKey,
  links = {},
}) => {
  if (!CHARGE_CATEGORIES.has(category)) {
    const err = new Error('Invalid charge category');
    err.status = 400;
    throw err;
  }
  return postLedgerEntry({
    ownerId,
    bookingId,
    actorId,
    kind: 'charge',
    category,
    amount,
    reference,
    notes,
    occurredAt,
    idempotencyKey,
    links,
  });
};

export const postRefund = async ({
  ownerId,
  bookingId,
  actorId,
  amount,
  method,
  reference,
  notes,
  occurredAt,
  idempotencyKey,
}) =>
  postLedgerEntry({
    ownerId,
    bookingId,
    actorId,
    kind: 'refund',
    category: 'other',
    amount,
    method,
    reference,
    notes,
    occurredAt,
    idempotencyKey,
    links: { type: 'offline_refund' },
  });

/**
 * Idempotent rental charge seed on booking create (dual-write companion to Payment.create).
 */
export const ensureRentalChargeForBooking = async ({
  ownerId,
  bookingId,
  actorId = null,
  amount,
  reservationId = '',
}) => {
  const money = toMoney(amount);
  if (!(money > 0)) return null;
  const idempotencyKey = `rental_seed:${bookingId}`;
  return postLedgerEntry({
    ownerId,
    bookingId,
    actorId,
    kind: 'charge',
    category: 'rental',
    amount: money,
    reference: reservationId || '',
    notes: 'Initial rental charge',
    idempotencyKey,
    links: { seed: 'booking_create' },
  });
};

/**
 * When walk-in / legacy marks paid at create, seed matching payment line.
 */
export const ensureInitialPaymentForBooking = async ({
  ownerId,
  bookingId,
  actorId = null,
  amount,
  method = 'other',
  reservationId = '',
}) => {
  const money = toMoney(amount);
  if (!(money > 0)) return null;
  const idempotencyKey = `initial_payment:${bookingId}`;
  return postLedgerEntry({
    ownerId,
    bookingId,
    actorId,
    kind: 'payment',
    category: 'other',
    amount: money,
    method: PAYMENT_METHODS.has(method) ? method : 'other',
    reference: reservationId || '',
    notes: 'Initial payment at booking create',
    idempotencyKey,
    allowOverpayment: true,
    links: { seed: 'booking_create_paid' },
  });
};

export const ensureExtensionCharge = async ({
  ownerId,
  bookingId,
  actorId,
  extensionId,
  amount,
  notes = '',
}) => {
  const money = toMoney(amount);
  if (!(money > 0)) return null;
  const idempotencyKey = `extension:${extensionId}`;
  return postLedgerEntry({
    ownerId,
    bookingId,
    actorId,
    kind: 'charge',
    category: 'extension',
    amount: money,
    notes: notes || 'Contract extension',
    idempotencyKey,
    links: { extensionId: String(extensionId) },
  });
};

/**
 * Legacy paymentStatus dropdown → ledger payment for remaining balance when marking paid.
 */
export const syncLegacyPaymentStatusChange = async ({
  ownerId,
  bookingId,
  actorId,
  paymentStatus,
}) => {
  if (paymentStatus !== 'paid') {
    await recomputeAndSyncBookingFinancial(bookingId, ownerId);
    return getBookingFinancialSummary(bookingId, ownerId);
  }

  const posted = await BookingLedgerEntry.find({
    booking: bookingId,
    owner: ownerId,
    status: 'posted',
  }).lean();

  // Ensure rental charge exists so balance math is meaningful
  const booking = await Booking.findOne({ _id: bookingId, owner: ownerId }).select('price reservationId').lean();
  if (!posted.some((e) => e.kind === 'charge')) {
    await ensureRentalChargeForBooking({
      ownerId,
      bookingId,
      actorId,
      amount: booking?.price,
      reservationId: booking?.reservationId,
    });
  }

  const refreshed = await BookingLedgerEntry.find({
    booking: bookingId,
    owner: ownerId,
    status: 'posted',
  }).lean();
  const totals = computeTotalsFromEntries(refreshed);
  if (totals.balanceDue > 0.001) {
    await postOfflinePayment({
      ownerId,
      bookingId,
      actorId,
      amount: totals.balanceDue,
      method: 'other',
      notes: 'Recorded via legacy payment status → paid',
      idempotencyKey: `legacy_paid:${bookingId}:${totals.balanceDue}`,
      allowOverpayment: false,
    });
  } else {
    await recomputeAndSyncBookingFinancial(bookingId, ownerId);
  }
  return getBookingFinancialSummary(bookingId, ownerId);
};

export const deleteLedgerForBookings = async (bookingIds) => {
  const ids = (Array.isArray(bookingIds) ? bookingIds : []).filter((id) =>
    mongoose.isValidObjectId(id),
  );
  if (!ids.length) return 0;
  const result = await BookingLedgerEntry.deleteMany({ booking: { $in: ids } });
  return result.deletedCount || 0;
};

export const getBookingFinancialSummary = async (bookingId, ownerId) => {
  if (!mongoose.isValidObjectId(bookingId)) {
    const err = new Error('Invalid booking ID');
    err.status = 400;
    throw err;
  }

  const booking = await Booking.findOne({ _id: bookingId, owner: ownerId })
    .select('price paymentStatus franchiseAmount completion reservationId financial')
    .lean();

  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }

  const posted = await loadPostedEntries(bookingId, ownerId);

  if (posted.length > 0) {
    const totals = computeTotalsFromEntries(posted);
    const depositRequired = toMoney(booking.franchiseAmount);
    const settlementStatus = deriveSettlementStatus({
      ...totals,
      paymentStatus: booking.paymentStatus,
    });
    const depositStatus = deriveDepositStatus({
      depositRequired,
      depositHeld: totals.depositHeld,
      depositReleased: totals.depositReleased,
      depositClaimed: totals.depositClaimed,
      depositHeldGross: totals.depositHeldGross,
    });

    return {
      bookingId: String(booking._id),
      reservationId: booking.reservationId || '',
      source: 'ledger',
      currency: process.env.CURRENCY || 'MAD',
      chargesTotal: totals.chargesTotal,
      paymentsTotal: totals.paymentsTotal,
      refundsTotal: totals.refundsTotal,
      balanceDue: totals.balanceDue,
      depositRequired,
      depositHeld: totals.depositHeld,
      depositReleased: totals.depositReleased,
      depositClaimed: totals.depositClaimed,
      depositStatus,
      settlementStatus,
      entryCount: posted.length,
      entries: posted.map(serializeLedgerEntry),
      legacyPaymentStatus: booking.paymentStatus || 'pending',
      methods: [...LEDGER_METHODS],
      chargeCategories: [...CHARGE_CATEGORIES],
    };
  }

  const paymentDoc = await Payment.findOne({ booking: bookingId })
    .select('amount status method gateway reference')
    .lean();

  const legacy = projectLegacyFinancial(booking, paymentDoc);

  return {
    bookingId: String(booking._id),
    reservationId: booking.reservationId || '',
    currency: process.env.CURRENCY || 'MAD',
    entryCount: 0,
    entries: [],
    legacyPaymentStatus: booking.paymentStatus || 'pending',
    methods: [...LEDGER_METHODS],
    chargeCategories: [...CHARGE_CATEGORIES],
    ...legacy,
  };
};

export default {
  getBookingFinancialSummary,
  computeTotalsFromEntries,
  projectLegacyFinancial,
  deriveSettlementStatus,
  deriveDepositStatus,
  serializeLedgerEntry,
  postLedgerEntry,
  postOfflinePayment,
  postCharge,
  postRefund,
  ensureRentalChargeForBooking,
  ensureInitialPaymentForBooking,
  ensureExtensionCharge,
  syncLegacyPaymentStatusChange,
  recomputeAndSyncBookingFinancial,
  deleteLedgerForBookings,
  toMoney,
};
