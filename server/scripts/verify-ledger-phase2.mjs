/**
 * Phase 2 offline ledger smoke test (no HTTP server).
 * Simulates: rental charge → partial cash → TPE to zero balance.
 */
import mongoose from 'mongoose';
import {
  computeTotalsFromEntries,
  deriveSettlementStatus,
  postLedgerEntry,
  ensureRentalChargeForBooking,
  postOfflinePayment,
} from '../services/bookingLedgerService.js';

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const runUnitMath = () => {
  const totals = computeTotalsFromEntries([
    { kind: 'charge', amount: 1000 },
    { kind: 'payment', amount: 400 },
    { kind: 'payment', amount: 600 },
  ]);
  assert(totals.balanceDue === 0, `expected 0 balance, got ${totals.balanceDue}`);
  assert(
    deriveSettlementStatus({ ...totals, paymentStatus: 'pending' }) === 'paid',
    'expected paid settlement',
  );
  console.log('OK unit math: charge 1000 + cash 400 + tpe 600 → balance 0');
};

const runDbFlow = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('SKIP db flow (no MONGODB_URI)');
    return;
  }
  await mongoose.connect(uri);
  const Booking = (await import('../models/Booking.js')).default;
  const Payment = (await import('../models/Payment.js')).default;
  const Car = (await import('../models/Car.js')).default;
  const User = (await import('../models/User.js')).default;
  const BookingLedgerEntry = (await import('../models/BookingLedgerEntry.js')).default;

  const owner = await User.findOne({ role: 'owner' }).select('_id');
  if (!owner) {
    console.log('SKIP db flow (no owner)');
    await mongoose.disconnect();
    return;
  }
  const car = await Car.findOne({ owner: owner._id }).select('_id');
  if (!car) {
    console.log('SKIP db flow (no car)');
    await mongoose.disconnect();
    return;
  }

  const reservationId = `LEDGER-TEST-${Date.now()}`;
  const booking = await Booking.create({
    reservationId,
    car: car._id,
    owner: owner._id,
    pickupDate: new Date(),
    returnDate: new Date(Date.now() + 86400000),
    price: 1000,
    customerName: 'Ledger Test',
    customerEmail: `ledger-test-${Date.now()}@example.com`,
    customerPhone: '+212600000000',
    paymentStatus: 'pending',
    status: 'confirmed',
    channel: 'walk_in',
    franchiseAmount: 2000,
  });

  await Payment.create({
    booking: booking._id,
    amount: 1000,
    status: 'pending',
    gateway: 'offline',
    reference: reservationId,
  });

  await ensureRentalChargeForBooking({
    ownerId: owner._id,
    bookingId: booking._id,
    actorId: owner._id,
    amount: 1000,
    reservationId,
  });

  // duplicate seed must not double charge
  await ensureRentalChargeForBooking({
    ownerId: owner._id,
    bookingId: booking._id,
    actorId: owner._id,
    amount: 1000,
    reservationId,
  });

  await postOfflinePayment({
    ownerId: owner._id,
    bookingId: booking._id,
    actorId: owner._id,
    amount: 400,
    method: 'cash',
    idempotencyKey: `test-cash-${booking._id}`,
  });

  await postOfflinePayment({
    ownerId: owner._id,
    bookingId: booking._id,
    actorId: owner._id,
    amount: 600,
    method: 'card_tpe',
    idempotencyKey: `test-tpe-${booking._id}`,
  });

  // duplicate payment key
  const dup = await postOfflinePayment({
    ownerId: owner._id,
    bookingId: booking._id,
    actorId: owner._id,
    amount: 600,
    method: 'card_tpe',
    idempotencyKey: `test-tpe-${booking._id}`,
  });
  assert(dup.duplicate === true, 'expected duplicate payment short-circuit');

  const entries = await BookingLedgerEntry.find({ booking: booking._id, status: 'posted' }).lean();
  const charges = entries.filter((e) => e.kind === 'charge');
  const payments = entries.filter((e) => e.kind === 'payment');
  assert(charges.length === 1, `expected 1 rental charge, got ${charges.length}`);
  assert(payments.length === 2, `expected 2 payments, got ${payments.length}`);

  const refreshed = await Booking.findById(booking._id).lean();
  assert(refreshed.paymentStatus === 'paid', `expected paid, got ${refreshed.paymentStatus}`);
  assert(Number(refreshed.financial?.balanceDue) === 0, `expected balanceDue 0, got ${refreshed.financial?.balanceDue}`);

  const payDoc = await Payment.findOne({ booking: booking._id }).lean();
  assert(payDoc?.status === 'paid', 'Payment doc should be paid');

  await BookingLedgerEntry.deleteMany({ booking: booking._id });
  await Payment.deleteMany({ booking: booking._id });
  await Booking.deleteOne({ _id: booking._id });

  console.log('OK db flow: rental + cash 400 + TPE 600 → balance 0, Payment synced, idempotent');
  await mongoose.disconnect();
};

runUnitMath();
runDbFlow().catch(async (err) => {
  console.error('FAIL', err);
  try { await mongoose.disconnect(); } catch { /* */ }
  process.exit(1);
});
