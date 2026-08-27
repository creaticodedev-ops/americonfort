/**
 * Period-scoped vehicle / fleet statistics.
 * Date bounds are UTC calendar days so Render (UTC) and the SPA agree on "today".
 */
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import MaintenanceRecord from '../models/MaintenanceRecord.js';

export const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed', 'ready_for_pickup', 'active'];
export const REVENUE_BOOKING_STATUSES = ['confirmed', 'ready_for_pickup', 'active', 'completed'];
export const UPCOMING_BOOKING_STATUSES = ['pending', 'confirmed', 'ready_for_pickup'];
/** Operationally out once confirmed (or later) and pickup time has been reached. */
export const ON_RENT_BOOKING_STATUSES = ['confirmed', 'ready_for_pickup', 'active'];

const MS_DAY = 86400000;

const toOid = (id) => {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  return new mongoose.Types.ObjectId(String(id));
};

const carIdOf = (booking) => {
  const raw = booking?.car;
  if (!raw) return '';
  if (typeof raw === 'object' && raw._id) return String(raw._id);
  return String(raw);
};

export const toUtcStart = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0));
  }
  const s = String(value).slice(0, 10);
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
};

export const toUtcEnd = (value) => {
  const start = toUtcStart(value);
  if (!start) return null;
  return new Date(start.getTime() + MS_DAY - 1);
};

export const toIsoDate = (value) => {
  const start = toUtcStart(value);
  return start ? start.toISOString().slice(0, 10) : '';
};

export const inclusiveUtcDays = (from, to) => {
  const a = toUtcStart(from);
  const b = toUtcStart(to);
  if (!a || !b || b < a) return 0;
  return Math.round((b - a) / MS_DAY) + 1;
};

export const overlapUtcDays = (aStart, aEnd, bStart, bEnd) => {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  if (!start || !end || start > end) return 0;
  return inclusiveUtcDays(start, end);
};

export const resolveStatsPeriod = (period = 'month', from, to, now = new Date()) => {
  const today = toUtcStart(now);
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const d = today.getUTCDate();
  const named = String(period || 'month').toLowerCase();

  const finish = (start, end, label) => {
    let fromDate = start;
    let toDate = end;
    if (toDate < fromDate) {
      fromDate = toUtcStart(end);
      toDate = toUtcEnd(start);
    }
    return {
      from: fromDate,
      to: toDate,
      label,
      periodDays: inclusiveUtcDays(fromDate, toDate),
    };
  };

  if (from && to) {
    return finish(toUtcStart(from) || today, toUtcEnd(to) || toUtcEnd(today), named || 'custom');
  }

  if (named === 'today') {
    return finish(today, toUtcEnd(today), 'today');
  }
  if (named === 'week') {
    const weekday = (today.getUTCDay() + 6) % 7;
    const start = new Date(Date.UTC(y, m, d - weekday, 0, 0, 0, 0));
    return finish(start, toUtcEnd(new Date(Date.UTC(y, m, d - weekday + 6))), 'week');
  }
  if (named === 'last_month') {
    return finish(new Date(Date.UTC(y, m - 1, 1)), toUtcEnd(new Date(Date.UTC(y, m, 0))), 'last_month');
  }
  if (named === 'last_3_months') {
    return finish(new Date(Date.UTC(y, m - 2, 1)), toUtcEnd(new Date(Date.UTC(y, m + 1, 0))), 'last_3_months');
  }
  if (named === 'year') {
    return finish(new Date(Date.UTC(y, 0, 1)), toUtcEnd(new Date(Date.UTC(y, 11, 31))), 'year');
  }
  return finish(new Date(Date.UTC(y, m, 1)), toUtcEnd(new Date(Date.UTC(y, m + 1, 0))), 'month');
};

const bookingSpan = (booking) => {
  const start = booking?.pickupDate ? new Date(booking.pickupDate) : null;
  if (!start || Number.isNaN(start.getTime())) return null;
  const endRaw = booking?.returnDate ? new Date(booking.returnDate) : start;
  const end = Number.isNaN(endRaw.getTime()) ? start : endRaw;
  return { start, end: end < start ? start : end };
};

export const bookingOverlapsRange = (booking, range) => {
  const span = bookingSpan(booking);
  if (!span) return false;
  return span.start <= range.to && span.end >= range.from;
};

export const bookingCalendarDays = (booking) => {
  const span = bookingSpan(booking);
  if (!span) return 0;
  const listed = Number(booking?.priceBreakdown?.days);
  if (Number.isFinite(listed) && listed > 0) return listed;
  return inclusiveUtcDays(span.start, span.end);
};

/**
 * Vehicle is currently out on rental: confirmed+ statuses with pickup reached.
 * Overdue returns stay "on rent" until the booking is completed/cancelled.
 */
export const isBookingCurrentlyOnRent = (booking, now = new Date()) => {
  if (!booking || !ON_RENT_BOOKING_STATUSES.includes(booking.status)) return false;
  const span = bookingSpan(booking);
  if (!span) return false;
  return span.start <= now;
};

const roundMoney = (n) => Math.round((Number(n) || 0) * 100) / 100;
const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const addUtcDays = (date, days) => new Date(date.getTime() + days * MS_DAY);

/** Period-attributed revenue: prorate booking price by overlap days / billed days. */
export const proratedRevenue = (booking, range) => {
  if (!REVENUE_BOOKING_STATUSES.includes(booking.status)) return 0;
  const span = bookingSpan(booking);
  if (!span) return 0;
  const fullDays = Math.max(1, bookingCalendarDays(booking));
  const overlap = overlapUtcDays(span.start, span.end, range.from, range.to);
  if (overlap <= 0) return 0;
  const fraction = Math.min(1, overlap / fullDays);
  return roundMoney((Number(booking.price) || 0) * fraction);
};

const eachUtcDayIso = (from, to) => {
  const days = [];
  let cursor = toUtcStart(from);
  const last = toUtcStart(to);
  if (!cursor || !last || last < cursor) return days;
  while (cursor <= last) {
    days.push(toIsoDate(cursor));
    cursor = addUtcDays(cursor, 1);
  }
  return days;
};

/** Unique calendar days rented in range (consecutive/overlapping bookings do not double-count). */
export const uniqueRentalDaysInRange = (bookings, range) => {
  const set = new Set();
  for (const booking of bookings) {
    if (!booking || booking.status === 'cancelled') continue;
    const span = bookingSpan(booking);
    if (!span) continue;
    const start = span.start > range.from ? span.start : range.from;
    const end = span.end < range.to ? span.end : range.to;
    if (start > end) continue;
    for (const iso of eachUtcDayIso(start, end)) set.add(iso);
  }
  return set.size;
};

const maintenanceSpan = (record) => {
  const start = record.scheduledDate || record.completedDate || record.createdAt;
  if (!start) return null;
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return null;
  const endSource = record.completedDate || record.scheduledDate || startDate;
  const endDate = new Date(endSource);
  return { start: startDate, end: Number.isNaN(endDate.getTime()) ? startDate : endDate };
};

export const suggestedTrendGrain = (periodDays) => {
  const days = Number(periodDays) || 0;
  if (days <= 21) return 'daily';
  if (days <= 92) return 'weekly';
  return 'monthly';
};

const startOfUtcIsoWeek = (date) => {
  const start = toUtcStart(date);
  const weekday = (start.getUTCDay() + 6) % 7;
  return addUtcDays(start, -weekday);
};

const buildBuckets = (range, grain) => {
  const buckets = [];
  if (grain === 'monthly') {
    let cursor = new Date(Date.UTC(range.from.getUTCFullYear(), range.from.getUTCMonth(), 1));
    const last = new Date(Date.UTC(range.to.getUTCFullYear(), range.to.getUTCMonth(), 1));
    while (cursor <= last) {
      const start = cursor < range.from ? range.from : cursor;
      const monthEnd = toUtcEnd(new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)));
      const end = monthEnd > range.to ? range.to : monthEnd;
      buckets.push({
        key: `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`,
        label: cursor.toLocaleString('en', { month: 'short', timeZone: 'UTC' }),
        start,
        end,
      });
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }
    return buckets;
  }
  if (grain === 'weekly') {
    let cursor = startOfUtcIsoWeek(range.from);
    let i = 1;
    while (cursor <= range.to) {
      const weekEnd = toUtcEnd(addUtcDays(cursor, 6));
      const start = cursor < range.from ? range.from : cursor;
      const end = weekEnd > range.to ? range.to : weekEnd;
      if (end >= range.from && start <= range.to) {
        buckets.push({ key: `w${i}`, label: `W${i}`, start, end });
        i += 1;
      }
      cursor = addUtcDays(cursor, 7);
    }
    return buckets;
  }
  let cursor = toUtcStart(range.from);
  const last = toUtcStart(range.to);
  while (cursor <= last) {
    buckets.push({
      key: toIsoDate(cursor),
      label: `${cursor.getUTCDate()}`,
      start: cursor,
      end: toUtcEnd(cursor),
    });
    cursor = addUtcDays(cursor, 1);
  }
  return buckets;
};

export const buildTrendSeries = (bookings, range, grain) => {
  const buckets = buildBuckets(range, grain);
  return buckets.map((bucket) => {
    const inBucket = bookings.filter((booking) => bookingOverlapsRange(booking, bucket));
    const revenue = inBucket.reduce((sum, booking) => sum + proratedRevenue(booking, bucket), 0);
    const rentals = inBucket.filter((booking) => booking.status !== 'cancelled').length;
    return {
      key: bucket.key,
      label: bucket.label,
      amount: roundMoney(revenue),
      revenue: roundMoney(revenue),
      bookings: rentals,
    };
  });
};

const rankVehicles = (rows) => {
  const active = rows.filter((row) => row.completedRentals + row.upcomingRentals + row.activeRentals > 0);
  if (!active.length) {
    return rows.map((row) => ({ ...row, performance: 'average' }));
  }
  const revenues = [...active.map((row) => row.revenue)].sort((a, b) => a - b);
  const q75 = revenues[Math.max(0, Math.ceil(revenues.length * 0.75) - 1)] ?? 0;
  return rows.map((row) => {
    const idle = row.completedRentals === 0 && row.upcomingRentals === 0 && row.activeRentals === 0;
    if (idle) return { ...row, performance: 'under' };
    if (row.revenue >= q75 && row.revenue > 0) return { ...row, performance: 'best' };
    return { ...row, performance: 'average' };
  });
};

export const computeVehiclePeriodMetrics = ({
  car,
  bookings = [],
  maintenance = [],
  range,
  now = new Date(),
}) => {
  const overlapping = bookings.filter((booking) => bookingOverlapsRange(booking, range));
  const nonCancelled = overlapping.filter((booking) => booking.status !== 'cancelled');
  const completed = overlapping.filter((booking) => booking.status === 'completed');
  const cancelled = overlapping.filter((booking) => booking.status === 'cancelled');
  const upcoming = overlapping.filter(
    (booking) => UPCOMING_BOOKING_STATUSES.includes(booking.status) && new Date(booking.pickupDate) >= now,
  );
  const openInPeriod = overlapping.filter((booking) => ACTIVE_BOOKING_STATUSES.includes(booking.status));
  const revenueBookings = overlapping.filter((booking) => REVENUE_BOOKING_STATUSES.includes(booking.status));

  const rentalDays = uniqueRentalDaysInRange(nonCancelled, range);
  const revenue = revenueBookings.reduce((sum, booking) => sum + proratedRevenue(booking, range), 0);
  const bookingValue = roundMoney(
    revenueBookings.reduce((sum, booking) => sum + (Number(booking.price) || 0), 0),
  );
  const durationSum = nonCancelled.reduce((sum, booking) => sum + bookingCalendarDays(booking), 0);

  const currentlyRented = bookings.some((booking) => isBookingCurrentlyOnRent(booking, now));
  const activeNowCount = bookings.filter((booking) => isBookingCurrentlyOnRent(booking, now)).length;

  const lastInPeriod = [...nonCancelled]
    .sort((a, b) => new Date(b.returnDate || b.pickupDate) - new Date(a.returnDate || a.pickupDate))[0];
  const nextFuture = bookings
    .filter((booking) => booking.status !== 'cancelled' && booking.status !== 'completed' && booking.pickupDate)
    .filter((booking) => new Date(booking.pickupDate) >= now)
    .sort((a, b) => new Date(a.pickupDate) - new Date(b.pickupDate))[0];

  const maintOverlapping = maintenance.filter((record) => {
    if (record.status === 'cancelled') return false;
    const span = maintenanceSpan(record);
    if (!span) return false;
    return span.start <= range.to && span.end >= range.from;
  });
  const unavailableDays = maintOverlapping.reduce((sum, record) => {
    const span = maintenanceSpan(record);
    if (!span) return sum;
    return sum + overlapUtcDays(span.start, span.end, range.from, range.to);
  }, 0);

  const periodDays = Math.max(1, range.periodDays || inclusiveUtcDays(range.from, range.to));
  const utilization = round1((rentalDays / periodDays) * 100);
  const availability =
    car.status === 'maintenance'
      ? 'maintenance'
      : currentlyRented
        ? 'rented'
        : car.isAvaliable
          ? 'available'
          : 'offline';

  return {
    completedRentals: completed.length,
    upcomingRentals: upcoming.length,
    /** Bookings currently out on this vehicle (confirmed+ with pickup reached). */
    activeRentals: activeNowCount,
    /** Open pipeline bookings overlapping the period (pending → active). */
    openRentals: openInPeriod.length,
    cancellations: cancelled.length,
    totalRentals: nonCancelled.length,
    revenueRentals: revenueBookings.length,
    revenue: roundMoney(revenue),
    bookingValue,
    avgRentalRevenue: revenueBookings.length ? roundMoney(revenue / revenueBookings.length) : 0,
    rentalDays,
    avgDuration: nonCancelled.length ? round1(durationSum / nonCancelled.length) : 0,
    avgDailyPrice: rentalDays > 0 ? roundMoney(revenue / rentalDays) : 0,
    utilization,
    lastRentalAt: lastInPeriod ? lastInPeriod.returnDate || lastInPeriod.pickupDate : null,
    nextReservationAt: nextFuture?.pickupDate || null,
    nextCustomer: nextFuture?.customerName || '',
    maintenanceCount: maintOverlapping.length,
    unavailableDays,
    currentlyRented,
    availability,
    listPricePerDay: Number(car.pricePerDay) || 0,
  };
};

const vehiclePayload = (car, metrics) => ({
  _id: String(car._id),
  brand: car.brand || '',
  model: car.model || '',
  year: car.year || null,
  category: car.category || '',
  image: car.image || '',
  fleetId: car.fleetId || '',
  licensePlate: car.licensePlate || '',
  status: car.status || 'available',
  isAvaliable: Boolean(car.isAvaliable),
  ...metrics,
});

export const loadOwnerStatsSources = async (ownerId, range) => {
  const owner = toOid(ownerId);
  const [cars, bookings, maintenance] = await Promise.all([
    Car.find({ owner })
      .select('brand model year category image fleetId licensePlate status isAvaliable pricePerDay')
      .sort({ fleetId: 1, createdAt: -1 })
      .lean(),
    Booking.find({ owner })
      .select('car pickupDate returnDate price priceBreakdown status customerName paymentStatus')
      .lean(),
    MaintenanceRecord.find({ owner })
      .select('car type title status scheduledDate completedDate cost notes createdAt')
      .lean(),
  ]);
  return { cars, bookings, maintenance, range };
};

export const buildFleetVehicleStats = async ({ ownerId, period = 'month', from, to, now = new Date() }) => {
  const range = resolveStatsPeriod(period, from, to, now);
  const { cars, bookings, maintenance } = await loadOwnerStatsSources(ownerId, range);

  const bookingsByCar = new Map();
  for (const booking of bookings) {
    const id = carIdOf(booking);
    if (!id) continue;
    if (!bookingsByCar.has(id)) bookingsByCar.set(id, []);
    bookingsByCar.get(id).push(booking);
  }
  const maintByCar = new Map();
  for (const record of maintenance) {
    const id = carIdOf(record);
    if (!id) continue;
    if (!maintByCar.has(id)) maintByCar.set(id, []);
    maintByCar.get(id).push(record);
  }

  let rows = cars.map((car) => {
    const metrics = computeVehiclePeriodMetrics({
      car,
      bookings: bookingsByCar.get(String(car._id)) || [],
      maintenance: maintByCar.get(String(car._id)) || [],
      range,
      now,
    });
    return vehiclePayload(car, metrics);
  });
  rows = rankVehicles(rows);

  const periodDays = Math.max(1, range.periodDays);
  const totalRevenue = roundMoney(rows.reduce((sum, row) => sum + row.revenue, 0));
  const bookingValue = roundMoney(rows.reduce((sum, row) => sum + (row.bookingValue || 0), 0));
  const totalRentals = rows.reduce((sum, row) => sum + row.totalRentals, 0);
  const revenueRentals = rows.reduce((sum, row) => sum + (row.revenueRentals || 0), 0);
  const rentalDays = rows.reduce((sum, row) => sum + row.rentalDays, 0);
  const fleetUtilization = cars.length ? round1((rentalDays / (cars.length * periodDays)) * 100) : 0;
  const kpis = {
    totalRevenue,
    bookingValue,
    totalRentals,
    revenueRentals,
    rentalDays,
    fleetUtilization,
    avgRentalValue: revenueRentals ? roundMoney(totalRevenue / revenueRentals) : 0,
    available: rows.filter((row) => row.availability === 'available').length,
    rented: rows.filter((row) => row.availability === 'rented').length,
    maintenance: rows.filter((row) => row.availability === 'maintenance').length,
    vehicles: rows.length,
  };

  return {
    period: {
      label: range.label,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      fromDate: toIsoDate(range.from),
      toDate: toIsoDate(range.to),
      days: periodDays,
    },
    kpis,
    vehicles: rows,
  };
};

const rentalHistoryRow = (booking, range) => {
  const span = bookingSpan(booking);
  const duration = bookingCalendarDays(booking);
  return {
    _id: String(booking._id),
    customerName: booking.customerName || '',
    pickupDate: booking.pickupDate || null,
    returnDate: booking.returnDate || null,
    duration,
    overlapDays: span ? overlapUtcDays(span.start, span.end, range.from, range.to) : 0,
    revenue: roundMoney(Number(booking.price) || 0),
    periodRevenue: proratedRevenue(booking, range),
    status: booking.status || '',
    paymentStatus: booking.paymentStatus || '',
  };
};

export const buildVehicleDetailStats = async ({ ownerId, car, period = 'month', from, to, grain, now = new Date() }) => {
  const range = resolveStatsPeriod(period, from, to, now);
  const [bookings, maintenance] = await Promise.all([
    Booking.find({ owner: toOid(ownerId), car: car._id })
      .select('car pickupDate returnDate price priceBreakdown status customerName paymentStatus')
      .sort({ pickupDate: -1 })
      .lean(),
    MaintenanceRecord.find({ owner: toOid(ownerId), car: car._id })
      .select('type title status scheduledDate completedDate cost notes createdAt')
      .sort({ scheduledDate: -1, completedDate: -1 })
      .lean(),
  ]);

  const metrics = computeVehiclePeriodMetrics({ car, bookings, maintenance, range, now });
  const overlapping = bookings.filter((booking) => bookingOverlapsRange(booking, range));
  const history = overlapping
    .sort((a, b) => new Date(b.pickupDate) - new Date(a.pickupDate))
    .map((booking) => rentalHistoryRow(booking, range));

  const periodDays = range.periodDays;
  const resolvedGrain = ['daily', 'weekly', 'monthly'].includes(grain) ? grain : suggestedTrendGrain(periodDays);
  const trendBookings = overlapping.filter((booking) => booking.status !== 'cancelled');
  const trend = buildTrendSeries(trendBookings, range, resolvedGrain);

  const maintenanceRows = maintenance
    .filter((record) => {
      if (record.status === 'cancelled') return false;
      const span = maintenanceSpan(record);
      if (!span) return false;
      return span.start <= range.to && span.end >= range.from;
    })
    .map((record) => {
      const span = maintenanceSpan(record);
      return {
        _id: String(record._id),
        type: record.type || '',
        title: record.title || '',
        status: record.status || '',
        scheduledDate: record.scheduledDate || null,
        completedDate: record.completedDate || null,
        cost: Number(record.cost) || 0,
        notes: record.notes || '',
        downtimeDays: span ? overlapUtcDays(span.start, span.end, range.from, range.to) : 0,
      };
    });

  return {
    period: {
      label: range.label,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      fromDate: toIsoDate(range.from),
      toDate: toIsoDate(range.to),
      days: periodDays,
      grain: resolvedGrain,
    },
    vehicle: {
      _id: String(car._id),
      brand: car.brand,
      model: car.model,
      year: car.year,
      category: car.category,
      image: car.image,
      licensePlate: car.licensePlate || '',
      fleetId: car.fleetId || '',
      status: car.status,
      availability: car.isAvaliable,
    },
    overview: {
      totalBookings: metrics.totalRentals,
      completedBookings: metrics.completedRentals,
      cancelledBookings: metrics.cancellations,
      activeBookings: metrics.activeRentals,
      upcomingBookings: metrics.upcomingRentals,
      openBookings: metrics.openRentals,
      revenueRentals: metrics.revenueRentals,
      totalRevenue: metrics.revenue,
      bookingValue: metrics.bookingValue,
      rentalDays: metrics.rentalDays,
      utilizationRate: `${metrics.utilization}%`,
      utilization: metrics.utilization,
      averageRentalDuration: `${metrics.avgDuration} days`,
      avgDuration: metrics.avgDuration,
      averageRevenuePerBooking: metrics.avgRentalRevenue,
      avgDailyPrice: metrics.avgDailyPrice,
      unavailableDays: metrics.unavailableDays,
      lastRentalAt: metrics.lastRentalAt,
      nextReservationAt: metrics.nextReservationAt,
      currentlyRented: metrics.currentlyRented,
      availability: metrics.availability,
    },
    rentalHistory: history,
    trend,
    maintenanceHistory: maintenanceRows,
  };
};

export default {
  resolveStatsPeriod,
  buildFleetVehicleStats,
  buildVehicleDetailStats,
  computeVehiclePeriodMetrics,
  bookingOverlapsRange,
  proratedRevenue,
  isBookingCurrentlyOnRent,
  uniqueRentalDaysInRange,
  ON_RENT_BOOKING_STATUSES,
};
