import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import { escapeRegex } from './listQuery.js';

const parseDateBound = (value, endOfDay = false) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Resolve booking IDs matching advanced rental/identity/vehicle filters.
 * Returns null when no booking-side filters are active.
 * Returns [] when filters are active but nothing matches.
 */
export const resolveBookingIdsForDocumentFilters = async (ownerId, filters = {}) => {
  const {
    cin = '',
    plate = '',
    vehicleModel = '',
    vehicleId = '',
    pickupFrom = '',
    pickupTo = '',
    returnFrom = '',
    returnTo = '',
    signatureStatus = '',
  } = filters;

  const bookingAnd = [{ owner: ownerId }];
  let active = false;

  if (cin?.trim()) {
    active = true;
    const term = escapeRegex(cin.trim());
    bookingAnd.push({
      $or: [
        { identityDocumentNumber: { $regex: term, $options: 'i' } },
        { passportNumber: { $regex: term, $options: 'i' } },
        { driverLicenseNumber: { $regex: term, $options: 'i' } },
      ],
    });
  }

  if (pickupFrom || pickupTo) {
    active = true;
    const range = {};
    const from = parseDateBound(pickupFrom, false);
    const to = parseDateBound(pickupTo, true);
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    if (Object.keys(range).length) bookingAnd.push({ pickupDate: range });
  }

  if (returnFrom || returnTo) {
    active = true;
    const range = {};
    const from = parseDateBound(returnFrom, false);
    const to = parseDateBound(returnTo, true);
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    if (Object.keys(range).length) bookingAnd.push({ returnDate: range });
  }

  if (signatureStatus === 'signed') {
    active = true;
    bookingAnd.push({
      $or: [
        { 'completion.signatureComplete': true },
        { 'completion.signatureRequestStatus': 'signed' },
      ],
    });
  } else if (signatureStatus === 'unsigned') {
    active = true;
    bookingAnd.push({
      $and: [
        { 'completion.signatureComplete': { $ne: true } },
        { 'completion.signatureRequestStatus': { $ne: 'signed' } },
      ],
    });
  }

  const carIds = new Set();
  if (vehicleId && mongoose.Types.ObjectId.isValid(vehicleId)) {
    active = true;
    carIds.add(String(vehicleId));
  }

  if (plate?.trim() || vehicleModel?.trim()) {
    active = true;
    const carQuery = { owner: ownerId };
    if (plate?.trim()) {
      carQuery.licensePlate = { $regex: escapeRegex(plate.trim()), $options: 'i' };
    }
    if (vehicleModel?.trim()) {
      const term = escapeRegex(vehicleModel.trim());
      carQuery.$or = [
        { brand: { $regex: term, $options: 'i' } },
        { model: { $regex: term, $options: 'i' } },
      ];
    }
    const cars = await Car.find(carQuery).select('_id').lean();
    cars.forEach((c) => carIds.add(String(c._id)));
    if (!cars.length && !vehicleId) {
      return [];
    }
  }

  if (carIds.size) {
    bookingAnd.push({
      car: { $in: [...carIds].map((id) => new mongoose.Types.ObjectId(id)) },
    });
  }

  if (!active) return null;

  const bookings = await Booking.find({ $and: bookingAnd }).select('_id').lean();
  return bookings.map((b) => b._id);
};

export const applyCreatedAtRange = (query, createdFrom, createdTo) => {
  const range = {};
  const from = parseDateBound(createdFrom, false);
  const to = parseDateBound(createdTo, true);
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  if (Object.keys(range).length) query.createdAt = range;
};

export { escapeRegex, parseDateBound };
