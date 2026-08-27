import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import GuestCustomer from '../models/GuestCustomer.js';
import AuditLog from '../models/AuditLog.js';
import AdminNotification from '../models/AdminNotification.js';
import { escapeRegex } from '../utils/helpers.js';
import { logAudit } from '../utils/adminOps.js';
import { refreshGuestStats, upsertGuestFromBooking } from '../services/guestCrm.js';
import mongoose from 'mongoose';
import { isOnlineChannel } from '../utils/bookingChannel.js';

const asObjectId = (id) => {
  if (id instanceof mongoose.Types.ObjectId) return id;
  return new mongoose.Types.ObjectId(id);
};

const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const endOfMonth = (d = new Date()) => {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  x.setHours(23, 59, 59, 999);
  return x;
};

const monthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const weekKey = (date) => {
  const d = new Date(date);
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

const sumPrice = (rows) => (rows[0]?.total || 0);

const bookedDaysFromRows = (rows, monthStart, dayEnd) =>
  rows.reduce((sum, b) => {
    const start = new Date(Math.max(new Date(b.pickupDate), monthStart));
    const end = new Date(Math.min(new Date(b.returnDate), dayEnd));
    if (end < start) return sum;
    return sum + Math.max(1, Math.ceil((end - start) / 86400000));
  }, 0);

/** KPI + operational dashboard */
export const getOpsDashboard = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const ownerOid = asObjectId(ownerId);
    const today = startOfDay();
    const next7 = new Date(today);
    next7.setDate(next7.getDate() + 7);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const dayEnd = endOfDay();

    const revenueStatuses = ['confirmed', 'ready_for_pickup', 'active', 'completed'];
    const operationalStatuses = ['pending', 'confirmed', 'ready_for_pickup', 'active'];
    const returnStatuses = ['confirmed', 'ready_for_pickup', 'active'];
    // Align with vehicle-stats: confirmed + pickup reached counts as currently out
    const onRentStatuses = ['confirmed', 'ready_for_pickup', 'active'];
    const listFields = 'reservationId customerName pickupDate returnDate status channel price createdAt car';
    const now = new Date();

    const walkInMatch = { channel: 'walk_in' };
    const onlineMatch = { channel: { $ne: 'walk_in' } };

    const [
      cars,
      totalBookings,
      onlineBookings,
      walkInBookings,
      todayBookings,
      onlineBookingsToday,
      walkInBookingsToday,
      onRentBookings,
      pendingBookings,
      monthlyRevenueAgg,
      onlineRevenueMonthAgg,
      walkInRevenueMonthAgg,
      upcomingPickups,
      upcomingReturns,
      overdueRentals,
      recentBookings,
      utilizationRows,
    ] = await Promise.all([
      Car.find({ owner: ownerId }).select('isAvaliable status').lean(),
      Booking.countDocuments({ owner: ownerId }),
      Booking.countDocuments({ owner: ownerId, ...onlineMatch }),
      Booking.countDocuments({ owner: ownerId, ...walkInMatch }),
      Booking.countDocuments({ owner: ownerId, createdAt: { $gte: today } }),
      Booking.countDocuments({ owner: ownerId, createdAt: { $gte: today }, ...onlineMatch }),
      Booking.countDocuments({ owner: ownerId, createdAt: { $gte: today }, ...walkInMatch }),
      // Vehicles currently out: pickup reached, status still on-rent (includes overdue returns)
      Booking.find({
        owner: ownerId,
        status: { $in: onRentStatuses },
        pickupDate: { $lte: now },
      })
        .select('car')
        .lean(),
      Booking.countDocuments({ owner: ownerId, status: 'pending' }),
      Booking.aggregate([
        { $match: { owner: ownerOid, status: { $in: revenueStatuses }, createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$price' } } },
      ]),
      Booking.aggregate([
        { $match: { owner: ownerOid, status: { $in: revenueStatuses }, createdAt: { $gte: monthStart }, ...onlineMatch } },
        { $group: { _id: null, total: { $sum: '$price' } } },
      ]),
      Booking.aggregate([
        { $match: { owner: ownerOid, status: { $in: revenueStatuses }, createdAt: { $gte: monthStart }, ...walkInMatch } },
        { $group: { _id: null, total: { $sum: '$price' } } },
      ]),
      Booking.find({
        owner: ownerId,
        status: { $in: operationalStatuses },
        pickupDate: { $gte: today, $lte: next7 },
      })
        .select(listFields)
        .populate('car', 'brand model')
        .sort({ pickupDate: 1 })
        .limit(8)
        .lean(),
      Booking.find({
        owner: ownerId,
        status: { $in: returnStatuses },
        returnDate: { $gte: today, $lte: next7 },
      })
        .select(listFields)
        .populate('car', 'brand model')
        .sort({ returnDate: 1 })
        .limit(8)
        .lean(),
      Booking.find({
        owner: ownerId,
        status: { $in: returnStatuses },
        returnDate: { $lt: today },
      })
        .select(listFields)
        .populate('car', 'brand model')
        .sort({ returnDate: 1 })
        .lean(),
      Booking.find({ owner: ownerId })
        .select(listFields)
        .populate('car', 'brand model')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      Booking.find({
        owner: ownerId,
        status: { $in: revenueStatuses },
        returnDate: { $gte: monthStart },
      })
        .select('pickupDate returnDate channel')
        .lean(),
    ]);

    const monthlyRevenue = sumPrice(monthlyRevenueAgg);
    const onlineRevenueMonth = sumPrice(onlineRevenueMonthAgg);
    const walkInRevenueMonth = sumPrice(walkInRevenueMonthAgg);

    const rentedCarIds = new Set(
      onRentBookings.map((b) => (b.car ? String(b.car) : '')).filter(Boolean),
    );
    const activeRentals = onRentBookings.length;
    const maintenanceVehicles = cars.filter((c) => c.status === 'maintenance').length;
    // Partition fleet: maintenance wins, then on-rent, else available
    const rentedVehicles = cars.filter(
      (c) => c.status !== 'maintenance' && rentedCarIds.has(String(c._id)),
    ).length;
    const availableVehicles = cars.filter(
      (c) => c.status !== 'maintenance' && !rentedCarIds.has(String(c._id)),
    ).length;
    const occupancyRate = cars.length > 0
      ? Math.round((rentedVehicles / cars.length) * 100)
      : 0;

    // Fleet utilization: days booked this month / (cars * days elapsed)
    const daysElapsed = Math.max(1, today.getDate());
    const bookedDays = bookedDaysFromRows(utilizationRows, monthStart, dayEnd);
    const onlineBookedDays = bookedDaysFromRows(
      utilizationRows.filter((b) => isOnlineChannel(b.channel)),
      monthStart,
      dayEnd,
    );
    const fleetUtilization = cars.length > 0
      ? Math.min(100, Math.round((bookedDays / (cars.length * daysElapsed)) * 100))
      : 0;

    res.json({
      success: true,
      dashboard: {
        todayBookings,
        onlineBookingsToday,
        walkInBookingsToday,
        activeRentals,
        pendingBookings,
        upcomingPickups,
        upcomingReturns,
        overdueRentals,
        overdueCount: overdueRentals.length,
        monthlyRevenue,
        onlineRevenueMonth,
        walkInRevenueMonth,
        occupancyRate,
        fleetUtilization,
        onlineOccupancyShare: bookedDays > 0 ? Math.round((onlineBookedDays / bookedDays) * 100) : 0,
        totalCars: cars.length,
        availableVehicles,
        maintenanceVehicles,
        rentedVehicles,
        totalBookings,
        onlineBookings,
        walkInBookings,
        recentBookings,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load dashboard' });
  }
};

/** Revenue analytics with trends */
export const getRevenueAnalytics = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const ownerOid = asObjectId(ownerId);
    // Include ready_for_pickup so completed online/WhatsApp flows count in revenue.
    const revenueStatuses = ['confirmed', 'ready_for_pickup', 'active', 'completed'];

    const now = new Date();
    const todayStart = startOfDay(now);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(monthStart.getTime() - 1);
    const prevYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const prevYearEnd = new Date(yearStart.getTime() - 1);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const eightWeeksAgo = new Date(now);
    eightWeeksAgo.setDate(now.getDate() - 56);
    eightWeeksAgo.setHours(0, 0, 0, 0);
    const fiveYearsAgo = new Date(now.getFullYear() - 4, 0, 1);

    const revenueMatch = { owner: ownerOid, status: { $in: revenueStatuses } };

    const [
      periodTotals,
      lifetime,
      byStatus,
      byChannel,
      monthlyGroups,
      yearlyGroups,
      weekSlice,
      topVehicleGroups,
      paidCount,
    ] = await Promise.all([
      Booking.aggregate([
        { $match: revenueMatch },
        {
          $group: {
            _id: null,
            todayRevenue: {
              $sum: { $cond: [{ $gte: ['$createdAt', todayStart] }, '$price', 0] },
            },
            yesterdayRevenue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ['$createdAt', yesterdayStart] },
                      { $lt: ['$createdAt', todayStart] },
                    ],
                  },
                  '$price',
                  0,
                ],
              },
            },
            weeklyRevenue: {
              $sum: { $cond: [{ $gte: ['$createdAt', weekStart] }, '$price', 0] },
            },
            prevWeeklyRevenue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ['$createdAt', prevWeekStart] },
                      { $lt: ['$createdAt', weekStart] },
                    ],
                  },
                  '$price',
                  0,
                ],
              },
            },
            monthlyRevenue: {
              $sum: { $cond: [{ $gte: ['$createdAt', monthStart] }, '$price', 0] },
            },
            prevMonthlyRevenue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ['$createdAt', prevMonthStart] },
                      { $lte: ['$createdAt', prevMonthEnd] },
                    ],
                  },
                  '$price',
                  0,
                ],
              },
            },
            yearlyRevenue: {
              $sum: { $cond: [{ $gte: ['$createdAt', yearStart] }, '$price', 0] },
            },
            prevYearlyRevenue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ['$createdAt', prevYearStart] },
                      { $lte: ['$createdAt', prevYearEnd] },
                    ],
                  },
                  '$price',
                  0,
                ],
              },
            },
            monthBookingCount: {
              $sum: { $cond: [{ $gte: ['$createdAt', monthStart] }, 1, 0] },
            },
          },
        },
      ]),
      Booking.aggregate([
        { $match: revenueMatch },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$price' },
            bookingCount: { $sum: 1 },
            onlineRevenue: {
              $sum: { $cond: [{ $ne: ['$channel', 'walk_in'] }, '$price', 0] },
            },
            walkInRevenue: {
              $sum: { $cond: [{ $eq: ['$channel', 'walk_in'] }, '$price', 0] },
            },
            onlineBookingCount: {
              $sum: { $cond: [{ $ne: ['$channel', 'walk_in'] }, 1, 0] },
            },
            walkInBookingCount: {
              $sum: { $cond: [{ $eq: ['$channel', 'walk_in'] }, 1, 0] },
            },
          },
        },
      ]),
      Booking.aggregate([
        { $match: { owner: ownerOid } },
        { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$price' } } },
      ]),
      Booking.aggregate([
        { $match: revenueMatch },
        {
          $project: {
            price: 1,
            normalizedChannel: {
              $cond: [{ $eq: ['$channel', 'walk_in'] }, 'walk_in', 'online'],
            },
          },
        },
        {
          $group: {
            _id: '$normalizedChannel',
            count: { $sum: 1 },
            revenue: { $sum: '$price' },
          },
        },
      ]),
      Booking.aggregate([
        { $match: { ...revenueMatch, createdAt: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
            amount: { $sum: '$price' },
            count: { $sum: 1 },
          },
        },
      ]),
      Booking.aggregate([
        { $match: { ...revenueMatch, createdAt: { $gte: fiveYearsAgo } } },
        {
          $group: {
            _id: { $year: '$createdAt' },
            amount: { $sum: '$price' },
          },
        },
      ]),
      Booking.find({
        owner: ownerId,
        status: { $in: revenueStatuses },
        createdAt: { $gte: eightWeeksAgo },
      })
        .select('price createdAt')
        .lean(),
      Booking.aggregate([
        { $match: { ...revenueMatch, car: { $ne: null } } },
        {
          $group: {
            _id: '$car',
            revenue: { $sum: '$price' },
            rentals: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'cars',
            localField: '_id',
            foreignField: '_id',
            as: 'car',
          },
        },
        { $unwind: { path: '$car', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            revenue: 1,
            rentals: 1,
            brand: '$car.brand',
            model: '$car.model',
            licensePlate: '$car.licensePlate',
            category: '$car.category',
          },
        },
      ]),
      Booking.countDocuments({
        owner: ownerId,
        status: { $in: revenueStatuses },
        paymentStatus: 'paid',
      }),
    ]);

    const periods = periodTotals[0] || {};
    const life = lifetime[0] || {};
    const bookingCount = life.bookingCount || 0;
    const totalRevenue = life.totalRevenue || 0;
    const averageRevenuePerRental = bookingCount > 0
      ? Math.round((totalRevenue / bookingCount) * 100) / 100
      : 0;

    const pctChange = (current, previous) => {
      const cur = Number(current) || 0;
      const prev = Number(previous) || 0;
      if (prev === 0) return cur > 0 ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 1000) / 10;
    };

    const monthlyMap = new Map(
      monthlyGroups.map((g) => [
        `${g._id.y}-${String(g._id.m).padStart(2, '0')}`,
        { amount: g.amount || 0, count: g.count || 0 },
      ]),
    );
    const monthlyTrend = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      const row = monthlyMap.get(key) || { amount: 0, count: 0 };
      monthlyTrend.push({
        key,
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        amount: row.amount,
        count: row.count,
      });
    }

    const weeklyTrend = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - (i * 7));
      const key = weekKey(d);
      const amount = weekSlice
        .filter((b) => weekKey(b.createdAt) === key)
        .reduce((s, b) => s + (b.price || 0), 0);
      weeklyTrend.push({ key, label: key, amount });
    }

    const yearlyMap = new Map(yearlyGroups.map((g) => [String(g._id), g.amount || 0]));
    const yearlyTrend = [];
    for (let i = 4; i >= 0; i--) {
      const y = String(now.getFullYear() - i);
      yearlyTrend.push({ key: y, label: y, amount: yearlyMap.get(y) || 0 });
    }

    const topVehicles = (topVehicleGroups || []).map((row) => ({
      carId: row._id,
      brand: row.brand || '',
      model: row.model || '',
      licensePlate: row.licensePlate || '',
      category: row.category || '',
      revenue: row.revenue || 0,
      rentals: row.rentals || 0,
    }));

    res.json({
      success: true,
      analytics: {
        todayRevenue: periods.todayRevenue || 0,
        yesterdayRevenue: periods.yesterdayRevenue || 0,
        weeklyRevenue: periods.weeklyRevenue || 0,
        prevWeeklyRevenue: periods.prevWeeklyRevenue || 0,
        monthlyRevenue: periods.monthlyRevenue || 0,
        prevMonthlyRevenue: periods.prevMonthlyRevenue || 0,
        yearlyRevenue: periods.yearlyRevenue || 0,
        prevYearlyRevenue: periods.prevYearlyRevenue || 0,
        monthBookingCount: periods.monthBookingCount || 0,
        totalRevenue,
        bookingCount,
        paidBookingCount: paidCount || 0,
        averageRevenuePerRental,
        onlineBookingCount: life.onlineBookingCount || 0,
        walkInBookingCount: life.walkInBookingCount || 0,
        comparisons: {
          todayVsYesterday: pctChange(periods.todayRevenue, periods.yesterdayRevenue),
          weekVsPrev: pctChange(periods.weeklyRevenue, periods.prevWeeklyRevenue),
          monthVsPrev: pctChange(periods.monthlyRevenue, periods.prevMonthlyRevenue),
          yearVsPrev: pctChange(periods.yearlyRevenue, periods.prevYearlyRevenue),
        },
        monthlyTrend,
        weeklyTrend,
        yearlyTrend,
        byStatus,
        byChannel,
        onlineRevenue: life.onlineRevenue || 0,
        walkInRevenue: life.walkInRevenue || 0,
        topVehicles,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load analytics' });
  }
};

/** Customer CRM list with filters */
export const getCrmCustomers = async (req, res) => {
  try {
    const ownerId = req.user._id;

    // Lightweight legacy backfill: create missing CRM rows without per-email findOne N+1.
    // New bookings already upsert GuestCustomer on create.
    const [bookingEmails, existingGuests] = await Promise.all([
      Booking.aggregate([
        { $match: { owner: asObjectId(ownerId), customerEmail: { $ne: '' } } },
        {
          $group: {
            _id: { $toLower: '$customerEmail' },
            name: { $last: '$customerName' },
            phone: { $last: '$customerPhone' },
            pickupLocation: { $last: '$pickupLocation' },
            createdAt: { $last: '$createdAt' },
            status: { $last: '$status' },
            price: { $last: '$price' },
          },
        },
      ]),
      GuestCustomer.find({ owner: ownerId }).select('email').lean(),
    ]);

    const existingSet = new Set(existingGuests.map((g) => g.email));
    const missing = bookingEmails.filter((row) => row._id && !existingSet.has(row._id));
    if (missing.length) {
      await Promise.all(
        missing.map((row) =>
          upsertGuestFromBooking({
            owner: ownerId,
            customerEmail: row._id,
            customerName: row.name,
            customerPhone: row.phone,
            pickupLocation: row.pickupLocation,
            createdAt: row.createdAt,
            status: row.status,
            price: row.price || 0,
          }),
        ),
      );
    }

    const {
      search, status, city, minRating, maxRating,
      minBookings, maxBookings, minSpent, maxSpent, sortBy = 'lastBookingAt',
    } = req.query;

    const query = { owner: ownerId };
    if (status) query.status = status;
    if (city) query.city = { $regex: escapeRegex(city), $options: 'i' };
    if (minRating || maxRating) {
      query.rating = {};
      if (minRating) query.rating.$gte = Number(minRating);
      if (maxRating) query.rating.$lte = Number(maxRating);
    }
    if (minBookings || maxBookings) {
      query.totalReservations = {};
      if (minBookings) query.totalReservations.$gte = Number(minBookings);
      if (maxBookings) query.totalReservations.$lte = Number(maxBookings);
    }
    if (minSpent || maxSpent) {
      query.totalSpent = {};
      if (minSpent) query.totalSpent.$gte = Number(minSpent);
      if (maxSpent) query.totalSpent.$lte = Number(maxSpent);
    }
    if (search) {
      const term = escapeRegex(search);
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
        { city: { $regex: term, $options: 'i' } },
      ];
    }

    const sortMap = {
      lastBookingAt: { lastBookingAt: -1 },
      totalSpent: { totalSpent: -1 },
      totalReservations: { totalReservations: -1 },
      rating: { rating: -1 },
      name: { name: 1 },
    };

    const customers = await GuestCustomer.find(query)
      .sort(sortMap[sortBy] || sortMap.lastBookingAt)
      .lean();

    res.json({ success: true, customers });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load customers' });
  }
};

export const getCrmCustomerDetail = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const { email } = req.params;
    const normalized = decodeURIComponent(email).toLowerCase();

    await refreshGuestStats(ownerId, normalized);
    const customer = await GuestCustomer.findOne({ owner: ownerId, email: normalized }).lean();
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const bookings = await Booking.find({ owner: ownerId, customerEmail: normalized })
      .select('reservationId status price pickupDate car createdAt')
      .populate('car', 'brand model')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, customer, bookings });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load customer' });
  }
};

/** Rate customer + private note (admin only) */
export const rateCustomer = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const { email, rating, note, bookingId } = req.body;

    if (!email || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Email and rating (1-5) are required' });
    }

    const normalized = email.trim().toLowerCase();
    let guest = await GuestCustomer.findOne({ owner: ownerId, email: normalized });
    if (!guest) {
      const last = await Booking.findOne({ owner: ownerId, customerEmail: normalized }).sort({ createdAt: -1 });
      if (!last) return res.status(404).json({ success: false, message: 'Customer not found' });
      guest = await upsertGuestFromBooking(last);
    }

    guest.internalNotes.push({
      text: note || `Rated ${rating}/5`,
      rating: Number(rating),
      booking: bookingId || null,
      createdBy: ownerId,
      createdAt: new Date(),
    });

    const ratedNotes = guest.internalNotes.filter((n) => n.rating);
    guest.ratingCount = ratedNotes.length;
    guest.rating = ratedNotes.reduce((s, n) => s + n.rating, 0) / ratedNotes.length;

    await guest.save();
    await logAudit({
      owner: ownerId,
      actor: ownerId,
      action: 'customer.rate',
      entityType: 'GuestCustomer',
      entityId: guest._id,
      details: `Rated ${guest.email} ${rating}/5`,
    });

    res.json({ success: true, message: 'Customer rated', customer: guest });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to rate customer' });
  }
};

export const addCustomerNote = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const { email, note } = req.body;
    if (!email || !note?.trim()) {
      return res.status(400).json({ success: false, message: 'Email and note are required' });
    }

    const normalized = email.trim().toLowerCase();
    let guest = await GuestCustomer.findOne({ owner: ownerId, email: normalized });
    if (!guest) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    guest.internalNotes.push({
      text: note.trim(),
      rating: null,
      createdBy: ownerId,
      createdAt: new Date(),
    });
    await guest.save();

    await logAudit({
      owner: ownerId,
      actor: ownerId,
      action: 'customer.note',
      entityType: 'GuestCustomer',
      entityId: guest._id,
      details: `Added note for ${guest.email}`,
    });

    res.json({ success: true, message: 'Note added', customer: guest });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to add note' });
  }
};

export const updateCustomerStatus = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const { email, status, blacklistReason = '' } = req.body;
    const allowed = ['new', 'regular', 'vip', 'blacklisted'];
    if (!email || !allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid email and status required' });
    }

    const guest = await GuestCustomer.findOne({ owner: ownerId, email: email.trim().toLowerCase() });
    if (!guest) return res.status(404).json({ success: false, message: 'Customer not found' });

    guest.status = status;
    guest.blacklistReason = status === 'blacklisted' ? blacklistReason : '';
    await guest.save();

    await logAudit({
      owner: ownerId,
      actor: ownerId,
      action: 'customer.status',
      entityType: 'GuestCustomer',
      entityId: guest._id,
      details: `Set ${guest.email} to ${status}`,
    });

    res.json({ success: true, message: `Customer marked as ${status}`, customer: guest });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

/** Fleet maintenance & document expiry alerts */
export const getFleetMaintenance = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const cars = await Car.find({ owner: ownerId }).sort({ brand: 1 }).lean();
    const now = new Date();
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);

    const alerts = [];
    for (const car of cars) {
      const label = `${car.brand} ${car.model}${car.licensePlate ? ` (${car.licensePlate})` : ''}`;

      if (car.nextServiceDate && new Date(car.nextServiceDate) <= in30) {
        alerts.push({
          type: 'service_date',
          severity: new Date(car.nextServiceDate) < now ? 'critical' : 'warning',
          carId: car._id,
          vehicle: label,
          message: `Service due ${new Date(car.nextServiceDate).toLocaleDateString()}`,
          date: car.nextServiceDate,
        });
      }
      if (car.nextServiceMileage && car.mileage && car.mileage >= car.nextServiceMileage) {
        alerts.push({
          type: 'service_mileage',
          severity: 'critical',
          carId: car._id,
          vehicle: label,
          message: `Service overdue by mileage (${car.mileage} / ${car.nextServiceMileage} km)`,
          date: null,
        });
      }
      if (car.insuranceExpiry && new Date(car.insuranceExpiry) <= in30) {
        alerts.push({
          type: 'insurance',
          severity: new Date(car.insuranceExpiry) < now ? 'critical' : 'warning',
          carId: car._id,
          vehicle: label,
          message: `Insurance expires ${new Date(car.insuranceExpiry).toLocaleDateString()}`,
          date: car.insuranceExpiry,
        });
      }
      if (car.registrationExpiry && new Date(car.registrationExpiry) <= in30) {
        alerts.push({
          type: 'registration',
          severity: new Date(car.registrationExpiry) < now ? 'critical' : 'warning',
          carId: car._id,
          vehicle: label,
          message: `Registration expires ${new Date(car.registrationExpiry).toLocaleDateString()}`,
          date: car.registrationExpiry,
        });
      }
    }

    alerts.sort((a, b) => (a.severity === 'critical' ? -1 : 1));

    res.json({ success: true, cars, alerts });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load maintenance data' });
  }
};

export const updateCarMaintenance = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const {
      carId, mileage, nextServiceMileage, nextServiceDate, lastServiceDate,
      insuranceExpiry, registrationExpiry, maintenanceNotes, status, licensePlate,
    } = req.body;

    const car = await Car.findById(carId);
    if (!car || car.owner?.toString() !== ownerId.toString()) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    if (mileage !== undefined) car.mileage = Number(mileage) || 0;
    if (nextServiceMileage !== undefined) car.nextServiceMileage = Number(nextServiceMileage) || 0;
    if (nextServiceDate !== undefined) car.nextServiceDate = nextServiceDate || null;
    if (lastServiceDate !== undefined) car.lastServiceDate = lastServiceDate || null;
    if (insuranceExpiry !== undefined) car.insuranceExpiry = insuranceExpiry || null;
    if (registrationExpiry !== undefined) car.registrationExpiry = registrationExpiry || null;
    if (maintenanceNotes !== undefined) car.maintenanceNotes = maintenanceNotes;
    if (licensePlate !== undefined) car.licensePlate = licensePlate;
    if (status && ['available', 'booked', 'maintenance'].includes(status)) {
      car.status = status;
      if (status === 'maintenance') car.isAvaliable = false;
    }

    await car.save();
    await logAudit({
      owner: ownerId,
      actor: ownerId,
      action: 'car.maintenance',
      entityType: 'Car',
      entityId: car._id,
      details: `Updated maintenance for ${car.brand} ${car.model}`,
    });

    res.json({ success: true, message: 'Maintenance updated', car });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to update maintenance' });
  }
};

/** Notifications */
export const getNotifications = async (req, res) => {
  try {
    const ownerId = req.user._id;
    await generateOperationalAlerts(ownerId);

    const notifications = await AdminNotification.find({ owner: ownerId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await AdminNotification.countDocuments({ owner: ownerId, isRead: false });

    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { notificationId, all } = req.body;
    if (all) {
      await AdminNotification.updateMany({ owner: req.user._id, isRead: false }, { isRead: true });
    } else if (notificationId) {
      await AdminNotification.findOneAndUpdate(
        { _id: notificationId, owner: req.user._id },
        { isRead: true },
      );
    }
    res.json({ success: true, message: 'Updated' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
};

async function generateOperationalAlerts(ownerId) {
  const today = startOfDay();
  const in2 = new Date(today);
  in2.setDate(in2.getDate() + 2);

  const overdue = await Booking.find({
    owner: ownerId,
    status: { $in: ['confirmed', 'active'] },
    returnDate: { $lt: today },
  }).limit(10);

  for (const b of overdue) {
    const exists = await AdminNotification.findOne({
      owner: ownerId,
      type: 'overdue',
      'meta.bookingId': b._id.toString(),
      createdAt: { $gte: today },
    });
    if (!exists) {
      await AdminNotification.create({
        owner: ownerId,
        type: 'overdue',
        title: 'Overdue rental',
        message: `${b.customerName || 'Guest'} — ${b.reservationId || b._id} return was due ${new Date(b.returnDate).toLocaleDateString()}`,
        link: '/owner/manage-bookings',
        meta: { bookingId: b._id.toString() },
      });
    }
  }

  const pickups = await Booking.find({
    owner: ownerId,
    status: { $in: ['pending', 'confirmed'] },
    pickupDate: { $gte: today, $lte: in2 },
  }).limit(10);

  for (const b of pickups) {
    const exists = await AdminNotification.findOne({
      owner: ownerId,
      type: 'upcoming_pickup',
      'meta.bookingId': b._id.toString(),
      createdAt: { $gte: today },
    });
    if (!exists) {
      await AdminNotification.create({
        owner: ownerId,
        type: 'upcoming_pickup',
        title: 'Upcoming pickup',
        message: `${b.customerName || 'Guest'} picks up ${new Date(b.pickupDate).toLocaleString()}`,
        link: '/owner/manage-bookings',
        meta: { bookingId: b._id.toString() },
      });
    }
  }
}

/** Audit log */
export const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 30);
    const skip = (page - 1) * limit;

    const query = { owner: req.user._id };
    if (req.query.action) query.action = { $regex: escapeRegex(req.query.action), $options: 'i' };

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load audit logs' });
  }
};

/** Global quick search */
export const globalSearch = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json({ success: true, results: { bookings: [], cars: [], customers: [] } });
    }

    const ownerId = req.user._id;
    const term = escapeRegex(q);

    const [bookings, cars, customers] = await Promise.all([
      Booking.find({
        owner: ownerId,
        $or: [
          { reservationId: { $regex: term, $options: 'i' } },
          { customerName: { $regex: term, $options: 'i' } },
          { customerEmail: { $regex: term, $options: 'i' } },
          { customerPhone: { $regex: term, $options: 'i' } },
        ],
      }).populate('car', 'brand model').limit(8).lean(),
      Car.find({
        owner: ownerId,
        $or: [
          { brand: { $regex: term, $options: 'i' } },
          { model: { $regex: term, $options: 'i' } },
          { licensePlate: { $regex: term, $options: 'i' } },
          { location: { $regex: term, $options: 'i' } },
          { locations: { $regex: term, $options: 'i' } },
        ],
      }).limit(8).lean(),
      GuestCustomer.find({
        owner: ownerId,
        $or: [
          { name: { $regex: term, $options: 'i' } },
          { email: { $regex: term, $options: 'i' } },
          { phone: { $regex: term, $options: 'i' } },
        ],
      }).limit(8).lean(),
    ]);

    res.json({ success: true, results: { bookings, cars, customers } });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
};

/** Reports export — professional XLSX (legacy CSV upgraded). */
export const exportReport = async (req, res) => {
  const { exportHubReportXlsx } = await import('./xlsxExportController.js');
  return exportHubReportXlsx(req, res);
};
