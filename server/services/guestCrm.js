import mongoose from 'mongoose';
import GuestCustomer from '../models/GuestCustomer.js';
import Booking from '../models/Booking.js';

const asObjectId = (id) => {
  if (!id) return id;
  if (id instanceof mongoose.Types.ObjectId) return id;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return id;
  }
};

const SPENT_STATUSES = ['confirmed', 'active', 'completed'];

const aggregateGuestStats = async (ownerId, email) => {
  const stats = await Booking.aggregate([
    { $match: { owner: ownerId, customerEmail: email } },
    {
      $group: {
        _id: null,
        totalReservations: { $sum: 1 },
        cancelledReservations: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
        },
        completedReservations: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        totalSpent: {
          $sum: {
            $cond: [{ $in: ['$status', SPENT_STATUSES] }, '$price', 0],
          },
        },
        lastBookingAt: { $max: '$createdAt' },
      },
    },
  ]);
  return stats[0] || null;
};

/**
 * Sync guest CRM profile from booking data (admin-only CRM).
 */
export const upsertGuestFromBooking = async (booking) => {
  if (!booking?.owner) return null;

  let email = booking.customerEmail?.trim()?.toLowerCase() || '';
  if (!email && booking.customerPhone) {
    const digits = String(booking.customerPhone).replace(/\D/g, '');
    if (digits) email = `walkin+${digits}@local.americonfort`;
  }
  if (!email) return null;

  const ownerId = asObjectId(booking.owner);
  const city = (booking.pickupLocation || '').split(',')[0]?.trim()
    || (booking.pickupLocation || '').split('-')[0]?.trim()
    || '';

  let guest = await GuestCustomer.findOne({ owner: ownerId, email });

  const s = (await aggregateGuestStats(ownerId, email)) || {
    totalReservations: 1,
    cancelledReservations: 0,
    completedReservations: 0,
    totalSpent: SPENT_STATUSES.includes(booking.status) ? (booking.price || 0) : 0,
    lastBookingAt: booking.createdAt || new Date(),
  };

  let status = guest?.status || 'new';
  if (status !== 'vip' && status !== 'blacklisted') {
    if (s.totalReservations <= 1) status = 'new';
    else if (s.totalSpent >= 5000 || s.completedReservations >= 5) status = 'vip';
    else status = 'regular';
  }

  const payload = {
    name: booking.customerName || guest?.name || 'Guest',
    phone: booking.customerPhone || guest?.phone || '',
    city: city || guest?.city || '',
    totalReservations: s.totalReservations,
    cancelledReservations: s.cancelledReservations,
    completedReservations: s.completedReservations,
    totalSpent: s.totalSpent,
    lastBookingAt: s.lastBookingAt,
  };

  if (guest) {
    Object.assign(guest, payload);
    if (guest.status !== 'vip' && guest.status !== 'blacklisted') {
      guest.status = status;
    }
    await guest.save();
    return guest;
  }

  guest = await GuestCustomer.create({
    owner: ownerId,
    email,
    ...payload,
    status,
  });
  return guest;
};

export const refreshGuestStats = async (ownerId, email) => {
  const normalized = email.trim().toLowerCase();
  const oid = asObjectId(ownerId);
  const guest = await GuestCustomer.findOne({ owner: oid, email: normalized });
  if (!guest) return null;

  const [s, latest] = await Promise.all([
    aggregateGuestStats(oid, normalized),
    Booking.findOne({ owner: oid, customerEmail: normalized })
      .select('customerName customerPhone createdAt')
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  guest.totalReservations = s?.totalReservations || 0;
  guest.cancelledReservations = s?.cancelledReservations || 0;
  guest.completedReservations = s?.completedReservations || 0;
  guest.totalSpent = s?.totalSpent || 0;
  guest.lastBookingAt = s?.lastBookingAt || latest?.createdAt || null;

  if (guest.status !== 'vip' && guest.status !== 'blacklisted') {
    if (guest.totalReservations <= 1) guest.status = 'new';
    else if (guest.totalSpent >= 5000 || guest.completedReservations >= 5) guest.status = 'vip';
    else guest.status = 'regular';
  }

  if (latest) {
    guest.name = latest.customerName || guest.name;
    guest.phone = latest.customerPhone || guest.phone;
  }

  await guest.save();
  return guest;
};
