/**
 * Period-scoped vehicle / fleet statistics.
 * Date bounds are UTC calendar days so Render (UTC) and the SPA agree on "today".
 * Occupancy uses half-open [pickup, return) days — same semantics as calcRentalDays
 * (e.g. 10 Aug → 15 Aug = 5 rental days, not 6).
 */
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import MaintenanceRecord from '../models/MaintenanceRecord.js';
import { calcRentalDays } from '../utils/helpers.js';

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
  const from = range?.from || range?.start;
  const to = range?.to || range?.end;
  if (!from || !to) return false;
  return span.start <= to && span.end >= from;
};

export const bookingCalendarDays = (booking) => {
  const span = bookingSpan(booking);
  if (!span) return 0;
  const listed = Number(booking?.priceBreakdown?.days);
  if (Number.isFinite(listed) && listed > 0) return listed;
  return calcRentalDays(span.start, span.end);
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

/**
 * Half-open occupied UTC calendar days [pickup, return).
 * Same-day rentals count as 1 day. Aligns with calcRentalDays for midnight-aligned spans.
 */
export const occupiedDayIsos = (spanStart, spanEnd) => {
  const start = toUtcStart(spanStart);
  const endExclusive = toUtcStart(spanEnd);
  if (!start) return [];
  if (!endExclusive || endExclusive <= start) return [toIsoDate(start)];
  const days = [];
  let cursor = start;
  while (cursor < endExclusive) {
    days.push(toIsoDate(cursor));
    cursor = addUtcDays(cursor, 1);
  }
  return days;
};

export const periodDayIsos = (range) => {
  const start = toUtcStart(range?.from || range?.start);
  const last = toUtcStart(range?.to || range?.end);
  if (!start || !last || last < start) return [];
  const days = [];
  let cursor = start;
  while (cursor <= last) {
    days.push(toIsoDate(cursor));
    cursor = addUtcDays(cursor, 1);
  }
  return days;
};

/** Occupied rental days that fall inside the selected period (no double-count across bookings). */
export const overlapRentalDays = (spanStart, spanEnd, range) => {
  const period = new Set(periodDayIsos(range));
  if (!period.size) return 0;
  return occupiedDayIsos(spanStart, spanEnd).filter((iso) => period.has(iso)).length;
};

/**
 * Recognized booking revenue for stats.
 * Prefer ledger charges (excludes deposits); fall back to booking.price.
 * Refunds reduce recognized revenue; deposits are never counted.
 */
export const bookingRecognizedRevenue = (booking) => {
  const fin = booking?.financial;
  const charges = Number(fin?.chargesTotal);
  if (fin && (fin.source === 'ledger' || (Number.isFinite(charges) && charges > 0))) {
    const refunds = Number(fin.refundsTotal) || 0;
    return roundMoney(Math.max(0, charges - refunds));
  }
  return roundMoney(Number(booking?.price) || 0);
};

/** Period-attributed revenue: prorate recognized amount by overlap days / billed days. */
export const proratedRevenue = (booking, range) => {
  if (!REVENUE_BOOKING_STATUSES.includes(booking.status)) return 0;
  const span = bookingSpan(booking);
  if (!span) return 0;
  const fullDays = Math.max(1, bookingCalendarDays(booking));
  const overlap = overlapRentalDays(span.start, span.end, range);
  if (overlap <= 0) return 0;
  const fraction = Math.min(1, overlap / fullDays);
  return roundMoney(bookingRecognizedRevenue(booking) * fraction);
};

/** Unique calendar days rented in range (consecutive/overlapping bookings do not double-count). */
export const uniqueRentalDaysInRange = (bookings, range) => {
  const period = new Set(periodDayIsos(range));
  if (!period.size) return 0;
  const set = new Set();
  for (const booking of bookings) {
    if (!booking || booking.status === 'cancelled') continue;
    const span = bookingSpan(booking);
    if (!span) continue;
    for (const iso of occupiedDayIsos(span.start, span.end)) {
      if (period.has(iso)) set.add(iso);
    }
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

export const uniqueMaintenanceDaysInRange = (records, range) => {
  const period = new Set(periodDayIsos(range));
  if (!period.size) return 0;
  const set = new Set();
  for (const record of records) {
    if (!record || record.status === 'cancelled') continue;
    const span = maintenanceSpan(record);
    if (!span) continue;
    for (const iso of occupiedDayIsos(span.start, span.end)) {
      if (period.has(iso)) set.add(iso);
    }
  }
  return set.size;
};

/**
 * Live fleet operational status for Manage Cars KPIs (per physical car _id).
 * Tenant-scoped via ownerId.
 */
export const resolveFleetOperationalMap = async (ownerId, now = new Date()) => {
  const owner = toOid(ownerId);
  const onRent = await Booking.find({
    owner,
    status: { $in: ON_RENT_BOOKING_STATUSES },
    pickupDate: { $lte: now },
  })
    .select('car')
    .lean();
  const rentedIds = new Set(onRent.map((b) => carIdOf(b)).filter(Boolean));
  return {
    rentedIds,
    operationalStatusFor(car) {
      if (car?.status === 'maintenance') return 'maintenance';
      if (rentedIds.has(String(car?._id))) return 'rented';
      if (car?.isAvaliable === false) return 'offline';
      return 'available';
    },
  };
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
  const pushBucket = (key, label, start, end) => {
    buckets.push({
      key,
      label,
      start,
      end,
      // Period helpers (bookingOverlapsRange, proratedRevenue) expect from/to
      from: start,
      to: end,
    });
  };
  if (grain === 'monthly') {
    let cursor = new Date(Date.UTC(range.from.getUTCFullYear(), range.from.getUTCMonth(), 1));
    const last = new Date(Date.UTC(range.to.getUTCFullYear(), range.to.getUTCMonth(), 1));
    while (cursor <= last) {
      const start = cursor < range.from ? range.from : cursor;
      const monthEnd = toUtcEnd(new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)));
      const end = monthEnd > range.to ? range.to : monthEnd;
      pushBucket(
        `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`,
        cursor.toLocaleString('en', { month: 'short', timeZone: 'UTC' }),
        start,
        end,
      );
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
        pushBucket(`w${i}`, `W${i}`, start, end);
        i += 1;
      }
      cursor = addUtcDays(cursor, 7);
    }
    return buckets;
  }
  let cursor = toUtcStart(range.from);
  const last = toUtcStart(range.to);
  while (cursor <= last) {
    pushBucket(toIsoDate(cursor), `${cursor.getUTCDate()}`, cursor, toUtcEnd(cursor));
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

  const maintOverlapping = maintenance.filter((record) => {
    if (record.status === 'cancelled') return false;
    const span = maintenanceSpan(record);
    if (!span) return false;
    return span.start <= range.to && span.end >= range.from;
  });

  const rentalDays = uniqueRentalDaysInRange(nonCancelled, range);
  const unavailableDays = uniqueMaintenanceDaysInRange(maintOverlapping, range);
  const revenue = revenueBookings.reduce((sum, booking) => sum + proratedRevenue(booking, range), 0);
  const bookingValue = roundMoney(
    revenueBookings.reduce((sum, booking) => sum + bookingRecognizedRevenue(booking), 0),
  );
  const durationSum = nonCancelled.reduce((sum, booking) => sum + bookingCalendarDays(booking), 0);

  const currentlyRented = bookings.some((booking) => isBookingCurrentlyOnRent(booking, now));
  const activeNowCount = bookings.filter((booking) => isBookingCurrentlyOnRent(booking, now)).length;
  const currentRental = bookings.find((booking) => isBookingCurrentlyOnRent(booking, now)) || null;

  const completedForLast = [...bookings]
    .filter((booking) => booking.status === 'completed')
    .sort((a, b) => new Date(b.returnDate || b.pickupDate) - new Date(a.returnDate || a.pickupDate));
  const pastEnded = [...nonCancelled]
    .filter((booking) => !isBookingCurrentlyOnRent(booking, now))
    .filter((booking) => {
      const end = booking.returnDate ? new Date(booking.returnDate) : null;
      return end && end < now;
    })
    .sort((a, b) => new Date(b.returnDate || b.pickupDate) - new Date(a.returnDate || a.pickupDate));
  const lastRentalBooking = completedForLast[0] || pastEnded[0] || null;

  const nextFuture = bookings
    .filter((booking) => booking.status !== 'cancelled' && booking.status !== 'completed' && booking.pickupDate)
    .filter((booking) => new Date(booking.pickupDate) > now)
    .filter((booking) => !isBookingCurrentlyOnRent(booking, now))
    .sort((a, b) => new Date(a.pickupDate) - new Date(b.pickupDate))[0];

  const periodDays = Math.max(1, range.periodDays || inclusiveUtcDays(range.from, range.to));
  const availableDays = Math.max(0, periodDays - unavailableDays);
  const utilizationBase = Math.max(1, availableDays || periodDays);
  const utilization = round1((rentalDays / utilizationBase) * 100);
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
    rentalPeriods: nonCancelled.length,
    revenueRentals: revenueBookings.length,
    revenue: roundMoney(revenue),
    bookingValue,
    avgRentalRevenue: revenueBookings.length ? roundMoney(revenue / revenueBookings.length) : 0,
    rentalDays,
    avgDuration: nonCancelled.length ? round1(durationSum / nonCancelled.length) : 0,
    avgDailyPrice: rentalDays > 0 ? roundMoney(revenue / rentalDays) : 0,
    utilization,
    periodDays,
    availableDays,
    unavailableDays,
    lastRentalAt: lastRentalBooking
      ? lastRentalBooking.returnDate || lastRentalBooking.pickupDate
      : null,
    nextReservationAt: nextFuture?.pickupDate || null,
    nextCustomer: nextFuture?.customerName || '',
    currentCustomer: currentRental?.customerName || '',
    currentPickupAt: currentRental?.pickupDate || null,
    currentReturnAt: currentRental?.returnDate || null,
    maintenanceCount: maintOverlapping.length,
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
      .select('car pickupDate returnDate price priceBreakdown status customerName paymentStatus financial channel')
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
  const durationWeighted = rows.reduce((sum, row) => sum + (row.avgDuration || 0) * (row.totalRentals || 0), 0);
  const fleetUtilization = cars.length ? round1((rentalDays / (cars.length * periodDays)) * 100) : 0;
  const ranked = [...rows].sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
  const avgDuration =
    totalRentals > 0
      ? round1(durationWeighted > 0 ? durationWeighted / totalRentals : rentalDays / totalRentals)
      : 0;
  const kpis = {
    totalRevenue,
    bookingValue,
    totalRentals,
    revenueRentals,
    rentalDays,
    fleetUtilization,
    avgRentalValue: revenueRentals ? roundMoney(totalRevenue / revenueRentals) : 0,
    avgDuration,
    available: rows.filter((row) => row.availability === 'available').length,
    rented: rows.filter((row) => row.availability === 'rented').length,
    offline: rows.filter((row) => row.availability === 'offline').length,
    maintenance: rows.filter((row) => row.availability === 'maintenance').length,
    vehicles: rows.length,
    topPerformers: ranked.filter((r) => r.performance === 'best').slice(0, 5).map((r) => r._id),
    lowPerformers: ranked.filter((r) => r.performance === 'under').slice(0, 5).map((r) => r._id),
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
  const recognized = bookingRecognizedRevenue(booking);
  return {
    _id: String(booking._id),
    customerName: booking.customerName || '',
    pickupDate: booking.pickupDate || null,
    returnDate: booking.returnDate || null,
    duration,
    overlapDays: span ? overlapRentalDays(span.start, span.end, range) : 0,
    revenue: recognized,
    periodRevenue: proratedRevenue(booking, range),
    status: booking.status || '',
    paymentStatus: booking.paymentStatus || '',
    channel: booking.channel || '',
  };
};

export const buildVehicleDetailStats = async ({ ownerId, car, period = 'month', from, to, grain, now = new Date() }) => {
  const range = resolveStatsPeriod(period, from, to, now);
  const [bookings, maintenance] = await Promise.all([
    Booking.find({ owner: toOid(ownerId), car: car._id })
      .select('car pickupDate returnDate price priceBreakdown status customerName paymentStatus financial channel')
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
        downtimeDays: span ? overlapRentalDays(span.start, span.end, range) : 0,
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
      availability: metrics.availability,
      isAvaliable: Boolean(car.isAvaliable),
    },
    overview: {
      totalBookings: metrics.totalRentals,
      completedBookings: metrics.completedRentals,
      cancelledBookings: metrics.cancellations,
      activeBookings: metrics.activeRentals,
      upcomingBookings: metrics.upcomingRentals,
      openBookings: metrics.openRentals,
      revenueRentals: metrics.revenueRentals,
      rentalPeriods: metrics.rentalPeriods,
      totalRevenue: metrics.revenue,
      bookingValue: metrics.bookingValue,
      rentalDays: metrics.rentalDays,
      availableDays: metrics.availableDays,
      unavailableDays: metrics.unavailableDays,
      periodDays: metrics.periodDays,
      utilizationRate: `${metrics.utilization}%`,
      utilization: metrics.utilization,
      averageRentalDuration: `${metrics.avgDuration} days`,
      avgDuration: metrics.avgDuration,
      averageRevenuePerBooking: metrics.avgRentalRevenue,
      avgDailyPrice: metrics.avgDailyPrice,
      lastRentalAt: metrics.lastRentalAt,
      nextReservationAt: metrics.nextReservationAt,
      nextCustomer: metrics.nextCustomer,
      currentCustomer: metrics.currentCustomer,
      currentPickupAt: metrics.currentPickupAt,
      currentReturnAt: metrics.currentReturnAt,
      currentlyRented: metrics.currentlyRented,
      availability: metrics.availability,
      maintenanceCount: metrics.maintenanceCount,
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
  bookingRecognizedRevenue,
  isBookingCurrentlyOnRent,
  uniqueRentalDaysInRange,
  resolveFleetOperationalMap,
  ON_RENT_BOOKING_STATUSES,
};
