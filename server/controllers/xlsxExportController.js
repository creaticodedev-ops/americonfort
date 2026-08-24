import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import GuestCustomer from '../models/GuestCustomer.js';
import MaintenanceRecord from '../models/MaintenanceRecord.js';
import Invoice from '../models/Invoice.js';
import Contract from '../models/Contract.js';
import SamsarPayment from '../models/SamsarPayment.js';
import AgencyExpense from '../models/AgencyExpense.js';
import VehicleExpense from '../models/VehicleExpense.js';
import { logAudit } from '../utils/adminOps.js';
import { escapeRegex, parseDateRange } from '../utils/listQuery.js';
import { listClientDocuments } from '../services/clientDocumentService.js';
import { buildFleetVehicleStats } from '../services/vehicleStatsService.js';
import {
  resolvePeriodRange,
  getAccountingOverview,
} from '../services/accountingService.js';
import {
  resolveAgencyReportContext,
  buildAgencyWorkbook,
  buildDownloadFilename,
  sendWorkbook,
  filterLines,
  rentalDays,
  asNumber,
} from '../services/xlsxReport/workbook.js';

const EXPORT_CAP = 10000;

const carCities = (car = {}) => {
  const raw = [];
  if (Array.isArray(car.locations)) raw.push(...car.locations);
  if (car.location) raw.push(car.location);
  return [...new Set(raw.map((x) => String(x || '').trim()).filter(Boolean))].join(', ');
};

const carLabel = (car) => {
  if (!car) return '—';
  return `${car.brand || ''} ${car.model || ''}`.trim() || '—';
};

const auditExport = async (req, reportKey, rows) => {
  await logAudit({
    owner: req.user._id,
    actor: req.user._id,
    action: 'report.export',
    entityType: 'Report',
    details: `Exported ${reportKey} XLSX (${rows} rows)`,
  });
};

const respondXlsx = async (req, res, {
  reportKey,
  title,
  subtitle,
  filters,
  kpis,
  sheets,
  rowCount,
}) => {
  const agency = resolveAgencyReportContext(req.user);
  const workbook = await buildAgencyWorkbook({
    agency,
    title,
    subtitle,
    filters,
    kpis,
    sheets,
  });
  await auditExport(req, reportKey, rowCount);
  await sendWorkbook(res, workbook, buildDownloadFilename(agency.agencyName, reportKey));
};

/** Reservations — filtered, all matching rows (no pagination). */
export const exportReservationsXlsx = async (req, res) => {
  try {
    // Reuse the same filter parsing as CSV export via query string on this handler's route
    const { parseOwnerBookingExportQuery } = await import('./bookingExportQuery.js');
    const { query, filters } = await parseOwnerBookingExportQuery(req);

    const bookings = await Booking.find(query)
      .populate('car', 'brand model year category licensePlate fleetId')
      .sort({ createdAt: -1 })
      .limit(EXPORT_CAP)
      .lean();

    const rows = bookings.map((b) => {
      const days = rentalDays(b.pickupDate, b.returnDate);
      return {
        reservationId: b.reservationId || `RES-${String(b._id).slice(-8).toUpperCase()}`,
        channel: b.channel === 'walk_in' ? 'Walk-in' : 'Online',
        customerName: b.customerName || '',
        phone: b.customerPhone || '',
        email: b.customerEmail || '',
        vehicle: carLabel(b.car),
        plate: b.car?.licensePlate || '',
        category: b.car?.category || '',
        fleetId: b.car?.fleetId || '',
        pickupLocation: b.pickupLocation || '',
        returnLocation: b.returnLocation || '',
        pickupDate: b.pickupDate,
        returnDate: b.returnDate,
        durationDays: days,
        price: asNumber(b.price),
        paymentStatus: b.paymentStatus || '',
        status: b.status || '',
        createdAt: b.createdAt,
        notes: b.notes || '',
      };
    });

    const revenue = rows
      .filter((r) => !['cancelled'].includes(String(r.status).toLowerCase()))
      .reduce((s, r) => s + r.price, 0);

    await respondXlsx(req, res, {
      reportKey: 'reservations',
      title: 'Reservations Report',
      subtitle: 'Filtered reservation register for operational and revenue analysis',
      filters: filterLines({
        Search: filters.search,
        Status: filters.status,
        'Payment status': filters.paymentStatus,
        Channel: filters.channel,
        Customer: filters.customerName,
        Vehicle: filters.vehicle,
        'Pickup from': filters.pickupDateFrom,
        'Pickup to': filters.pickupDateTo,
        'Created from': filters.createdFrom,
        'Created to': filters.createdTo,
      }),
      kpis: [
        { label: 'Reservations', value: rows.length, format: 'number' },
        { label: 'Gross amount', value: revenue, format: 'money' },
        { label: 'Paid', value: rows.filter((r) => r.paymentStatus === 'paid').length, format: 'number' },
        { label: 'Cancelled', value: rows.filter((r) => r.status === 'cancelled').length, format: 'number' },
      ],
      sheets: [{
        name: 'Reservations',
        sectionTitle: 'Reservation details',
        columns: [
          { key: 'reservationId', header: 'Reservation #', width: 16 },
          { key: 'channel', header: 'Channel', width: 10 },
          { key: 'customerName', header: 'Customer', width: 18 },
          { key: 'phone', header: 'Phone', width: 14 },
          { key: 'email', header: 'Email', width: 22 },
          { key: 'vehicle', header: 'Vehicle', width: 18 },
          { key: 'plate', header: 'Plate', width: 12 },
          { key: 'category', header: 'Category', width: 12 },
          { key: 'fleetId', header: 'Fleet ID', width: 12 },
          { key: 'pickupLocation', header: 'Pickup location', width: 18 },
          { key: 'returnLocation', header: 'Return location', width: 18 },
          { key: 'pickupDate', header: 'Pickup', width: 16, type: 'datetime' },
          { key: 'returnDate', header: 'Return', width: 16, type: 'datetime' },
          { key: 'durationDays', header: 'Days', width: 8, type: 'number' },
          { key: 'price', header: 'Total', width: 12, type: 'money' },
          { key: 'paymentStatus', header: 'Payment', width: 12, type: 'status' },
          { key: 'status', header: 'Status', width: 14, type: 'status' },
          { key: 'createdAt', header: 'Created', width: 12, type: 'date' },
          { key: 'notes', header: 'Notes', width: 24, wrap: true },
        ],
        rows,
        totals: { label: 'Totals', sumKeys: ['price', 'durationDays'] },
      }],
      rowCount: rows.length,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to export reservations' });
  }
};

export const exportCustomersXlsx = async (req, res) => {
  try {
    const ownerId = req.user._id;
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
      .limit(EXPORT_CAP)
      .lean();

    const rows = customers.map((c) => ({
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      city: c.city || '',
      status: c.status || '',
      rating: asNumber(c.rating),
      reservations: asNumber(c.totalReservations),
      cancellations: asNumber(c.cancelledReservations),
      totalSpent: asNumber(c.totalSpent),
      lastBookingAt: c.lastBookingAt,
      firstBookingAt: c.firstBookingAt,
    }));

    await respondXlsx(req, res, {
      reportKey: 'customers',
      title: 'Customer CRM Report',
      subtitle: 'Customer portfolio with reservation activity and lifetime value',
      filters: filterLines({
        Search: search,
        Status: status,
        City: city,
        'Min rating': minRating,
        'Min bookings': minBookings,
        'Min spent': minSpent,
      }),
      kpis: [
        { label: 'Customers', value: rows.length, format: 'number' },
        { label: 'Lifetime revenue', value: rows.reduce((s, r) => s + r.totalSpent, 0), format: 'money' },
        { label: 'VIP', value: rows.filter((r) => r.status === 'vip').length, format: 'number' },
        { label: 'Reservations', value: rows.reduce((s, r) => s + r.reservations, 0), format: 'number' },
      ],
      sheets: [{
        name: 'Customers',
        columns: [
          { key: 'name', header: 'Customer', width: 20 },
          { key: 'email', header: 'Email', width: 24 },
          { key: 'phone', header: 'Phone', width: 14 },
          { key: 'city', header: 'City', width: 14 },
          { key: 'status', header: 'Segment', width: 12, type: 'status' },
          { key: 'rating', header: 'Rating', width: 10, type: 'number', numFmt: '0.0' },
          { key: 'reservations', header: 'Reservations', width: 12, type: 'number' },
          { key: 'cancellations', header: 'Cancellations', width: 12, type: 'number' },
          { key: 'totalSpent', header: 'Lifetime spend', width: 14, type: 'money' },
          { key: 'lastBookingAt', header: 'Last rental', width: 12, type: 'date' },
          { key: 'firstBookingAt', header: 'First rental', width: 12, type: 'date' },
        ],
        rows,
        totals: { label: 'Totals', sumKeys: ['reservations', 'cancellations', 'totalSpent'] },
      }],
      rowCount: rows.length,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to export customers' });
  }
};

export const exportFleetXlsx = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const {
      search = '', fleetId = '', vin = '', plate = '', status = '', branch = '', category = '',
    } = req.query;

    const filter = { owner: ownerId };
    if (status) filter.status = status;
    if (branch) filter.branch = new RegExp(escapeRegex(branch), 'i');
    if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
    if (fleetId) filter.fleetId = new RegExp(escapeRegex(fleetId), 'i');
    if (vin) filter.vin = new RegExp(escapeRegex(vin), 'i');
    if (plate) filter.licensePlate = new RegExp(escapeRegex(plate), 'i');
    if (String(search).trim()) {
      const q = escapeRegex(String(search).trim());
      filter.$or = [
        { fleetId: new RegExp(q, 'i') },
        { vin: new RegExp(q, 'i') },
        { licensePlate: new RegExp(q, 'i') },
        { brand: new RegExp(q, 'i') },
        { model: new RegExp(q, 'i') },
        { branch: new RegExp(q, 'i') },
      ];
    }

    const cars = await Car.find(filter).sort({ fleetId: 1, brand: 1 }).limit(EXPORT_CAP).lean();
    const rows = cars.map((c) => ({
      fleetId: c.fleetId || '',
      brand: c.brand || '',
      model: c.model || '',
      year: asNumber(c.year),
      category: c.category || '',
      plate: c.licensePlate || '',
      vin: c.vin || '',
      branch: c.branch || '',
      cities: carCities(c),
      mileage: asNumber(c.mileage),
      pricePerDay: asNumber(c.pricePerDay),
      status: c.status || '',
      available: c.isAvaliable ? 'Available' : 'Offline',
      website: c.visibleOnWebsite === false ? 'Hidden' : 'Visible',
      transmission: c.transmission || '',
      fuel: c.fuel_type || '',
      seats: asNumber(c.seating_capacity),
      insuranceExpiry: c.insuranceExpiry,
      registrationExpiry: c.registrationExpiry,
      nextServiceDate: c.nextServiceDate,
    }));

    await respondXlsx(req, res, {
      reportKey: 'fleet',
      title: 'Fleet Inventory Report',
      subtitle: 'Physical vehicles with pricing, availability, and compliance dates',
      filters: filterLines({
        Search: search, Status: status, Branch: branch, Category: category, 'Fleet ID': fleetId, VIN: vin, Plate: plate,
      }),
      kpis: [
        { label: 'Vehicles', value: rows.length, format: 'number' },
        { label: 'Available', value: rows.filter((r) => r.available === 'Available' && r.status !== 'maintenance').length, format: 'number' },
        { label: 'Maintenance', value: rows.filter((r) => r.status === 'maintenance').length, format: 'number' },
        { label: 'On website', value: rows.filter((r) => r.website === 'Visible').length, format: 'number' },
      ],
      sheets: [{
        name: 'Fleet',
        columns: [
          { key: 'fleetId', header: 'Fleet ID', width: 12 },
          { key: 'brand', header: 'Brand', width: 12 },
          { key: 'model', header: 'Model', width: 14 },
          { key: 'year', header: 'Year', width: 8, type: 'number' },
          { key: 'category', header: 'Category', width: 12 },
          { key: 'plate', header: 'Plate', width: 12 },
          { key: 'vin', header: 'VIN', width: 18 },
          { key: 'branch', header: 'Branch', width: 14 },
          { key: 'cities', header: 'Cities', width: 20 },
          { key: 'mileage', header: 'Mileage (km)', width: 12, type: 'number' },
          { key: 'pricePerDay', header: 'Price / day', width: 12, type: 'money' },
          { key: 'status', header: 'Status', width: 12, type: 'status' },
          { key: 'available', header: 'Availability', width: 12, type: 'status' },
          { key: 'website', header: 'Website', width: 10, type: 'status' },
          { key: 'transmission', header: 'Transmission', width: 12 },
          { key: 'fuel', header: 'Fuel', width: 10 },
          { key: 'seats', header: 'Seats', width: 8, type: 'number' },
          { key: 'insuranceExpiry', header: 'Insurance expiry', width: 14, type: 'date' },
          { key: 'registrationExpiry', header: 'Registration expiry', width: 14, type: 'date' },
          { key: 'nextServiceDate', header: 'Next service', width: 12, type: 'date' },
        ],
        rows,
      }],
      rowCount: rows.length,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to export fleet' });
  }
};

export const exportVehicleStatsXlsx = async (req, res) => {
  try {
    const payload = await buildFleetVehicleStats({
      ownerId: req.user._id,
      period: req.query.period || 'month',
      from: req.query.from,
      to: req.query.to,
    });

    const vehicles = payload.vehicles || [];
    const kpis = payload.kpis || {};
    const period = payload.period || {};
    const rows = vehicles.map((v) => ({
      fleetId: v.fleetId || '',
      vehicle: `${v.brand || ''} ${v.model || ''}`.trim(),
      plate: v.licensePlate || '',
      category: v.category || '',
      availability: v.availability || v.status || '',
      performance: v.performance || '',
      rentals: asNumber(v.totalRentals),
      completed: asNumber(v.completedRentals),
      upcoming: asNumber(v.upcomingRentals),
      revenue: asNumber(v.revenue),
      rentalDays: asNumber(v.rentalDays),
      utilization: asNumber(v.utilization),
      avgDuration: asNumber(v.avgDuration),
      lastRentalAt: v.lastRentalAt,
    }));

    await respondXlsx(req, res, {
      reportKey: 'vehicle-statistics',
      title: 'Vehicle Performance Report',
      subtitle: `Period ${period.fromDate || ''} → ${period.toDate || ''}`,
      filters: filterLines({
        Period: req.query.period || period.label || 'month',
        From: req.query.from || period.fromDate,
        To: req.query.to || period.toDate,
      }),
      kpis: [
        { label: 'Fleet revenue', value: asNumber(kpis.totalRevenue), format: 'money' },
        { label: 'Rentals', value: asNumber(kpis.totalRentals), format: 'number' },
        { label: 'Rental days', value: asNumber(kpis.rentalDays), format: 'number' },
        { label: 'Utilization', value: asNumber(kpis.fleetUtilization) / 100, format: 'percent' },
      ],
      sheets: [{
        name: 'Performance',
        columns: [
          { key: 'fleetId', header: 'Fleet ID', width: 12 },
          { key: 'vehicle', header: 'Vehicle', width: 20 },
          { key: 'plate', header: 'Plate', width: 12 },
          { key: 'category', header: 'Category', width: 12 },
          { key: 'availability', header: 'Availability', width: 12, type: 'status' },
          { key: 'performance', header: 'Rank', width: 12, type: 'status' },
          { key: 'rentals', header: 'Rentals', width: 10, type: 'number' },
          { key: 'completed', header: 'Completed', width: 10, type: 'number' },
          { key: 'upcoming', header: 'Upcoming', width: 10, type: 'number' },
          { key: 'revenue', header: 'Revenue', width: 12, type: 'money' },
          { key: 'rentalDays', header: 'Rental days', width: 12, type: 'number' },
          { key: 'utilization', header: 'Utilization', width: 12, type: 'percent' },
          { key: 'avgDuration', header: 'Avg. days', width: 10, type: 'number', numFmt: '0.0' },
          { key: 'lastRentalAt', header: 'Last rental', width: 12, type: 'date' },
        ],
        rows,
        totals: { label: 'Totals', sumKeys: ['rentals', 'completed', 'upcoming', 'revenue', 'rentalDays'] },
      }],
      rowCount: rows.length,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to export vehicle statistics' });
  }
};

export const exportMaintenanceXlsx = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const { carId, status, type } = req.query;
    const filter = { owner: ownerId };
    if (carId && mongoose.isValidObjectId(carId)) filter.car = carId;
    if (status) filter.status = status;
    if (type) filter.type = type;

    const records = await MaintenanceRecord.find(filter)
      .populate('car', 'brand model licensePlate fleetId branch')
      .sort({ scheduledDate: -1, createdAt: -1 })
      .limit(EXPORT_CAP)
      .lean();

    const rows = records.map((r) => ({
      vehicle: carLabel(r.car),
      fleetId: r.car?.fleetId || '',
      plate: r.car?.licensePlate || '',
      branch: r.car?.branch || '',
      type: r.type || '',
      title: r.title || '',
      status: r.status || '',
      scheduledDate: r.scheduledDate,
      completedDate: r.completedDate,
      mileage: asNumber(r.mileageAtService),
      cost: asNumber(r.cost),
      vendor: r.vendor || '',
      invoiceRef: r.invoiceRef || '',
      nextDueDate: r.nextDueDate,
      nextDueKm: asNumber(r.nextDueMileage),
      notes: r.notes || '',
    }));

    await respondXlsx(req, res, {
      reportKey: 'maintenance',
      title: 'Maintenance Report',
      subtitle: 'Service history, costs, and upcoming due dates',
      filters: filterLines({ Status: status, Type: type, Vehicle: carId }),
      kpis: [
        { label: 'Jobs', value: rows.length, format: 'number' },
        { label: 'Total cost', value: rows.reduce((s, r) => s + r.cost, 0), format: 'money' },
        { label: 'Completed', value: rows.filter((r) => r.status === 'completed').length, format: 'number' },
        { label: 'Open', value: rows.filter((r) => ['scheduled', 'in_progress'].includes(r.status)).length, format: 'number' },
      ],
      sheets: [{
        name: 'Maintenance',
        columns: [
          { key: 'vehicle', header: 'Vehicle', width: 18 },
          { key: 'fleetId', header: 'Fleet ID', width: 12 },
          { key: 'plate', header: 'Plate', width: 12 },
          { key: 'type', header: 'Type', width: 14, type: 'status' },
          { key: 'title', header: 'Title', width: 22 },
          { key: 'status', header: 'Status', width: 12, type: 'status' },
          { key: 'scheduledDate', header: 'Scheduled', width: 12, type: 'date' },
          { key: 'completedDate', header: 'Completed', width: 12, type: 'date' },
          { key: 'mileage', header: 'Mileage', width: 10, type: 'number' },
          { key: 'cost', header: 'Cost', width: 12, type: 'money' },
          { key: 'vendor', header: 'Vendor', width: 14 },
          { key: 'invoiceRef', header: 'Invoice ref', width: 12 },
          { key: 'nextDueDate', header: 'Next due', width: 12, type: 'date' },
          { key: 'nextDueKm', header: 'Next due km', width: 12, type: 'number' },
          { key: 'notes', header: 'Notes', width: 22, wrap: true },
        ],
        rows,
        totals: { label: 'Totals', sumKeys: ['cost'] },
      }],
      rowCount: rows.length,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to export maintenance' });
  }
};

export const exportAccountingXlsx = async (req, res) => {
  try {
    const kind = String(req.query.kind || req.params.kind || 'revenues');
    const ownerId = req.user._id;
    const range = resolvePeriodRange(req.query.period || 'custom', req.query.from, req.query.to);

    if (kind === 'revenues') {
      const REVENUE_STATUSES = ['confirmed', 'ready_for_pickup', 'active', 'completed'];
      const match = {
        owner: ownerId,
        status: { $in: REVENUE_STATUSES },
      };
      if (range.from || range.to) {
        match.createdAt = {};
        if (range.from) match.createdAt.$gte = range.from;
        if (range.to) match.createdAt.$lte = range.to;
      }
      if (req.query.carId && mongoose.isValidObjectId(req.query.carId)) match.car = req.query.carId;
      if (req.query.paymentStatus) match.paymentStatus = req.query.paymentStatus;
      if ((req.query.bookingId || req.query.reservationId) && mongoose.isValidObjectId(req.query.bookingId || req.query.reservationId)) {
        match._id = req.query.bookingId || req.query.reservationId;
      }

      const items = await Booking.find(match)
        .populate('car', 'brand model licensePlate')
        .select('reservationId customerName pickupDate returnDate price paymentStatus status channel createdAt car')
        .sort({ createdAt: -1 })
        .limit(EXPORT_CAP)
        .lean();

      const rows = items.map((b) => ({
        reservationId: b.reservationId || '',
        customer: b.customerName || '',
        vehicle: carLabel(b.car),
        plate: b.car?.licensePlate || '',
        channel: b.channel === 'walk_in' ? 'Walk-in' : 'Online',
        pickupDate: b.pickupDate,
        returnDate: b.returnDate,
        amount: asNumber(b.price),
        paymentStatus: b.paymentStatus || '',
        status: b.status || '',
        createdAt: b.createdAt,
      }));
      const gross = rows.reduce((s, r) => s + r.amount, 0);
      const paid = rows.filter((r) => r.paymentStatus === 'paid').reduce((s, r) => s + r.amount, 0);
      await respondXlsx(req, res, {
        reportKey: 'accounting-revenues',
        title: 'Revenue Register',
        subtitle: 'Gross rental revenue from confirmed and completed bookings',
        filters: filterLines({
          Period: req.query.period || 'custom',
          From: req.query.from || range.from?.toISOString?.()?.slice(0, 10),
          To: req.query.to || range.to?.toISOString?.()?.slice(0, 10),
          'Payment status': req.query.paymentStatus,
        }),
        kpis: [
          { label: 'Rows', value: rows.length, format: 'number' },
          { label: 'Gross revenue', value: gross, format: 'money' },
          { label: 'Paid', value: paid, format: 'money' },
          { label: 'Unpaid', value: gross - paid, format: 'money' },
        ],
        sheets: [{
          name: 'Revenues',
          columns: [
            { key: 'reservationId', header: 'Reservation #', width: 16 },
            { key: 'customer', header: 'Customer', width: 18 },
            { key: 'vehicle', header: 'Vehicle', width: 18 },
            { key: 'plate', header: 'Plate', width: 12 },
            { key: 'channel', header: 'Channel', width: 10 },
            { key: 'pickupDate', header: 'Pickup', width: 12, type: 'date' },
            { key: 'returnDate', header: 'Return', width: 12, type: 'date' },
            { key: 'amount', header: 'Amount', width: 12, type: 'money' },
            { key: 'paymentStatus', header: 'Payment', width: 12, type: 'status' },
            { key: 'status', header: 'Status', width: 14, type: 'status' },
            { key: 'createdAt', header: 'Created', width: 12, type: 'date' },
          ],
          rows,
          totals: { label: 'Totals', sumKeys: ['amount'] },
        }],
        rowCount: rows.length,
      });
      return;
    }

    if (kind === 'samsar-payments') {
      const filter = { owner: ownerId };
      if (req.query.status && req.query.status !== 'all') filter.paymentStatus = req.query.status;
      if (req.query.samsarId && mongoose.isValidObjectId(req.query.samsarId)) filter.samsar = req.query.samsarId;
      const dateRange = parseDateRange(req.query.from, req.query.to, 'paymentDate');
      if (dateRange) Object.assign(filter, dateRange);
      const items = await SamsarPayment.find(filter)
        .populate('samsar', 'fullName phone')
        .populate('booking', 'reservationId customerName')
        .sort({ paymentDate: -1 })
        .limit(EXPORT_CAP)
        .lean();
      const rows = items.map((p) => ({
        date: p.paymentDate,
        samsar: p.samsar?.fullName || '',
        phone: p.samsar?.phone || '',
        reservationId: p.booking?.reservationId || '',
        customer: p.booking?.customerName || '',
        amount: asNumber(p.amount),
        method: p.paymentMethod || '',
        status: p.paymentStatus || '',
        notes: p.notes || '',
      }));
      await respondXlsx(req, res, {
        reportKey: 'samsar-payments',
        title: 'Samsar Payments',
        subtitle: 'Partner commission and referral payments',
        filters: filterLines({ Status: req.query.status, From: req.query.from, To: req.query.to }),
        kpis: [
          { label: 'Payments', value: rows.length, format: 'number' },
          { label: 'Total', value: rows.reduce((s, r) => s + r.amount, 0), format: 'money' },
        ],
        sheets: [{
          name: 'Samsar payments',
          columns: [
            { key: 'date', header: 'Date', width: 12, type: 'date' },
            { key: 'samsar', header: 'Samsar', width: 18 },
            { key: 'phone', header: 'Phone', width: 14 },
            { key: 'reservationId', header: 'Reservation #', width: 14 },
            { key: 'customer', header: 'Customer', width: 16 },
            { key: 'amount', header: 'Amount', width: 12, type: 'money' },
            { key: 'method', header: 'Method', width: 12 },
            { key: 'status', header: 'Status', width: 12, type: 'status' },
            { key: 'notes', header: 'Notes', width: 22, wrap: true },
          ],
          rows,
          totals: { label: 'Totals', sumKeys: ['amount'] },
        }],
        rowCount: rows.length,
      });
      return;
    }

    if (kind === 'agency-expenses') {
      const filter = { owner: ownerId };
      if (req.query.status && req.query.status !== 'all') filter.paymentStatus = req.query.status;
      if (req.query.category) filter.category = req.query.category;
      const dateRange = parseDateRange(req.query.from, req.query.to, 'expenseDate');
      if (dateRange) Object.assign(filter, dateRange);
      const items = await AgencyExpense.find(filter).sort({ expenseDate: -1 }).limit(EXPORT_CAP).lean();
      const rows = items.map((e) => ({
        date: e.expenseDate,
        category: e.category || '',
        description: e.description || '',
        amount: asNumber(e.amount),
        status: e.paymentStatus || '',
        notes: e.notes || '',
      }));
      await respondXlsx(req, res, {
        reportKey: 'agency-expenses',
        title: 'Agency Expenses',
        subtitle: 'Operating expenses for the agency',
        filters: filterLines({ Status: req.query.status, Category: req.query.category, From: req.query.from, To: req.query.to }),
        kpis: [
          { label: 'Expenses', value: rows.length, format: 'number' },
          { label: 'Total', value: rows.reduce((s, r) => s + r.amount, 0), format: 'money' },
        ],
        sheets: [{
          name: 'Agency expenses',
          columns: [
            { key: 'date', header: 'Date', width: 12, type: 'date' },
            { key: 'category', header: 'Category', width: 14 },
            { key: 'description', header: 'Description', width: 28, wrap: true },
            { key: 'amount', header: 'Amount', width: 12, type: 'money' },
            { key: 'status', header: 'Payment', width: 12, type: 'status' },
            { key: 'notes', header: 'Notes', width: 22, wrap: true },
          ],
          rows,
          totals: { label: 'Totals', sumKeys: ['amount'] },
        }],
        rowCount: rows.length,
      });
      return;
    }

    if (kind === 'vehicle-expenses') {
      const filter = { owner: ownerId };
      if (req.query.status && req.query.status !== 'all') filter.paymentStatus = req.query.status;
      if (req.query.category) filter.category = req.query.category;
      if (req.query.carId && mongoose.isValidObjectId(req.query.carId)) filter.car = req.query.carId;
      const dateRange = parseDateRange(req.query.from, req.query.to, 'expenseDate');
      if (dateRange) Object.assign(filter, dateRange);
      const items = await VehicleExpense.find(filter)
        .populate('car', 'brand model licensePlate fleetId')
        .sort({ expenseDate: -1 })
        .limit(EXPORT_CAP)
        .lean();
      const rows = items.map((e) => ({
        date: e.expenseDate,
        vehicle: carLabel(e.car),
        plate: e.car?.licensePlate || '',
        fleetId: e.car?.fleetId || '',
        category: e.category || '',
        description: e.description || '',
        amount: asNumber(e.amount),
        status: e.paymentStatus || '',
        notes: e.notes || '',
      }));
      await respondXlsx(req, res, {
        reportKey: 'vehicle-expenses',
        title: 'Vehicle Expenses',
        subtitle: 'Per-vehicle operating costs',
        filters: filterLines({ Status: req.query.status, Category: req.query.category, From: req.query.from, To: req.query.to }),
        kpis: [
          { label: 'Expenses', value: rows.length, format: 'number' },
          { label: 'Total', value: rows.reduce((s, r) => s + r.amount, 0), format: 'money' },
        ],
        sheets: [{
          name: 'Vehicle expenses',
          columns: [
            { key: 'date', header: 'Date', width: 12, type: 'date' },
            { key: 'vehicle', header: 'Vehicle', width: 18 },
            { key: 'plate', header: 'Plate', width: 12 },
            { key: 'fleetId', header: 'Fleet ID', width: 12 },
            { key: 'category', header: 'Category', width: 14 },
            { key: 'description', header: 'Description', width: 24, wrap: true },
            { key: 'amount', header: 'Amount', width: 12, type: 'money' },
            { key: 'status', header: 'Payment', width: 12, type: 'status' },
            { key: 'notes', header: 'Notes', width: 20, wrap: true },
          ],
          rows,
          totals: { label: 'Totals', sumKeys: ['amount'] },
        }],
        rowCount: rows.length,
      });
      return;
    }

    if (kind === 'overview') {
      const overview = await getAccountingOverview(ownerId, {
        period: req.query.period || 'month',
        from: req.query.from,
        to: req.query.to,
      });
      const k = overview.kpis || {};
      await respondXlsx(req, res, {
        reportKey: 'accounting-overview',
        title: 'Accounting Overview',
        subtitle: `Financial summary (${overview.period})`,
        filters: filterLines({
          Period: overview.period,
          From: overview.from?.toISOString?.()?.slice(0, 10),
          To: overview.to?.toISOString?.()?.slice(0, 10),
        }),
        kpis: [
          { label: 'Gross revenue', value: asNumber(k.grossRevenue), format: 'money' },
          { label: 'Samsar payments', value: asNumber(k.samsarPayments), format: 'money' },
          { label: 'Agency expenses', value: asNumber(k.agencyExpenses), format: 'money' },
          { label: 'Net result', value: asNumber(k.netResult), format: 'money' },
        ],
        sheets: [{
          name: 'Overview',
          columns: [
            { key: 'metric', header: 'Metric', width: 28 },
            { key: 'amount', header: 'Amount', width: 16, type: 'money' },
          ],
          rows: [
            { metric: 'Gross revenue', amount: asNumber(k.grossRevenue) },
            { metric: 'Paid revenue', amount: asNumber(k.paidRevenue) },
            { metric: 'Unpaid revenue', amount: asNumber(k.unpaidRevenue) },
            { metric: 'Partner discounts (display)', amount: asNumber(k.partnerDiscountApplied) },
            { metric: 'Samsar payments', amount: asNumber(k.samsarPayments) },
            { metric: 'Agency expenses', amount: asNumber(k.agencyExpenses) },
            { metric: 'Vehicle expenses', amount: asNumber(k.vehicleExpenses) },
            { metric: 'Net result', amount: asNumber(k.netResult) },
          ],
        }],
        rowCount: 8,
      });
      return;
    }

    return res.status(400).json({ success: false, message: 'Unknown accounting export kind' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to export accounting data' });
  }
};

export const exportInvoicesXlsx = async (req, res) => {
  try {
    const { search = '', customerName = '', cin = '', phone = '' } = req.query;
    const query = { owner: req.user._id };
    if (search?.trim()) {
      const term = search.trim();
      query.$or = [
        { invoiceNumber: { $regex: term, $options: 'i' } },
        { customerName: { $regex: term, $options: 'i' } },
        { customerPhone: { $regex: term, $options: 'i' } },
        { customerEmail: { $regex: term, $options: 'i' } },
      ];
    }
    if (customerName?.trim()) query.customerName = { $regex: customerName.trim(), $options: 'i' };
    if (phone?.trim()) query.customerPhone = { $regex: phone.trim(), $options: 'i' };

    const invoices = await Invoice.find(query)
      .populate({ path: 'booking', select: 'reservationId pickupDate returnDate' })
      .sort({ createdAt: -1 })
      .limit(EXPORT_CAP)
      .lean();

    const rows = invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber || '',
      reservationId: inv.booking?.reservationId || '',
      customer: inv.customerName || '',
      phone: inv.customerPhone || '',
      email: inv.customerEmail || '',
      vehicle: [inv.vehicleBrand, inv.vehicleModel].filter(Boolean).join(' '),
      plate: inv.vehiclePlate || '',
      invoiceDate: inv.invoiceDate || inv.createdAt,
      dueDate: inv.dueDate,
      subtotal: asNumber(inv.subtotal),
      discount: asNumber(inv.discountAmount),
      total: asNumber(inv.totalAmount),
      status: inv.paymentStatus || inv.status || '',
    }));

    await respondXlsx(req, res, {
      reportKey: 'invoices',
      title: 'Invoices Register',
      subtitle: 'Customer invoices with amounts and payment status',
      filters: filterLines({ Search: search, Customer: customerName, Phone: phone, CIN: cin }),
      kpis: [
        { label: 'Invoices', value: rows.length, format: 'number' },
        { label: 'Total billed', value: rows.reduce((s, r) => s + r.total, 0), format: 'money' },
        { label: 'Paid', value: rows.filter((r) => r.status === 'paid').length, format: 'number' },
      ],
      sheets: [{
        name: 'Invoices',
        columns: [
          { key: 'invoiceNumber', header: 'Invoice #', width: 16 },
          { key: 'reservationId', header: 'Reservation #', width: 14 },
          { key: 'customer', header: 'Customer', width: 18 },
          { key: 'phone', header: 'Phone', width: 14 },
          { key: 'email', header: 'Email', width: 22 },
          { key: 'vehicle', header: 'Vehicle', width: 16 },
          { key: 'plate', header: 'Plate', width: 12 },
          { key: 'invoiceDate', header: 'Invoice date', width: 12, type: 'date' },
          { key: 'dueDate', header: 'Due date', width: 12, type: 'date' },
          { key: 'subtotal', header: 'Subtotal', width: 12, type: 'money' },
          { key: 'discount', header: 'Discount', width: 12, type: 'money' },
          { key: 'total', header: 'Total', width: 12, type: 'money' },
          { key: 'status', header: 'Status', width: 12, type: 'status' },
        ],
        rows,
        totals: { label: 'Totals', sumKeys: ['subtotal', 'discount', 'total'] },
      }],
      rowCount: rows.length,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to export invoices' });
  }
};

export const exportContractsXlsx = async (req, res) => {
  try {
    const { search = '', customerName = '', phone = '' } = req.query;
    const query = { owner: req.user._id };
    if (search?.trim()) {
      const term = search.trim();
      query.$or = [
        { contractNumber: { $regex: term, $options: 'i' } },
        { customerName: { $regex: term, $options: 'i' } },
        { customerPhone: { $regex: term, $options: 'i' } },
        { customerEmail: { $regex: term, $options: 'i' } },
      ];
    }
    if (customerName?.trim()) query.customerName = { $regex: customerName.trim(), $options: 'i' };
    if (phone?.trim()) query.customerPhone = { $regex: phone.trim(), $options: 'i' };

    const contracts = await Contract.find(query)
      .populate({
        path: 'booking',
        select: 'reservationId pickupDate returnDate price status signatureStatus completion',
        populate: { path: 'car', select: 'brand model licensePlate' },
      })
      .sort({ createdAt: -1 })
      .limit(EXPORT_CAP)
      .lean();

    const rows = contracts.map((c) => ({
      contractNumber: c.contractNumber || '',
      reservationId: c.booking?.reservationId || '',
      customer: c.customerName || c.booking?.customerName || '',
      phone: c.customerPhone || '',
      email: c.customerEmail || '',
      vehicle: carLabel(c.booking?.car),
      plate: c.booking?.car?.licensePlate || '',
      pickupDate: c.booking?.pickupDate,
      returnDate: c.booking?.returnDate,
      amount: asNumber(c.booking?.price),
      bookingStatus: c.booking?.status || '',
      signatureStatus: c.booking?.signatureStatus || c.booking?.completion?.signatureStatus || c.status || '',
      createdAt: c.createdAt,
    }));

    await respondXlsx(req, res, {
      reportKey: 'contracts',
      title: 'Contracts Register',
      subtitle: 'Rental contracts with signature and booking linkage',
      filters: filterLines({ Search: search, Customer: customerName, Phone: phone }),
      kpis: [
        { label: 'Contracts', value: rows.length, format: 'number' },
        { label: 'Signed', value: rows.filter((r) => String(r.signatureStatus).toLowerCase().includes('sign')).length, format: 'number' },
      ],
      sheets: [{
        name: 'Contracts',
        columns: [
          { key: 'contractNumber', header: 'Contract #', width: 16 },
          { key: 'reservationId', header: 'Reservation #', width: 14 },
          { key: 'customer', header: 'Customer', width: 18 },
          { key: 'phone', header: 'Phone', width: 14 },
          { key: 'vehicle', header: 'Vehicle', width: 18 },
          { key: 'plate', header: 'Plate', width: 12 },
          { key: 'pickupDate', header: 'Pickup', width: 12, type: 'date' },
          { key: 'returnDate', header: 'Return', width: 12, type: 'date' },
          { key: 'amount', header: 'Amount', width: 12, type: 'money' },
          { key: 'bookingStatus', header: 'Booking status', width: 14, type: 'status' },
          { key: 'signatureStatus', header: 'Signature', width: 12, type: 'status' },
          { key: 'createdAt', header: 'Created', width: 12, type: 'date' },
        ],
        rows,
        totals: { label: 'Totals', sumKeys: ['amount'] },
      }],
      rowCount: rows.length,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to export contracts' });
  }
};

export const exportClientDocumentsXlsx = async (req, res) => {
  try {
    const result = await listClientDocuments({
      ownerId: req.user._id,
      query: { ...req.query, page: 1, limit: 50 },
    });
    // Pull multiple pages if needed
    let items = result.items || [];
    const total = result.pagination?.total || items.length;
    if (total > items.length) {
      const pages = Math.min(Math.ceil(total / 50), Math.ceil(EXPORT_CAP / 50));
      for (let page = 2; page <= pages; page += 1) {
        const more = await listClientDocuments({
          ownerId: req.user._id,
          query: { ...req.query, page, limit: 50 },
        });
        items = items.concat(more.items || []);
      }
    }

    const rows = items.map((d) => ({
      customer: d.customerName || '',
      phone: d.customerPhone || '',
      email: d.customerEmail || '',
      cin: d.identityDocumentNumber || '',
      passport: d.passportNumber || '',
      documentCount: asNumber(d.documentCount ?? d.files?.length),
      reservationCount: asNumber(d.reservationCount),
      lastReservationAt: d.lastReservationAt,
      updatedAt: d.updatedAt,
    }));

    await respondXlsx(req, res, {
      reportKey: 'client-documents',
      title: 'Client Documents Register',
      subtitle: 'Identity and license documents on file for returning clients',
      filters: filterLines({
        Search: req.query.search,
        Status: req.query.docStatus || req.query.status,
        Type: req.query.documentType || req.query.docType,
        Channel: req.query.channel,
      }),
      kpis: [
        { label: 'Clients', value: rows.length, format: 'number' },
        { label: 'With documents', value: rows.filter((r) => r.documentCount > 0).length, format: 'number' },
      ],
      sheets: [{
        name: 'Client documents',
        columns: [
          { key: 'customer', header: 'Customer', width: 20 },
          { key: 'phone', header: 'Phone', width: 14 },
          { key: 'email', header: 'Email', width: 22 },
          { key: 'cin', header: 'CIN / ID', width: 14 },
          { key: 'passport', header: 'Passport', width: 14 },
          { key: 'documentCount', header: 'Files', width: 8, type: 'number' },
          { key: 'reservationCount', header: 'Reservations', width: 12, type: 'number' },
          { key: 'lastReservationAt', header: 'Last reservation', width: 14, type: 'date' },
          { key: 'updatedAt', header: 'Updated', width: 12, type: 'date' },
        ],
        rows,
      }],
      rowCount: rows.length,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to export client documents' });
  }
};

export const exportAnalyticsXlsx = async (req, res) => {
  try {
    // Delegate to existing analytics computation via internal HTTP-less call pattern:
    // Reuse getRevenueAnalytics logic by importing controller is awkward; query bookings here.
    const ownerId = req.user._id;
    const revenueStatuses = ['confirmed', 'ready_for_pickup', 'active', 'completed'];
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const bookings = await Booking.find({
      owner: ownerId,
      status: { $in: revenueStatuses },
    })
      .select('price status channel createdAt reservationId customerName pickupDate returnDate')
      .sort({ createdAt: -1 })
      .limit(EXPORT_CAP)
      .lean();

    const sumSince = (from) => bookings
      .filter((b) => b.createdAt && new Date(b.createdAt) >= from)
      .reduce((s, b) => s + asNumber(b.price), 0);

    const byStatus = {};
    for (const b of bookings) {
      const key = b.status || 'unknown';
      byStatus[key] = byStatus[key] || { status: key, count: 0, revenue: 0 };
      byStatus[key].count += 1;
      byStatus[key].revenue += asNumber(b.price);
    }

    const monthly = {};
    for (const b of bookings) {
      if (!b.createdAt) continue;
      const d = new Date(b.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = monthly[key] || { period: key, bookings: 0, revenue: 0 };
      monthly[key].bookings += 1;
      monthly[key].revenue += asNumber(b.price);
    }

    await respondXlsx(req, res, {
      reportKey: 'analytics',
      title: 'Analytics Report',
      subtitle: 'Revenue performance by period, channel, and status',
      kpis: [
        { label: 'This week', value: sumSince(weekStart), format: 'money' },
        { label: 'This month', value: sumSince(monthStart), format: 'money' },
        { label: 'This year', value: sumSince(yearStart), format: 'money' },
        { label: 'All time', value: bookings.reduce((s, b) => s + asNumber(b.price), 0), format: 'money' },
      ],
      sheets: [
        {
          name: 'By status',
          columns: [
            { key: 'status', header: 'Status', width: 16, type: 'status' },
            { key: 'count', header: 'Bookings', width: 12, type: 'number' },
            { key: 'revenue', header: 'Revenue', width: 14, type: 'money' },
          ],
          rows: Object.values(byStatus),
          totals: { label: 'Totals', sumKeys: ['count', 'revenue'] },
        },
        {
          name: 'Monthly trend',
          columns: [
            { key: 'period', header: 'Month', width: 12 },
            { key: 'bookings', header: 'Bookings', width: 12, type: 'number' },
            { key: 'revenue', header: 'Revenue', width: 14, type: 'money' },
          ],
          rows: Object.values(monthly).sort((a, b) => String(a.period).localeCompare(String(b.period))),
          totals: { label: 'Totals', sumKeys: ['bookings', 'revenue'] },
        },
        {
          name: 'Recent bookings',
          columns: [
            { key: 'reservationId', header: 'Reservation #', width: 16 },
            { key: 'customerName', header: 'Customer', width: 18 },
            { key: 'channel', header: 'Channel', width: 10 },
            { key: 'status', header: 'Status', width: 14, type: 'status' },
            { key: 'price', header: 'Amount', width: 12, type: 'money' },
            { key: 'createdAt', header: 'Created', width: 12, type: 'date' },
          ],
          rows: bookings.slice(0, 2000).map((b) => ({
            reservationId: b.reservationId || '',
            customerName: b.customerName || '',
            channel: b.channel === 'walk_in' ? 'Walk-in' : 'Online',
            status: b.status || '',
            price: asNumber(b.price),
            createdAt: b.createdAt,
          })),
        },
      ],
      rowCount: bookings.length,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to export analytics' });
  }
};

/** Hub reports page — type=revenue|customers|fleet (XLSX upgrade of legacy CSV). */
export const exportHubReportXlsx = async (req, res) => {
  const type = req.query.type || 'revenue';
  if (type === 'customers') {
    req.query = { ...req.query };
    return exportCustomersXlsx(req, res);
  }
  if (type === 'fleet') {
    req.query = { ...req.query };
    return exportFleetXlsx(req, res);
  }
  // revenue ≈ reservations
  req.url = req.url || '';
  return exportReservationsXlsx(req, res);
};

export default {
  exportReservationsXlsx,
  exportCustomersXlsx,
  exportFleetXlsx,
  exportVehicleStatsXlsx,
  exportMaintenanceXlsx,
  exportAccountingXlsx,
  exportInvoicesXlsx,
  exportContractsXlsx,
  exportClientDocumentsXlsx,
  exportAnalyticsXlsx,
  exportHubReportXlsx,
};
