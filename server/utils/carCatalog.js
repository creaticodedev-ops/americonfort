import Car from '../models/Car.js';
import Booking from '../models/Booking.js';

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

export const buildModelKey = (car) => {
  const plain = toPlainCar(car) || {};
  return `${String(plain.owner || '')}|${String(plain.brand || '').trim().toLowerCase()}|${String(plain.model || '').trim().toLowerCase()}`;
};

/** Group physical units into one public catalog entry per brand+model (per owner). */
export const groupCarsForCatalog = (cars = []) => {
  const map = new Map();

  for (const raw of cars) {
    const car = toPlainCar(raw);
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
  const baseQuery = {
    owner: ownerId,
    brand,
    model,
    isAvaliable: true,
    status: { $ne: 'maintenance' },
  };

  const units = await Car.find(baseQuery).sort({ createdAt: 1 }).lean();
  if (!units.length) return null;

  if (preferredCarId) {
    const preferred = units.find((u) => String(u._id) === String(preferredCarId));
    if (preferred) {
      const ok = await isCarAvailableForDates(preferred._id, pickupDate, returnDate, excludeBookingId);
      if (ok) return preferred;
    }
  }

  for (const unit of units) {
    const ok = await isCarAvailableForDates(unit._id, pickupDate, returnDate, excludeBookingId);
    if (ok) return unit;
  }

  return null;
};

export default {
  toPlainCar,
  buildModelKey,
  groupCarsForCatalog,
  isCarAvailableForDates,
  resolveAvailableCarUnit,
};
