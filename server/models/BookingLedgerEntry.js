import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Append-only offline financial ledger for a booking.
 * Source of truth for money movements once entries exist.
 * Legacy Payment (1:1) remains until dual-write + migration complete.
 *
 * amount is always >= 0; direction/meaning comes from `kind`.
 */
export const LEDGER_KINDS = Object.freeze([
  'charge',
  'payment',
  'refund',
  'deposit_hold',
  'deposit_release',
  'deposit_claim',
]);

export const LEDGER_CATEGORIES = Object.freeze([
  'rental',
  'extension',
  'delivery',
  'second_driver',
  'late_fee',
  'fuel',
  'damage',
  'extra',
  'cancellation',
  'security_deposit',
  'adjustment',
  'other',
]);

export const LEDGER_METHODS = Object.freeze([
  'cash',
  'card_tpe',
  'bank_transfer',
  'other',
]);

const bookingLedgerEntrySchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true, index: true },
    booking: { type: ObjectId, ref: 'Booking', required: true, index: true },
    kind: {
      type: String,
      enum: LEDGER_KINDS,
      required: true,
    },
    category: {
      type: String,
      enum: LEDGER_CATEGORIES,
      required: true,
      default: 'other',
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'MAD' },
    /** Required for payment / refund / deposit_* ; omit/empty for charges */
    method: {
      type: String,
      enum: LEDGER_METHODS,
      default: undefined,
    },
    status: {
      type: String,
      enum: ['posted', 'voided'],
      default: 'posted',
      index: true,
    },
    occurredAt: { type: Date, default: Date.now, index: true },
    reference: { type: String, default: '' },
    notes: { type: String, default: '' },
    /** Client/server key to prevent duplicate submissions (sparse unique per booking) */
    idempotencyKey: { type: String, default: '', trim: true },
    createdBy: { type: ObjectId, ref: 'User', default: null },
    voidedBy: { type: ObjectId, ref: 'User', default: null },
    voidedAt: { type: Date, default: null },
    voidReason: { type: String, default: '' },
    /**
     * Optional links for idempotency / audit:
     * extensionId, inspectionId, damageId, legacyPaymentId, migrationTag
     */
    links: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true },
);

bookingLedgerEntrySchema.index({ owner: 1, booking: 1, occurredAt: 1 });
bookingLedgerEntrySchema.index({ booking: 1, status: 1, kind: 1 });
bookingLedgerEntrySchema.index({ owner: 1, kind: 1, occurredAt: -1 });
bookingLedgerEntrySchema.index(
  { owner: 1, booking: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string', $gt: '' } },
  },
);

const BookingLedgerEntry = mongoose.model('BookingLedgerEntry', bookingLedgerEntrySchema);
export default BookingLedgerEntry;
