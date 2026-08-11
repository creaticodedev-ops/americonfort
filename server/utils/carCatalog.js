import Car from '../models/Car.js';
import Booking from '../models/Booking.js';
import {
  getBookableOwnerIds,
  isOwnerPubliclyBookable,
} from '../services/agencyService.js';

/**
 * Fields required by the public website (CarCard, Cars filters, CarDetails)
 * plus owner/status needed for grouping and availability filtering.
 * Excludes fleet ops PII: vin, licensePlate, fleetId, mileage, deposits, maintenance, etc.
 */
export const PUBLIC_CATALOG_FIELDS = [
  '_id',
  'owner',
  'brand',
  'model',
  'year',
  'category',
  'image',
  'images',
  'seating_capacity',
  'fuel_type',
  'transmission',
  'pricePerDay',
  'locations',
  'location',
  'description',
  'features',
  'isAvaliable',
  'status',
].join(' ');

/**
 * Public catalog / search / details / booking assignment filter (car fields only).
 * Always combine with `buildPublicVisibleCarFilter()` so suspended/pending/expired
 * agencies are excluded from the website.
 * `visibleOnWebsite: { $ne: false }` keeps legacy documents (missing field) visible.
 */
export const PUBLIC_VISIBLE_CAR_FILTER = {
  isAvaliable: true,
  owner: { $ne: null },
  status: { $ne: 'maintenance' },
  visibleOnWebsite: { $ne: false },
};

/** Car-level + owner bookable gate for Mongo queries. */
export const buildPublicVisibleCarFilter = async (extra = {}) => {
  const ownerIds = await getBookableOwnerIds();
  if (!ownerIds.length) {
    return { ...PUBLIC_VISIBLE_CAR_FILTER, ...extra, _id: { $exists: false } };
  }
  return {
    ...PUBLIC_VISIBLE_CAR_FILTER,
    ...extra,
    owner: { $in: ownerIds },
  };
};

export const isPubliclyVisibleCar = (car, owner = null) => {
  if (!car) return false;
  if (!car.isAvaliable) return false;
  if (!car.owner) return false;
  if (car.status === 'maintenance') return false;
  if (car.visibleOnWebsite === false) return false;
  if (owner && !isOwnerPubliclyBookable(owner)) return false;
  return true;
};
/** Fields needed server-side to price/assign a public booking (not all returned to client). */
export const PUBLIC_BOOKING_CAR_FIELDS = [
  '_id',
  'owner',
  'brand',
  'model',
  'isAvaliable',
  'visibleOnWebsite',
  'status',
  'pricePerDay',
  'securityDeposit',
  'mileage',
  'licensePlate',
  'locations',
  'location',
].join(' ');

/** Convert Mongoose doc or lean object to a plain JSON-safe car record. */
export const toPlainCar = (car) => {
  if (!car) return null;
  if (typeof car.toObject === 'function') {
    return car.toObject({ virtuals: false });
  }
  if (car._doc && typeof car._doc === 'object') {
    const { _doc, $__, unitCount, unitIds, ...rest } = car;
    return { ..._doc, ...rest };
  }
  return { ...car };
};

/** Slim public catalog shape — never leak fleet/maintenance fields even if over-selected. */
export const toPublicCatalogCar = (car) => {
  const plain = toPlainCar(car);
  if (!plain?._id) return null;
  return {
    _id: plain._id,
    owner: plain.owner,
    brand: plain.brand,
    model: plain.model,
    year: plain.year,
    category: plain.category,
    image: plain.image || '',
    images: Array.isArray(plain.images) ? plain.images : [],
    seating_capacity: plain.seating_capacity,
    fuel_type: plain.fuel_type,
    transmission: plain.transmission,
    pricePerDay: plain.pricePerDay,
    locations: Array.isArray(plain.locations) ? plain.locations : [],
    location: plain.location || '',
    description: plain.description || '',
    features: Array.isArray(plain.features) ? plain.features : [],
    isAvaliable: Boolean(plain.isAvaliable),
    status: plain.status,
  };
};

export const buildModelKey = (car) => {
  const plain = toPlainCar(car) || {};
  return `${String(plain.owner || '')}|${String(plain.brand || '').trim().toLowerCase()}|${String(plain.model || '').trim().toLowerCase()}`;
};

/** Group physical units into one public catalog entry per brand+model (per owner). */
export const groupCarsForCatalog = (cars = []) => {
  const map = new Map();

  for (const raw of cars) {
    const car = toPublicCatalogCar(raw);
    if (!car?._id) continue;

    const key = buildModelKey(car);
    const id = car._id;

    if (!map.has(key)) {
      map.set(key, {
        ...car,
        unitCount: 1,
        unitIds: [id],
      });
    } else {
      const entry = map.get(key);
      entry.unitCount += 1;
      entry.unitIds.push(id);
    }
  }

  return Array.from(map.values());
};

const ACTIVE_STATUSES = ['pending', 'confirmed', 'ready_for_pickup', 'active'];

export const isCarAvailableForDates = async (carId, pickupDate, returnDate, excludeBookingId = null) => {
  const query = {
    car: carId,
    status: { $in: ACTIVE_STATUSES },
    pickupDate: { $lte: returnDate },
    returnDate: { $gte: pickupDate },
  };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };
  const overlap = await Booking.findOne(query).select('_id').lean();
  return !overlap;
};

/**
 * Bulk availability: one booking query for many cars (same rules as isCarAvailableForDates).
 * Returns Set of carId strings that are busy for the date range.
 */
export const findBusyCarIds = async (carIds, pickupDate, returnDate, excludeBookingId = null) => {
  if (!carIds?.length) return new Set();
  const query = {
    car: { $in: carIds },
    status: { $in: ACTIVE_STATUSES },
    pickupDate: { $lte: returnDate },
    returnDate: { $gte: pickupDate },
  };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };
  const overlaps = await Booking.find(query).select('car').lean();
  return new Set(overlaps.map((b) => String(b.car)));
};

/**
 * Pick an available physical unit for a model group.
 * Prefers preferredCarId when free; otherwise first free unit with same brand+model.
 */
export const resolveAvailableCarUnit = async ({
  ownerId,
  brand,
  model,
  pickupDate,
  returnDate,
  preferredCarId = null,
  excludeBookingId = null,
}) => {
  const bookableOwners = await getBookableOwnerIds();
  const ownerAllowed = bookableOwners.some((id) => String(id) === String(ownerId));
  if (!ownerAllowed) return null;

  const baseQuery = {
    owner: ownerId,
    brand,
    model,
    isAvaliable: true,
    status: { $ne: 'maintenance' },
    visibleOnWebsite: { $ne: false },
  };

  const units = await Car.find(baseQuery)
    .select(PUBLIC_BOOKING_CAR_FIELDS)
    .sort({ createdAt: 1 })
    .lean();
  if (!units.length) return null;

  const busy = await findBusyCarIds(
    units.map((u) => u._id),
    pickupDate,
    returnDate,
    excludeBookingId,
  );

  if (preferredCarId) {
    const preferred = units.find((u) => String(u._id) === String(preferredCarId));
    if (preferred && !busy.has(String(preferred._id))) return preferred;
  }

  return units.find((unit) => !busy.has(String(unit._id))) || null;
};

export default {
  PUBLIC_CATALOG_FIELDS,
  PUBLIC_BOOKING_CAR_FIELDS,
  PUBLIC_VISIBLE_CAR_FILTER,
  buildPublicVisibleCarFilter,
  isPubliclyVisibleCar,
  toPlainCar,
  toPublicCatalogCar,
  buildModelKey,
  groupCarsForCatalog,
  isCarAvailableForDates,
  findBusyCarIds,
  resolveAvailableCarUnit,
};
