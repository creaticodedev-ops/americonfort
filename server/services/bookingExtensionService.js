import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import BookingExtension from '../models/BookingExtension.js';
import User from '../models/User.js';
import { calculateBookingPrice } from './pricingEngine.js';
import { calcRentalDays } from '../utils/helpers.js';
import { logAudit } from '../utils/adminOps.js';
import { ensureDefaultTemplates } from '../controllers/exportTemplateController.js';
import { getDefaultContractTemplate } from '../utils/resolveExportTemplate.js';
import { upsertContractFromBooking } from '../controllers/contractController.js';
import { resolveIncludeCompanyStamp } from './documentSettings.js';
import {
  resolveBookingSettings,
  validateBookingAgainstRules,
  buildPolicySnapshot,
} from './bookingRules.js';

const loadSettings = async (ownerId) => {
  const owner = await User.findById(ownerId).select('bookingSettings').lean();
  return resolveBookingSettings(owner);
};

const toMoney = (n) => Math.round((Number(n) || 0) * 100) / 100;

const isCarAvailable = async (carId, pickupDate, returnDate, excludeBookingId) => {
  const query = {
    car: carId,
    status: { $in: ['pending', 'confirmed', 'ready_for_pickup', 'active'] },
    pickupDate: { $lte: returnDate },
    returnDate: { $gte: pickupDate },
  };
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }
  const conflict = await Booking.findOne(query).select('_id reservationId').lean();
  return !conflict;
};

const loadOwnedBooking = async (bookingId, ownerId) => {
  const booking = await Booking.findById(bookingId).populate('car');
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }
  if (String(booking.owner) !== String(ownerId)) {
    const err = new Error('Unauthorized');
    err.status = 403;
    throw err;
  }
  if (!booking.car) {
    const err = new Error('Associated vehicle no longer exists');
    err.status = 400;
    throw err;
  }
  return booking;
};

/**
 * Preview an extension without mutating data.
 */
export const previewBookingExtension = async ({ bookingId, ownerId, newReturnDate }) => {
  const booking = await loadOwnedBooking(bookingId, ownerId);

  if (['cancelled', 'completed'].includes(booking.status)) {
    const err = new Error('Only active reservations can be extended');
    err.status = 400;
    throw err;
  }

  const newReturn = new Date(newReturnDate);
  if (Number.isNaN(newReturn.getTime())) {
    const err = new Error('Invalid new return date');
    err.status = 400;
    throw err;
  }

  if (newReturn.getTime() <= new Date(booking.returnDate).getTime()) {
    const err = new Error('New return date must be after the current return date');
    err.status = 400;
    throw err;
  }

  const settings = await loadSettings(booking.owner);
  const rulesCheck = validateBookingAgainstRules({
    settings,
    pickupDate: booking.pickupDate,
    returnDate: newReturn,
    sameReturnLocation: true,
    skipTimeWindow: true,
    skipAdvance: true,
  });
  if (!rulesCheck.valid) {
    const err = new Error(rulesCheck.message || 'Booking rules rejected this extension');
    err.status = 400;
    err.code = rulesCheck.code;
    throw err;
  }

  const available = await isCarAvailable(
    booking.car._id,
    booking.pickupDate,
    newReturn,
    booking._id,
  );
  if (!available) {
    const err = new Error('Vehicle is not available for the extended period');
    err.status = 409;
    err.code = 'AVAILABILITY_CONFLICT';
    throw err;
  }

  const pickupFee = booking.priceBreakdown?.pickupDeliveryFee ?? 0;
  const dropoffFee = booking.priceBreakdown?.dropoffDeliveryFee ?? 0;
  const discounts = booking.priceBreakdown?.discounts || [];

  const newBreakdown = calculateBookingPrice({
    pricePerDay: booking.car.pricePerDay ?? booking.priceBreakdown?.pricePerDay ?? 0,
    pickupDate: booking.pickupDate,
    returnDate: newReturn,
    pickupDeliveryFee: pickupFee,
    dropoffDeliveryFee: dropoffFee,
    discounts,
  });

  const previousTotal = toMoney(booking.price);
  const newTotal = toMoney(newBreakdown.total);
  const additionalAmount = toMoney(Math.max(0, newTotal - previousTotal));
  const previousDays = booking.priceBreakdown?.days
    ?? calcRentalDays(booking.pickupDate, booking.returnDate);
  const additionalDays = Math.max(0, (newBreakdown.days || 0) - (previousDays || 0));

  return {
    bookingId: booking._id,
    reservationId: booking.reservationId,
    car: {
      _id: booking.car._id,
      brand: booking.car.brand,
      model: booking.car.model,
      pricePerDay: booking.car.pricePerDay,
    },
    originalPickupDate: booking.pickupDate,
    originalReturnDate: booking.returnDate,
    previousReturnDate: booking.returnDate,
    newReturnDate: newReturn,
    previousDays,
    newDays: newBreakdown.days,
    additionalDays,
    previousTotal,
    newTotal,
    additionalAmount,
    currency: process.env.CURRENCY || 'MAD',
    priceBreakdown: newBreakdown,
    available: true,
  };
};

/**
 * Confirm extension: create BookingExtension, update booking, version contract, audit.
 */
export const confirmBookingExtension = async ({
  bookingId,
  ownerId,
  actorId,
  newReturnDate,
  reason = '',
  notes = '',
}) => {
  const preview = await previewBookingExtension({ bookingId, ownerId, newReturnDate });
  const booking = await loadOwnedBooking(bookingId, ownerId);

  // Re-check availability under a short race window
  const available = await isCarAvailable(
    booking.car._id,
    booking.pickupDate,
    preview.newReturnDate,
    booking._id,
  );
  if (!available) {
    const err = new Error('Vehicle is not available for the extended period');
    err.status = 409;
    throw err;
  }

  const settings = await loadSettings(booking.owner);
  const previousReturnDate = new Date(booking.returnDate);
  const previousTotal = toMoney(booking.price);
  const originalPickupDate = new Date(booking.pickupDate);
  const originalReturnDate = previousReturnDate;

  booking.returnDate = preview.newReturnDate;
  booking.price = preview.newTotal;
  booking.priceBreakdown = preview.priceBreakdown;
  booking.policySnapshot = buildPolicySnapshot(settings);
  booking.markModified('priceBreakdown');
  await booking.save();

  let contractId = null;
  let contractVersion = null;
  try {
    await ensureDefaultTemplates(ownerId);
    const template = await getDefaultContractTemplate(ownerId);
    if (template) {
      const ownerDoc = await User.findById(ownerId).select('documentSettings agencyName email').lean();
      const includeCompanyStamp = resolveIncludeCompanyStamp({
        owner: ownerDoc,
        documentType: 'contracts',
      });
      const fresh = await Booking.findById(bookingId).populate('car').populate('owner');
      const contract = await upsertContractFromBooking({
        owner: ownerId,
        booking: fresh,
        user: { _id: actorId || ownerId },
        template,
        includeCompanyStamp,
        contractNumber: fresh.reservationId || undefined,
        note: `Contract extension — return ${preview.newReturnDate.toISOString()}`,
        forceFromBooking: true,
      });
      contractId = contract?._id || null;
      contractVersion = contract?.version ?? null;
    }
  } catch (contractErr) {
    console.error('[extension] contract update failed:', contractErr.message);
  }

  const extension = await BookingExtension.create({
    owner: ownerId,
    booking: bookingId,
    originalPickupDate,
    originalReturnDate,
    previousReturnDate,
    newReturnDate: preview.newReturnDate,
    additionalDays: preview.additionalDays,
    additionalAmount: preview.additionalAmount,
    previousTotal,
    newTotal: preview.newTotal,
    currency: preview.currency,
    priceBreakdownSnapshot: preview.priceBreakdown,
    reason: String(reason || '').slice(0, 500),
    notes: String(notes || '').slice(0, 2000),
    performedBy: actorId || ownerId,
    contractId,
    contractVersion,
  });

  await logAudit({
    owner: ownerId,
    actor: actorId || ownerId,
    action: 'booking.extend',
    entityType: 'BookingExtension',
    entityId: extension._id,
    details: `Extended ${booking.reservationId || bookingId}: +${preview.additionalDays} day(s), +${preview.additionalAmount} ${preview.currency}`,
    meta: {
      bookingId: String(bookingId),
      previousReturnDate,
      newReturnDate: preview.newReturnDate,
      additionalAmount: preview.additionalAmount,
      newTotal: preview.newTotal,
    },
  });

  return {
    extension,
    booking: {
      _id: booking._id,
      reservationId: booking.reservationId,
      pickupDate: booking.pickupDate,
      returnDate: booking.returnDate,
      price: booking.price,
      priceBreakdown: booking.priceBreakdown,
    },
    preview,
  };
};

export const listBookingExtensions = async ({ ownerId, bookingId }) => {
  const filter = { owner: ownerId };
  if (bookingId && mongoose.isValidObjectId(bookingId)) {
    filter.booking = bookingId;
  }
  return BookingExtension.find(filter)
    .populate('performedBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();
};

export default {
  previewBookingExtension,
  confirmBookingExtension,
  listBookingExtensions,
};
