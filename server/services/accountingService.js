import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import SamsarPayment from '../models/SamsarPayment.js';
import AgencyExpense from '../models/AgencyExpense.js';
import VehicleExpense from '../models/VehicleExpense.js';

const REVENUE_STATUSES = ['confirmed', 'ready_for_pickup', 'active', 'completed'];

const toOid = (id) => {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  return new mongoose.Types.ObjectId(String(id));
};

const toMoney = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const resolvePeriodRange = (period = 'month', from, to) => {
  const now = new Date();
  const startOfDay = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfDay = (d) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  if (period === 'custom' && (from || to)) {
    return {
      from: from ? startOfDay(from) : null,
      to: to ? endOfDay(to) : endOfDay(now),
      label: 'custom',
    };
  }

  if (period === 'today') {
    return { from: startOfDay(now), to: endOfDay(now), label: 'today' };
  }
  if (period === 'week') {
    const start = startOfDay(now);
    start.setDate(start.getDate() - start.getDay());
    return { from: start, to: endOfDay(now), label: 'week' };
  }
  if (period === 'year') {
    return {
      from: new Date(now.getFullYear(), 0, 1),
      to: endOfDay(now),
      label: 'year',
    };
  }
  // default month
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: endOfDay(now),
    label: 'month',
  };
};

const dateMatch = (field, from, to) => {
  if (!from && !to) return {};
  const range = {};
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  return { [field]: range };
};

/**
 * Gross rental revenue from bookings (server-side read model — no Revenue collection).
 */
export const aggregateGrossRevenue = async (ownerId, { from, to, carId, bookingId, paymentStatus } = {}) => {
  const match = {
    owner: toOid(ownerId),
    status: { $in: REVENUE_STATUSES },
    ...dateMatch('createdAt', from, to),
  };
  if (carId && mongoose.isValidObjectId(carId)) match.car = toOid(carId);
  if (bookingId && mongoose.isValidObjectId(bookingId)) match._id = toOid(bookingId);
  if (paymentStatus) match.paymentStatus = paymentStatus;

  const [agg] = await Booking.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        grossRevenue: { $sum: '$price' },
        paidRevenue: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$price', 0] },
        },
        unpaidRevenue: {
          $sum: {
            $cond: [
              { $in: ['$paymentStatus', ['pending', 'failed']] },
              '$price',
              0,
            ],
          },
        },
        bookingCount: { $sum: 1 },
      },
    },
  ]);

  return {
    grossRevenue: toMoney(agg?.grossRevenue),
    paidRevenue: toMoney(agg?.paidRevenue),
    unpaidRevenue: toMoney(agg?.unpaidRevenue),
    bookingCount: agg?.bookingCount || 0,
  };
};

/**
 * Sum of partner_discount amounts on bookings in period (display-only; already in Gross).
 */
export const aggregatePartnerDiscounts = async (ownerId, { from, to } = {}) => {
  const match = {
    owner: toOid(ownerId),
    status: { $in: REVENUE_STATUSES },
    ...dateMatch('createdAt', from, to),
  };
  const [agg] = await Booking.aggregate([
    { $match: match },
    {
      $project: {
        partnerDiscount: {
          $sum: {
            $map: {
              input: { $ifNull: ['$priceBreakdown.discounts', []] },
              as: 'd',
              in: {
                $cond: [
                  { $eq: ['$$d.code', 'partner_discount'] },
                  { $ifNull: ['$$d.amount', 0] },
                  0,
                ],
              },
            },
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        partnerDiscountApplied: { $sum: '$partnerDiscount' },
      },
    },
  ]);
  return { partnerDiscountApplied: toMoney(agg?.partnerDiscountApplied) };
};

export const aggregateSamsarPayments = async (ownerId, { from, to } = {}) => {
  const match = {
    owner: toOid(ownerId),
    paymentStatus: { $ne: 'cancelled' },
    ...dateMatch('paymentDate', from, to),
  };
  const [agg] = await SamsarPayment.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        paid: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$amount', 0] },
        },
        pending: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$amount', 0] },
        },
        count: { $sum: 1 },
      },
    },
  ]);
  return {
    total: toMoney(agg?.total),
    paid: toMoney(agg?.paid),
    pending: toMoney(agg?.pending),
    count: agg?.count || 0,
  };
};

export const aggregateAgencyExpenses = async (ownerId, { from, to } = {}) => {
  const match = {
    owner: toOid(ownerId),
    paymentStatus: { $ne: 'cancelled' },
    ...dateMatch('expenseDate', from, to),
  };
  const [agg] = await AgencyExpense.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        paid: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$amount', 0] },
        },
        count: { $sum: 1 },
      },
    },
  ]);
  return {
    total: toMoney(agg?.total),
    paid: toMoney(agg?.paid),
    count: agg?.count || 0,
  };
};

export const aggregateVehicleExpenses = async (ownerId, { from, to, carId } = {}) => {
  const match = {
    owner: toOid(ownerId),
    paymentStatus: { $ne: 'cancelled' },
    ...dateMatch('expenseDate', from, to),
  };
  if (carId && mongoose.isValidObjectId(carId)) match.car = toOid(carId);

  const [agg] = await VehicleExpense.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        paid: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$amount', 0] },
        },
        count: { $sum: 1 },
      },
    },
  ]);
  return {
    total: toMoney(agg?.total),
    paid: toMoney(agg?.paid),
    count: agg?.count || 0,
  };
};

/**
 * Accounting overview KPIs:
 * Gross Revenue - Samsar Payments - Agency Expenses - Vehicle Expenses = Net Result
 */
export const getAccountingOverview = async (ownerId, { period = 'month', from, to } = {}) => {
  const range = resolvePeriodRange(period, from, to);
  const opts = { from: range.from, to: range.to };

  const [revenue, samsar, agency, vehicle, partnerDiscounts] = await Promise.all([
    aggregateGrossRevenue(ownerId, opts),
    aggregateSamsarPayments(ownerId, opts),
    aggregateAgencyExpenses(ownerId, opts),
    aggregateVehicleExpenses(ownerId, opts),
    aggregatePartnerDiscounts(ownerId, opts),
  ]);

  const grossRevenue = revenue.grossRevenue;
  const samsarPayments = samsar.total;
  const agencyExpenses = agency.total;
  const vehicleExpenses = vehicle.total;
  const netResult = toMoney(grossRevenue - samsarPayments - agencyExpenses - vehicleExpenses);

  return {
    period: range.label,
    from: range.from,
    to: range.to,
    currency: process.env.CURRENCY || 'MAD',
    kpis: {
      grossRevenue,
      paidRevenue: revenue.paidRevenue,
      unpaidRevenue: revenue.unpaidRevenue,
      /** Display-only; already reflected in grossRevenue. Not subtracted again in netResult. */
      partnerDiscountApplied: partnerDiscounts.partnerDiscountApplied,
      samsarPayments,
      agencyExpenses,
      vehicleExpenses,
      netResult,
      bookingCount: revenue.bookingCount,
    },
    breakdown: { revenue, samsar, agency, vehicle, partnerDiscounts },
  };
};

export const listRevenues = async (ownerId, {
  from,
  to,
  carId,
  bookingId,
  paymentStatus,
  page = 1,
  limit = 20,
  sort = '-createdAt',
} = {}) => {
  const match = {
    owner: toOid(ownerId),
    status: { $in: REVENUE_STATUSES },
    ...dateMatch('createdAt', from, to),
  };
  if (carId && mongoose.isValidObjectId(carId)) match.car = toOid(carId);
  if (bookingId && mongoose.isValidObjectId(bookingId)) match._id = toOid(bookingId);
  if (paymentStatus) match.paymentStatus = paymentStatus;

  const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
  const lim = Math.min(100, Math.max(1, limit));

  const sortSpec = sort.startsWith('-')
    ? { [sort.slice(1)]: -1 }
    : { [sort]: 1 };

  const [items, total, totals] = await Promise.all([
    Booking.find(match)
      .populate('car', 'brand model licensePlate')
      .select('reservationId customerName pickupDate returnDate price paymentStatus status channel createdAt car')
      .sort(sortSpec)
      .skip(skip)
      .limit(lim)
      .lean(),
    Booking.countDocuments(match),
    aggregateGrossRevenue(ownerId, { from, to, carId, bookingId, paymentStatus }),
  ]);

  // Attach payment docs when present (non-PII amounts only)
  const bookingIds = items.map((b) => b._id);
  const payments = await Payment.find({ booking: { $in: bookingIds } })
    .select('booking amount status method gateway')
    .lean();
  const payByBooking = Object.fromEntries(payments.map((p) => [String(p.booking), p]));

  return {
    items: items.map((b) => ({
      ...b,
      payment: payByBooking[String(b._id)] || null,
    })),
    pagination: {
      page: Math.max(1, page),
      limit: lim,
      total,
      pages: Math.ceil(total / lim) || 1,
    },
    totals,
  };
};

export default {
  resolvePeriodRange,
  aggregateGrossRevenue,
  aggregateSamsarPayments,
  aggregateAgencyExpenses,
  aggregateVehicleExpenses,
  getAccountingOverview,
  listRevenues,
};
