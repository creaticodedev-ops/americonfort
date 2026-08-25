/**
 * Phase 3 verification: deposit + inspections + gates (unit + optional DB).
 */
import mongoose from 'mongoose';
import {
  computeTotalsFromEntries,
  ensureRentalChargeForBooking,
  postOfflinePayment,
  postCharge,
  getBookingFinancialSummary,
} from '../services/bookingLedgerService.js';
import { holdDeposit, releaseDeposit, claimDeposit } from '../services/depositService.js';
import {
  getOrCreateDraftInspection,
  updateDraftInspection,
  completeInspection,
  hasCompletedInspection,
} from '../services/inspectionService.js';
import { assertCanStartRental, assertCanCompleteRental } from '../services/deskWorkflowService.js';

const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}${detail ? ` — ${detail}` : ''}`);
};

const runUnit = () => {
  const totals = computeTotalsFromEntries([
    { kind: 'charge', amount: 1000 },
    { kind: 'deposit_hold', amount: 2000 },
    { kind: 'payment', amount: 1000 },
    { kind: 'deposit_claim', amount: 300 },
    { kind: 'deposit_release', amount: 1700 },
  ]);
  record(
    'Unit: deposit held math',
    totals.depositHeld === 0 && totals.balanceDue === 0,
    `held=${totals.depositHeld} balance=${totals.balanceDue}`,
  );
};

const runDb = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    record('DB suite', false, 'MONGODB_URI missing — skipped remaining DB tests');
    return;
  }
  try {
    await mongoose.connect(uri);
  } catch (e) {
    record('DB connect', false, e.message);
    return;
  }
  record('DB connect', true);

  const Booking = (await import('../models/Booking.js')).default;
  const Payment = (await import('../models/Payment.js')).default;
  const Car = (await import('../models/Car.js')).default;
  const User = (await import('../models/User.js')).default;
  const BookingLedgerEntry = (await import('../models/BookingLedgerEntry.js')).default;
  const RentalInspection = (await import('../models/RentalInspection.js')).default;

  const owner = await User.findOne({ role: 'owner' }).select('_id');
  const car = owner ? await Car.findOne({ owner: owner._id }).select('_id mileage') : null;
  if (!owner || !car) {
    record('DB fixtures', false, 'Need owner + car');
    await mongoose.disconnect();
    return;
  }
  record('DB fixtures', true);

  const reservationId = `P3-${Date.now()}`;
  const booking = await Booking.create({
    reservationId,
    car: car._id,
    owner: owner._id,
    pickupDate: new Date(Date.now() - 3600_000),
    returnDate: new Date(Date.now() - 600_000),
    price: 1000,
    customerName: 'Phase3 Test',
    customerEmail: `p3-${Date.now()}@example.com`,
    customerPhone: '+212600000001',
    paymentStatus: 'pending',
    status: 'ready_for_pickup',
    channel: 'walk_in',
    franchiseAmount: 2000,
  });
  await Payment.create({ booking: booking._id, amount: 1000, status: 'pending', gateway: 'offline' });
  await ensureRentalChargeForBooking({
    ownerId: owner._id,
    bookingId: booking._id,
    actorId: owner._id,
    amount: 1000,
    reservationId,
  });

  // Gate: cannot start without pickup + deposit
  let gate = await assertCanStartRental(booking, owner._id, { force: false });
  record('Gate: start blocked without pickup/deposit', !gate.ok, (gate.blockers || []).join(','));

  // Pickup inspection
  let pickup = await getOrCreateDraftInspection({
    bookingId: booking._id,
    ownerId: owner._id,
    actorId: owner._id,
    type: 'pickup',
  });
  pickup = await updateDraftInspection({
    inspectionId: pickup.id,
    ownerId: owner._id,
    actorId: owner._id,
    patch: { odometer: 10000, fuelLevel: 'full', conditionNotes: 'OK', checklist: { keys: true, papers: true } },
  });
  const pickupDone = await completeInspection({
    inspectionId: pickup.id,
    ownerId: owner._id,
    actorId: owner._id,
  });
  record('Pickup inspection complete', pickupDone.inspection?.status === 'completed');

  const bookingAfterPickup = await Booking.findById(booking._id).lean();
  record(
    'Mirror kmDepart/fuelLevelStart',
    bookingAfterPickup.kmDepart === '10000' && Boolean(bookingAfterPickup.fuelLevelStart),
    `${bookingAfterPickup.kmDepart}/${bookingAfterPickup.fuelLevelStart}`,
  );

  // Deposit hold
  const hold = await holdDeposit({
    ownerId: owner._id,
    bookingId: booking._id,
    actorId: owner._id,
    amount: 2000,
    method: 'cash',
    idempotencyKey: `hold-${booking._id}`,
  });
  record('Deposit hold', hold.financial?.depositHeld === 2000, `held=${hold.financial?.depositHeld}`);

  const holdDup = await holdDeposit({
    ownerId: owner._id,
    bookingId: booking._id,
    actorId: owner._id,
    amount: 2000,
    method: 'cash',
    idempotencyKey: `hold-${booking._id}`,
  });
  record('Deposit hold idempotent', holdDup.duplicate === true);

  gate = await assertCanStartRental(booking, owner._id, { force: false });
  record('Gate: start allowed after pickup+hold', gate.ok === true);

  // Pay rental
  await postOfflinePayment({
    ownerId: owner._id,
    bookingId: booking._id,
    actorId: owner._id,
    amount: 1000,
    method: 'card_tpe',
    idempotencyKey: `pay-${booking._id}`,
  });

  // Return inspection + damage
  let ret = await getOrCreateDraftInspection({
    bookingId: booking._id,
    ownerId: owner._id,
    actorId: owner._id,
    type: 'return',
  });
  ret = await updateDraftInspection({
    inspectionId: ret.id,
    ownerId: owner._id,
    actorId: owner._id,
    patch: {
      odometer: 10120,
      fuelLevel: 'half',
      damages: [{ area: 'Bumper', severity: 'minor', description: 'Scratch', estimatedCost: 300 }],
    },
  });
  const retDone = await completeInspection({
    inspectionId: ret.id,
    ownerId: owner._id,
    actorId: owner._id,
    postDamageCharges: true,
  });
  record('Return inspection complete', retDone.inspection?.status === 'completed');
  record(
    'Damage charge from inspection',
    (retDone.damageCharges || []).length >= 1,
    `charges=${(retDone.damageCharges || []).length}`,
  );

  const afterDamage = await getBookingFinancialSummary(booking._id, owner._id);
  record('Balance includes damage', afterDamage.balanceDue === 300, `due=${afterDamage.balanceDue}`);

  // Fuel / late / extra charges
  await postCharge({
    ownerId: owner._id,
    bookingId: booking._id,
    actorId: owner._id,
    amount: 50,
    category: 'fuel',
    idempotencyKey: `fuel-${booking._id}`,
  });
  await postCharge({
    ownerId: owner._id,
    bookingId: booking._id,
    actorId: owner._id,
    amount: 100,
    category: 'late_fee',
    idempotencyKey: `late-${booking._id}`,
  });
  await postCharge({
    ownerId: owner._id,
    bookingId: booking._id,
    actorId: owner._id,
    amount: 25,
    category: 'extra',
    idempotencyKey: `extra-${booking._id}`,
  });

  let fin = await getBookingFinancialSummary(booking._id, owner._id);
  record('Fuel/late/extra charges', fin.balanceDue === 475, `due=${fin.balanceDue}`);

  // Partial claim then release
  const claim = await claimDeposit({
    ownerId: owner._id,
    bookingId: booking._id,
    actorId: owner._id,
    amount: 475,
    method: 'cash',
    applyAsPayment: true,
    idempotencyKey: `claim-${booking._id}`,
  });
  record(
    'Partial deposit claim + apply as payment',
    claim.financial?.balanceDue === 0 && claim.financial?.depositHeld === 1525,
    `due=${claim.financial?.balanceDue} held=${claim.financial?.depositHeld}`,
  );

  const release = await releaseDeposit({
    ownerId: owner._id,
    bookingId: booking._id,
    actorId: owner._id,
    amount: 1525,
    method: 'cash',
    idempotencyKey: `rel-${booking._id}`,
  });
  record('Full remaining deposit release', release.financial?.depositHeld === 0, `held=${release.financial?.depositHeld}`);

  gate = await assertCanCompleteRental(booking, owner._id, { force: false });
  record('Gate: complete allowed after settlement', gate.ok === true);

  const pickupExists = await hasCompletedInspection(booking._id, owner._id, 'pickup');
  const returnExists = await hasCompletedInspection(booking._id, owner._id, 'return');
  record('Persistence: inspections remain', pickupExists && returnExists);

  // Cleanup
  await RentalInspection.deleteMany({ booking: booking._id });
  await BookingLedgerEntry.deleteMany({ booking: booking._id });
  await Payment.deleteMany({ booking: booking._id });
  await Booking.deleteOne({ _id: booking._id });

  record('Cleanup test booking', true);
  await mongoose.disconnect();
};

runUnit();
runDb()
  .catch(async (err) => {
    record('DB suite crashed', false, err.message);
    try { await mongoose.disconnect(); } catch { /* */ }
  })
  .finally(() => {
    const failed = results.filter((r) => !r.ok).length;
    console.log('\n--- Summary ---');
    console.log(`Total: ${results.length} · PASS: ${results.length - failed} · FAIL: ${failed}`);
    process.exit(failed ? 1 : 0);
  });
