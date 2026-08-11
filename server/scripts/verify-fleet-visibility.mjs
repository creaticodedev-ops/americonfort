/**
 * Regression: fleet website visibility (visibleOnWebsite) is independent of
 * isAvaliable/status and is enforced on all public catalog surfaces.
 *
 * Run: node scripts/verify-fleet-visibility.mjs
 */
import {
  PUBLIC_VISIBLE_CAR_FILTER,
  buildPublicVisibleCarFilter,
  isPubliclyVisibleCar,
  groupCarsForCatalog,
} from '../utils/carCatalog.js';
import { invalidateBookableOwnerCache } from '../services/agencyService.js';

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
};

assert(PUBLIC_VISIBLE_CAR_FILTER.visibleOnWebsite.$ne === false, 'public filter excludes visibleOnWebsite=false');
assert(PUBLIC_VISIBLE_CAR_FILTER.isAvaliable === true, 'public filter still requires isAvaliable');
assert(PUBLIC_VISIBLE_CAR_FILTER.status.$ne === 'maintenance', 'public filter still excludes maintenance');

assert(
  isPubliclyVisibleCar({
    isAvaliable: true,
    owner: 'abc',
    status: 'available',
    visibleOnWebsite: true,
  }) === true,
  'visible + available car is public',
);

assert(
  isPubliclyVisibleCar({
    isAvaliable: true,
    owner: 'abc',
    status: 'available',
  }) === true,
  'legacy car without visibleOnWebsite stays public',
);

assert(
  isPubliclyVisibleCar({
    isAvaliable: true,
    owner: 'abc',
    status: 'available',
    visibleOnWebsite: false,
  }) === false,
  'hidden car is not public',
);

assert(
  isPubliclyVisibleCar({
    isAvaliable: false,
    owner: 'abc',
    status: 'available',
    visibleOnWebsite: true,
  }) === false,
  'offline car is not public even if visible flag true',
);

assert(
  isPubliclyVisibleCar({
    isAvaliable: true,
    owner: 'abc',
    status: 'maintenance',
    visibleOnWebsite: true,
  }) === false,
  'maintenance car is not public',
);

const grouped = groupCarsForCatalog([
  {
    _id: '1',
    owner: 'o1',
    brand: 'Dacia',
    model: 'Duster',
    year: 2024,
    category: 'SUV',
    seating_capacity: 5,
    fuel_type: 'Diesel',
    transmission: 'Manual',
    pricePerDay: 400,
    isAvaliable: true,
    status: 'available',
  },
]);
assert(grouped.length === 1, 'catalog grouping still works');

console.log('\nFleet visibility unit checks passed.');

// Optional DB integration
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.log('Skip DB integration (no MONGODB_URI)');
  process.exit(0);
}

const mongoose = (await import('mongoose')).default;
const { buildMongoUri } = await import('../configs/db.js');
const Car = (await import('../models/Car.js')).default;
const User = (await import('../models/User.js')).default;

await mongoose.connect(buildMongoUri(uri));
const stamp = Date.now();

const owner = await User.create({
  name: `Visibility Owner ${stamp}`,
  email: `vis-owner-${stamp}@test.local`,
  password: 'x'.repeat(60),
  role: 'owner',
  accountStatus: 'active',
  licenseStatus: 'active',
  licensedAt: new Date(),
});
invalidateBookableOwnerCache();

const visible = await Car.create({
  owner: owner._id,
  brand: 'Toyota',
  model: `VisVisible-${stamp}`,
  year: 2024,
  category: 'Sedan',
  seating_capacity: 5,
  fuel_type: 'Petrol',
  transmission: 'Automatic',
  pricePerDay: 350,
  description: 'visible test car',
  isAvaliable: true,
  status: 'available',
  visibleOnWebsite: true,
});

const hidden = await Car.create({
  owner: owner._id,
  brand: 'Toyota',
  model: `VisHidden-${stamp}`,
  year: 2024,
  category: 'Sedan',
  seating_capacity: 5,
  fuel_type: 'Petrol',
  transmission: 'Automatic',
  pricePerDay: 360,
  description: 'hidden test car',
  isAvaliable: true,
  status: 'available',
  visibleOnWebsite: false,
});

const publicList = await Car.find(await buildPublicVisibleCarFilter())
  .select('_id model visibleOnWebsite isAvaliable')
  .lean();

assert(
  publicList.some((c) => String(c._id) === String(visible._id)),
  'visible car appears in public filter query',
);
assert(
  !publicList.some((c) => String(c._id) === String(hidden._id)),
  'hidden car excluded from public filter query',
);

// Suspended agencies must leave the public catalog
owner.accountStatus = 'suspended';
await owner.save();
invalidateBookableOwnerCache();
const afterSuspend = await Car.find(await buildPublicVisibleCarFilter())
  .select('_id')
  .lean();
assert(
  !afterSuspend.some((c) => String(c._id) === String(visible._id)),
  'suspended owner cars excluded from public catalog',
);

owner.accountStatus = 'active';
await owner.save();
invalidateBookableOwnerCache();

// Hiding must not mutate availability/pricing
hidden.visibleOnWebsite = true;
await hidden.save();
const restored = await Car.findById(hidden._id).lean();
assert(restored.visibleOnWebsite === true, 'can restore visibility');
assert(restored.isAvaliable === true, 'restoring visibility does not change isAvaliable');
assert(restored.pricePerDay === 360, 'restoring visibility does not change price');

await Car.deleteMany({ _id: { $in: [visible._id, hidden._id] } });
await User.deleteOne({ _id: owner._id });
await mongoose.disconnect();

console.log('\nFleet visibility DB checks passed.');
process.exit(0);
