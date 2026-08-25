/**
 * Security deposit lifecycle (offline) — hold / release / claim.
 * Uses BookingLedgerEntry deposit_* kinds. franchiseAmount = depositRequired.
 */

import {
  postLedgerEntry,
  getBookingFinancialSummary,
  recomputeAndSyncBookingFinancial,
  toMoney,
} from './bookingLedgerService.js';
import Booking from '../models/Booking.js';
import { LEDGER_METHODS } from '../models/BookingLedgerEntry.js';

const METHODS = new Set(LEDGER_METHODS);

const requireMethod = (method) => {
  if (!method || !METHODS.has(method)) {
    const err = new Error('Payment method is required (cash, card_tpe, bank_transfer, other)');
    err.status = 400;
    throw err;
  }
};

export const holdDeposit = async ({
  ownerId,
  bookingId,
  actorId,
  amount,
  method,
  reference = '',
  notes = '',
  idempotencyKey = '',
  occurredAt,
}) => {
  requireMethod(method);
  const booking = await Booking.findOne({ _id: bookingId, owner: ownerId }).select('franchiseAmount reservationId');
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }

  const required = toMoney(booking.franchiseAmount);
  const money = amount != null && amount !== '' ? toMoney(amount) : required;
  if (!(money > 0)) {
    const err = new Error('Deposit hold amount must be greater than 0');
    err.status = 400;
    throw err;
  }

  const result = await postLedgerEntry({
    ownerId,
    bookingId,
    actorId,
    kind: 'deposit_hold',
    category: 'security_deposit',
    amount: money,
    method,
    reference,
    notes: notes || 'Security deposit hold',
    idempotencyKey: idempotencyKey || `deposit_hold:${bookingId}:${money}:${method}`,
    occurredAt,
    links: { type: 'deposit_hold' },
  });

  return result;
};

export const releaseDeposit = async ({
  ownerId,
  bookingId,
  actorId,
  amount,
  method,
  reference = '',
  notes = '',
  idempotencyKey = '',
  occurredAt,
}) => {
  requireMethod(method);
  const summary = await getBookingFinancialSummary(bookingId, ownerId);
  const held = toMoney(summary.depositHeld);
  if (held <= 0) {
    const err = new Error('No deposit held to release');
    err.status = 400;
    err.code = 'NO_DEPOSIT_HELD';
    throw err;
  }

  const money = amount != null && amount !== '' ? toMoney(amount) : held;
  if (!(money > 0)) {
    const err = new Error('Release amount must be greater than 0');
    err.status = 400;
    throw err;
  }
  if (money > held + 0.001) {
    const err = new Error(`Cannot release more than held (${held})`);
    err.status = 400;
    err.code = 'RELEASE_EXCEEDS_HELD';
    throw err;
  }

  return postLedgerEntry({
    ownerId,
    bookingId,
    actorId,
    kind: 'deposit_release',
    category: 'security_deposit',
    amount: money,
    method,
    reference,
    notes: notes || 'Security deposit release',
    idempotencyKey: idempotencyKey || `deposit_release:${bookingId}:${money}:${Date.now()}`,
    occurredAt,
    links: { type: 'deposit_release' },
  });
};

/**
 * Claim/deduct from held deposit. Optionally apply claimed amount as payment toward balanceDue.
 */
export const claimDeposit = async ({
  ownerId,
  bookingId,
  actorId,
  amount,
  method,
  reference = '',
  notes = '',
  idempotencyKey = '',
  occurredAt,
  applyAsPayment = true,
}) => {
  requireMethod(method);
  const summary = await getBookingFinancialSummary(bookingId, ownerId);
  const held = toMoney(summary.depositHeld);
  if (held <= 0) {
    const err = new Error('No deposit held to claim');
    err.status = 400;
    err.code = 'NO_DEPOSIT_HELD';
    throw err;
  }

  const money = amount != null && amount !== '' ? toMoney(amount) : held;
  if (!(money > 0)) {
    const err = new Error('Claim amount must be greater than 0');
    err.status = 400;
    throw err;
  }
  if (money > held + 0.001) {
    const err = new Error(`Cannot claim more than held (${held})`);
    err.status = 400;
    err.code = 'CLAIM_EXCEEDS_HELD';
    throw err;
  }

  const claimKey = String(idempotencyKey || '').trim() || `deposit_claim:${bookingId}:${money}`;
  const claimResult = await postLedgerEntry({
    ownerId,
    bookingId,
    actorId,
    kind: 'deposit_claim',
    category: 'security_deposit',
    amount: money,
    method,
    reference,
    notes: notes || 'Security deposit claim / deduction',
    idempotencyKey: claimKey,
    occurredAt,
    links: { type: 'deposit_claim' },
  });

  let paymentResult = null;
  if (applyAsPayment && !claimResult.duplicate) {
    const after = claimResult.financial || (await getBookingFinancialSummary(bookingId, ownerId));
    const due = toMoney(after.balanceDue);
    const apply = toMoney(Math.min(money, Math.max(0, due)));
    if (apply > 0) {
      paymentResult = await postLedgerEntry({
        ownerId,
        bookingId,
        actorId,
        kind: 'payment',
        category: 'other',
        amount: apply,
        method,
        reference: reference || 'From deposit claim',
        notes: 'Applied from security deposit claim',
        idempotencyKey: `deposit_claim_pay:${claimKey}`,
        allowOverpayment: false,
        links: {
          type: 'deposit_claim_payment',
          claimEntryId: claimResult.entry?.id,
        },
      });
    }
  } else {
    await recomputeAndSyncBookingFinancial(bookingId, ownerId);
  }

  const financial = paymentResult?.financial
    || claimResult.financial
    || (await getBookingFinancialSummary(bookingId, ownerId));

  return {
    entry: claimResult.entry,
    paymentEntry: paymentResult?.entry || null,
    financial,
    duplicate: Boolean(claimResult.duplicate),
  };
};

export default {
  holdDeposit,
  releaseDeposit,
  claimDeposit,
};
