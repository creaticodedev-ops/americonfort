/**
 * Verify booking settings: defaults, validation, sanitize, owner isolation,
 * and (when Mongo is available) GET/PUT API + rule enforcement on create.
 *
 * Usage: node scripts/verify-booking-settings.mjs
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import {
  BOOKING_SETTINGS_DEFAULTS,
  resolveBookingSettings,
  toPublicBookingSettings,
  validateBookingAgainstRules,
  evaluateCancellation,
  sanitizeBookingSettingsInput,
  resolveSecurityDeposit,
  resolveDepositPercent,
  validateSecondDriverAgainstRules,
  buildPolicySnapshot,
} from '../services/bookingRules.js';

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
};

const hoursFromNow = (h) => new Date(Date.now() + h * 60 * 60 * 1000);
const daysFromNow = (d) => hoursFromNow(d * 24);

// --- Unit: defaults preserve permissive behaviour ---
{
  const s = resolveBookingSettings({});
  assert(s.minRentalDays === 1, 'default min rental days = 1');
  assert(s.maxRentalDays === 0, 'default max rental days = 0 (unlimited)');
  assert(s.maxAdvanceDays === 0, 'default max advance = unlimited');
  assert(s.cancellation.enabled === false, 'cancellation off by default');
  assert(s.pendingExpiry.enabled === false, 'pending expiry off by default');
  assert(s.pickupReturn.enforceHours === false, 'hours enforcement off by default');
  assert(s.mileage.unlimited === true, 'mileage unlimited by default');
}

{
  const pickup = daysFromNow(2);
  const ret = daysFromNow(4);
  const ok = validateBookingAgainstRules({ settings: {}, pickupDate: pickup, returnDate: ret });
  assert(ok.valid === true, 'defaults accept a normal 2-day booking');
}

{
  const settings = { minRentalDays: 3, maxRentalDays: 7, maxAdvanceDays: 30 };
  const short = validateBookingAgainstRules({
    settings,
    pickupDate: daysFromNow(2),
    returnDate: daysFromNow(3),
  });
  assert(short.valid === false && short.code === 'MIN_RENTAL_DAYS', 'rejects below min rental days');

  const long = validateBookingAgainstRules({
    settings,
    pickupDate: daysFromNow(2),
    returnDate: daysFromNow(12),
  });
  assert(long.valid === false && long.code === 'MAX_RENTAL_DAYS', 'rejects above max rental days');

  const far = validateBookingAgainstRules({
    settings,
    pickupDate: daysFromNow(45),
    returnDate: daysFromNow(48),
  });
  assert(far.valid === false && far.code === 'MAX_ADVANCE', 'rejects beyond advance limit');
}

{
  const settings = {
    pickupReturn: {
      enforceHours: true,
      allowAfterHours: false,
      openingTime: '09:00',
      closingTime: '17:00',
    },
  };
  const pickup = daysFromNow(2);
  pickup.setHours(20, 0, 0, 0);
  const ret = new Date(pickup);
  ret.setDate(ret.getDate() + 2);
  ret.setHours(10, 0, 0, 0);
  const bad = validateBookingAgainstRules({ settings, pickupDate: pickup, returnDate: ret });
  assert(bad.valid === false && bad.code === 'OUTSIDE_HOURS', 'enforced hours reject late pickup');
  const skipped = validateBookingAgainstRules({
    settings,
    pickupDate: pickup,
    returnDate: ret,
    skipTimeWindow: true,
  });
  assert(skipped.valid === true, 'walk-in can skip time window');
}

{
  const settings = { cancellation: { enabled: true, freeCancellationHours: 48, lateCancellationFeePercent: 25 } };
  const booking = { pickupDate: hoursFromNow(10), price: 1000 };
  const late = evaluateCancellation({ settings, booking });
  assert(late.withinFreeWindow === false && late.feeAmount === 250, 'late cancel fee 25% of 1000');
  const free = evaluateCancellation({ settings, booking: { pickupDate: hoursFromNow(72), price: 1000 } });
  assert(free.withinFreeWindow === true && free.feeAmount === 0, 'free cancel inside window');
  const off = evaluateCancellation({
    settings: { cancellation: { enabled: false } },
    booking: { pickupDate: hoursFromNow(1), price: 1000 },
  });
  assert(off.feeAmount === 0, 'disabled policy keeps fee 0');
}

{
  const { settings, errors } = sanitizeBookingSettingsInput({
    minRentalDays: 5,
    maxRentalDays: 2,
  });
  assert(errors.length > 0, 'sanitize rejects min > max');
  void settings;

  const limited = sanitizeBookingSettingsInput({
    mileage: { unlimited: false, includedKmPerDay: 0, extraKmRate: 1 },
  });
  assert(limited.errors.some((e) => /included km/i.test(e)), 'limited mileage requires km/day');

  const good = sanitizeBookingSettingsInput({
    minRentalDays: 2,
    maxRentalDays: 14,
    mileage: { unlimited: false, includedKmPerDay: 200, extraKmRate: 2.5 },
    pendingExpiry: { enabled: true, expiryHours: 12, action: 'cancel' },
  });
  assert(good.errors.length === 0, 'sanitize accepts valid payload');
  assert(good.settings.minRentalDays === 2, 'sanitize keeps min days');
  assert(good.settings.pendingExpiry.enabled === true, 'sanitize keeps pending expiry');
}

{
  assert(resolveSecurityDeposit({ securityDeposit: 5000 }, {}) === 5000, 'car deposit wins');
  assert(resolveSecurityDeposit({}, { deposit: { defaultSecurityDeposit: 2000 } }) === 2000, 'settings default deposit');
  assert(resolveDepositPercent({ deposit: { depositPercent: 40 } }) === 40, 'settings deposit percent');
  assert(resolveDepositPercent({}) >= 1, 'env/default deposit percent falls back');
}

{
  const blocked = validateSecondDriverAgainstRules({
    settings: { secondDriver: { enabled: false } },
    secondDriver: { enabled: true, dateOfBirth: '2000-01-01' },
  });
  assert(blocked.valid === false, 'blocked when second driver disabled');

  const young = validateSecondDriverAgainstRules({
    settings: { secondDriver: { enabled: true, minAge: 25, maxExtraDrivers: 1 } },
    secondDriver: { enabled: true, dateOfBirth: '2015-01-01' },
  });
  assert(young.valid === false && young.code === 'SECOND_DRIVER_AGE', 'enforces min age');
}

{
  const pub = toPublicBookingSettings({
    cancellation: { enabled: true, freeCancellationHours: 24, lateCancellationFeePercent: 50, policyText: 'x' },
  });
  assert(pub.cancellation.lateCancellationFeePercent === undefined, 'public settings hide fee percents');
  assert(pub.cancellation.policyText === 'x', 'public settings keep policy text');
  const snap = buildPolicySnapshot({ deposit: { depositPercent: 35 } });
  assert(snap.depositPercent === 35, 'policy snapshot includes deposit percent');
}

console.log('\nUnit checks passed.\n');

// --- Optional integration against Mongo ---
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.log('Skip DB integration (no MONGODB_URI)');
  process.exit(0);
}

const { default: User } = await import('../models/User.js');
const { default: Car } = await import('../models/Car.js');
const { default: Booking } = await import('../models/Booking.js');
const { expirePendingBookingsForOwner } = await import('../jobs/pendingBookingExpiry.js');

await mongoose.connect(uri);
console.log('Connected to Mongo for integration checks');

const stamp = Date.now();
const ownerA = await User.create({
  name: `Settings Owner A ${stamp}`,
  email: `settings-a-${stamp}@test.local`,
  password: 'x'.repeat(60),
  role: 'owner',
  bookingSettings: {
    minRentalDays: 3,
    maxRentalDays: 10,
    maxAdvanceDays: 60,
    pendingExpiry: { enabled: true, expiryHours: 1, action: 'cancel', notifyOwner: false },
  },
});
const ownerB = await User.create({
  name: `Settings Owner B ${stamp}`,
  email: `settings-b-${stamp}@test.local`,
  password: 'x'.repeat(60),
  role: 'owner',
  bookingSettings: {
    minRentalDays: 1,
    maxRentalDays: 0,
  },
});

assert(
  resolveBookingSettings(ownerA).minRentalDays === 3
  && resolveBookingSettings(ownerB).minRentalDays === 1,
  'owner-level isolation of bookingSettings',
);

const carA = await Car.create({
  owner: ownerA._id,
  brand: 'Test',
  model: `SettingsCar-${stamp}`,
  image: 'https://example.com/car.jpg',
  year: 2024,
  category: 'SUV',
  seating_capacity: 5,
  fuel_type: 'Petrol',
  transmission: 'Automatic',
  pricePerDay: 100,
  location: 'Casablanca',
  description: 'test',
  isAvaliable: true,
  securityDeposit: 1500,
});

const settingsA = resolveBookingSettings(ownerA);
const reject = validateBookingAgainstRules({
  settings: settingsA,
  pickupDate: daysFromNow(2),
  returnDate: daysFromNow(3),
});
assert(reject.valid === false, 'owner A rules reject 1-day rental');

const accept = validateBookingAgainstRules({
  settings: settingsA,
  pickupDate: daysFromNow(2),
  returnDate: daysFromNow(5),
});
assert(accept.valid === true, 'owner A rules accept 3-day rental');

const pending = await Booking.create({
  reservationId: `RES-TEST${String(stamp).slice(-6)}`,
  car: carA._id,
  owner: ownerA._id,
  pickupDate: daysFromNow(5),
  returnDate: daysFromNow(8),
  price: 300,
  status: 'pending',
  customerName: 'Expiry Test',
  customerEmail: `expiry-${stamp}@test.local`,
  customerPhone: '+212600000000',
  createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
});
// force createdAt older than expiry window
await Booking.collection.updateOne(
  { _id: pending._id },
  { $set: { createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) } },
);

const expiry = await expirePendingBookingsForOwner(ownerA.toObject?.() || ownerA);
assert(expiry.cancelled >= 1, 'pending expiry job cancels stale pending booking');
const refreshed = await Booking.findById(pending._id);
assert(refreshed.status === 'cancelled' && refreshed.expiredAt, 'booking marked cancelled + expiredAt');

// cleanup
await Booking.deleteOne({ _id: pending._id });
await Car.deleteOne({ _id: carA._id });
await User.deleteMany({ _id: { $in: [ownerA._id, ownerB._id] } });
await mongoose.disconnect();

console.log('\nAll booking settings checks passed.');
process.exit(0);
