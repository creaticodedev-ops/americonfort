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
});

export const buildOwnerBookingQuery = (ownerId, filters = {}) => {
  const query = { owner: ownerId };

  if (filters.status) query.status = filters.status;
  if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
  if (filters.channel) {
    const channelMatch = channelQuery(filters.channel);
    if (channelMatch) query.channel = channelMatch;
  }

  if (filters.pickupDateFrom || filters.pickupDateTo) {
    query.pickupDate = {};
    if (filters.pickupDateFrom) query.pickupDate.$gte = new Date(filters.pickupDateFrom);
    if (filters.pickupDateTo) {
      const end = new Date(filters.pickupDateTo);
      end.setHours(23, 59, 59, 999);
      query.pickupDate.$lte = end;
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
    ['pickupLocation', 'pickupLocation'],
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

  if (filters.search) {
    const term = escapeRegex(filters.search);
    query.$or = [
      { customerName: { $regex: term, $options: 'i' } },
      { customerEmail: { $regex: term, $options: 'i' } },
      { customerPhone: { $regex: term, $options: 'i' } },
      { reservationId: { $regex: term, $options: 'i' } },
    ];
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
