import Car from '../models/Car.js';
import { escapeRegex } from '../utils/listQuery.js';

const channelQuery = (channel) => {
  if (!channel) return null;
  if (channel === 'walk_in' || channel === 'walk-in') return 'walk_in';
  if (channel === 'online') return { $ne: 'walk_in' };
  return channel;
};

export const parseOwnerBookingFilters = (query = {}) => ({
  search: query.search,
  reservationId: query.reservationId,
  customerName: query.customerName,
  phone: query.phone,
  email: query.email,
  vehicle: query.vehicle,
  pickupLocation: query.pickupLocation,
  dropoffLocation: query.dropoffLocation,
  status: query.status,
  paymentStatus: query.paymentStatus,
  channel: query.channel,
  pickupDateFrom: query.pickupDateFrom,
  pickupDateTo: query.pickupDateTo,
  returnDateFrom: query.returnDateFrom,
  returnDateTo: query.returnDateTo,
  createdFrom: query.createdFrom,
  createdTo: query.createdTo,
  category: query.category,
  licensePlate: query.licensePlate,
  opsScope: query.opsScope,
});

/**
 * Shared owner reservation list/export query builder.
 * Keep list API + Excel export in lockstep.
 */
export const buildOwnerBookingQuery = (ownerId, filters = {}) => {
  const query = { owner: ownerId };

  // “En location / On rent”: currently out (aligned with ops dashboard).
  if (filters.opsScope === 'onRent') {
    query.status = { $in: ['confirmed', 'ready_for_pickup', 'active'] };
    query.pickupDate = { ...(query.pickupDate || {}), $lte: new Date() };
  } else if (filters.status) {
    query.status = filters.status;
  }

  if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
  if (filters.channel) {
    const channelMatch = channelQuery(filters.channel);
    if (channelMatch) query.channel = channelMatch;
  }

  if (filters.pickupDateFrom || filters.pickupDateTo) {
    query.pickupDate = { ...(query.pickupDate || {}) };
    if (filters.pickupDateFrom) query.pickupDate.$gte = new Date(filters.pickupDateFrom);
    if (filters.pickupDateTo) {
      const end = new Date(filters.pickupDateTo);
      end.setHours(23, 59, 59, 999);
      const existingLte = query.pickupDate.$lte;
      query.pickupDate.$lte = existingLte && existingLte < end ? existingLte : end;
    }
  }

  if (filters.returnDateFrom || filters.returnDateTo) {
    query.returnDate = {};
    if (filters.returnDateFrom) query.returnDate.$gte = new Date(filters.returnDateFrom);
    if (filters.returnDateTo) {
      const end = new Date(filters.returnDateTo);
      end.setHours(23, 59, 59, 999);
      query.returnDate.$lte = end;
    }
  }

  if (filters.createdFrom || filters.createdTo) {
    query.createdAt = {};
    if (filters.createdFrom) query.createdAt.$gte = new Date(filters.createdFrom);
    if (filters.createdTo) {
      const end = new Date(filters.createdTo);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const regexFields = [
    ['dropoffLocation', 'returnLocation'],
    ['customerName', 'customerName'],
    ['phone', 'customerPhone'],
    ['email', 'customerEmail'],
    ['reservationId', 'reservationId'],
  ];

  for (const [filterKey, dbKey] of regexFields) {
    if (filters[filterKey]) {
      query[dbKey] = { $regex: escapeRegex(filters[filterKey]), $options: 'i' };
    }
  }

  const andClauses = [];

  if (filters.pickupLocation) {
    const locTerm = { $regex: escapeRegex(String(filters.pickupLocation).trim()), $options: 'i' };
    andClauses.push({
      $or: [
        { pickupLocation: locTerm },
        { returnLocation: locTerm },
      ],
    });
  }

  if (filters.search) {
    const term = escapeRegex(String(filters.search).trim());
    andClauses.push({
      $or: [
        { customerName: { $regex: term, $options: 'i' } },
        { customerEmail: { $regex: term, $options: 'i' } },
        { customerPhone: { $regex: term, $options: 'i' } },
        { reservationId: { $regex: term, $options: 'i' } },
        { pickupLocation: { $regex: term, $options: 'i' } },
        { returnLocation: { $regex: term, $options: 'i' } },
      ],
    });
  }

  if (andClauses.length === 1) {
    Object.assign(query, andClauses[0]);
  } else if (andClauses.length > 1) {
    query.$and = andClauses;
  }

  return query;
};

export const applyVehicleFiltersToBookingQuery = async (ownerId, query, filters = {}) => {
  if (!filters.vehicle && !filters.category && !filters.licensePlate) return query;

  const carQuery = { owner: ownerId };
  if (filters.category) {
    carQuery.category = new RegExp(`^${escapeRegex(filters.category)}$`, 'i');
  }
  if (filters.licensePlate) {
    carQuery.licensePlate = { $regex: escapeRegex(filters.licensePlate.trim()), $options: 'i' };
  }
  if (filters.vehicle) {
    const term = escapeRegex(filters.vehicle.trim());
    carQuery.$expr = {
      $regexMatch: {
        input: { $toLower: { $concat: [{ $ifNull: ['$brand', ''] }, ' ', { $ifNull: ['$model', ''] }] } },
        regex: term.toLowerCase(),
      },
    };
  }

  const cars = await Car.find(carQuery).select('_id').lean();
  query.car = { $in: cars.map((c) => c._id) };
  return query;
};

export const parseOwnerBookingExportQuery = async (req) => {
  const filters = parseOwnerBookingFilters(req.query);
  const query = buildOwnerBookingQuery(req.user._id, filters);
  await applyVehicleFiltersToBookingQuery(req.user._id, query, filters);
  return { query, filters };
};

export default parseOwnerBookingExportQuery;
