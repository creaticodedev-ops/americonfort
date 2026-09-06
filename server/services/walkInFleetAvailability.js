import Car from '../models/Car.js';
import Booking from '../models/Booking.js';

const PIPELINE_STATUSES = ['pending', 'confirmed', 'ready_for_pickup', 'active'];

const CAR_FIELDS =
  'brand model year category licensePlate fleetId branch locations location pricePerDay securityDeposit mileage status isAvaliable fuel_type transmission image';

/**
 * Pick the most operationally relevant overlapping booking for a car.
 * Prefer active rentals, then the conflict that ends soonest.
 */
const preferConflict = (a, b) => {
  if (!a) return b;
  if (!b) return a;
  if (a.status === 'active' && b.status !== 'active') return a;
  if (b.status === 'active' && a.status !== 'active') return b;
  const aEnd = new Date(a.returnDate).getTime();
  const bEnd = new Date(b.returnDate).getTime();
  if (Number.isFinite(aEnd) && Number.isFinite(bEnd) && aEnd !== bEnd) {
    return aEnd <= bEnd ? a : b;
  }
  return a;
};

const serializeConflict = (booking) => {
  if (!booking) return null;
  return {
    bookingId: booking._id,
    reservationId: booking.reservationId || '',
    status: booking.status,
    pickupDate: booking.pickupDate,
    returnDate: booking.returnDate,
    customerName: booking.customerName || '',
  };
};

/**
 * Desk fleet snapshot for Walk-in vehicle assignment.
 * Availability is computed against the requested rental window when dates are provided.
 */
export const getWalkInFleetAvailability = async ({
  ownerId,
  pickupDate = null,
  returnDate = null,
} = {}) => {
  const cars = await Car.find({ owner: ownerId })
    .select(CAR_FIELDS)
    .sort({ brand: 1, model: 1, licensePlate: 1 })
    .lean();

  const carIds = cars.map((c) => c._id);
  const conflictByCar = new Map();

  if (carIds.length) {
    const rangeQuery = {
      owner: ownerId,
      car: { $in: carIds },
      status: { $in: PIPELINE_STATUSES },
    };

    if (pickupDate && returnDate) {
      rangeQuery.pickupDate = { $lte: returnDate };
      rangeQuery.returnDate = { $gte: pickupDate };
    } else {
      // Without a Walk-in window, only surface vehicles currently out on rent.
      const now = new Date();
      rangeQuery.status = 'active';
      rangeQuery.pickupDate = { $lte: now };
      rangeQuery.returnDate = { $gte: now };
    }

    const overlaps = await Booking.find(rangeQuery)
      .select('car status pickupDate returnDate reservationId customerName')
      .lean();

    for (const booking of overlaps) {
      const key = String(booking.car);
      conflictByCar.set(key, preferConflict(conflictByCar.get(key), booking));
    }
  }

  const items = cars.map((car) => {
    const conflict = serializeConflict(conflictByCar.get(String(car._id)));
    let availability = 'available';
    let selectable = true;

    if (car.status === 'maintenance') {
      availability = 'maintenance';
      selectable = false;
    } else if (car.isAvaliable === false) {
      availability = 'unavailable';
      selectable = false;
    } else if (conflict) {
      availability = conflict.status === 'active' ? 'on_rent' : 'reserved';
      selectable = false;
    }

    return {
      _id: car._id,
      brand: car.brand,
      model: car.model,
      year: car.year,
      category: car.category,
      licensePlate: car.licensePlate || '',
      fleetId: car.fleetId || '',
      branch: car.branch || '',
      locations: car.locations || [],
      location: car.location || '',
      pricePerDay: car.pricePerDay,
      securityDeposit: car.securityDeposit,
      mileage: car.mileage,
      status: car.status,
      isAvaliable: car.isAvaliable !== false,
      fuel_type: car.fuel_type,
      transmission: car.transmission,
      image: car.image || '',
      availability,
      selectable,
      conflict,
    };
  });

  const rank = {
    available: 0,
    reserved: 1,
    on_rent: 2,
    unavailable: 3,
    maintenance: 4,
  };

  items.sort((a, b) => {
    const ra = rank[a.availability] ?? 9;
    const rb = rank[b.availability] ?? 9;
    if (ra !== rb) return ra - rb;
    const nameA = `${a.brand || ''} ${a.model || ''}`.trim().toLowerCase();
    const nameB = `${b.brand || ''} ${b.model || ''}`.trim().toLowerCase();
    if (nameA !== nameB) return nameA.localeCompare(nameB);
    return String(a.licensePlate || '').localeCompare(String(b.licensePlate || ''));
  });

  const summary = {
    total: items.length,
    available: items.filter((i) => i.availability === 'available').length,
    reserved: items.filter((i) => i.availability === 'reserved').length,
    onRent: items.filter((i) => i.availability === 'on_rent').length,
    maintenance: items.filter((i) => i.availability === 'maintenance').length,
    unavailable: items.filter((i) => i.availability === 'unavailable').length,
    datesRequired: !(pickupDate && returnDate),
  };

  return { items, summary };
};

export default { getWalkInFleetAvailability };
