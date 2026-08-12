import mongoose from 'mongoose';
import Samsar from '../models/Samsar.js';
import SamsarPayment from '../models/SamsarPayment.js';
import AgencyExpense from '../models/AgencyExpense.js';
import VehicleExpense from '../models/VehicleExpense.js';
import Car from '../models/Car.js';
import Booking from '../models/Booking.js';
import { logAudit } from '../utils/adminOps.js';
import { parsePagination, parseSort, parseDateRange, escapeRegex } from '../utils/listQuery.js';
import {
  getAccountingOverview,
  listRevenues,
  resolvePeriodRange,
} from '../services/accountingService.js';

const ownerId = (req) => req.user._id;

const money = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
};

export const accountingOverview = async (req, res) => {
  try {
    const overview = await getAccountingOverview(ownerId(req), {
      period: req.query.period || 'month',
      from: req.query.from,
      to: req.query.to,
    });
    res.json({ success: true, overview });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load accounting overview' });
  }
};

export const listAccountingRevenues = async (req, res) => {
  try {
    const range = resolvePeriodRange(
      req.query.period || 'custom',
      req.query.from,
      req.query.to,
    );
    const result = await listRevenues(ownerId(req), {
      from: range.from,
      to: range.to,
      carId: req.query.carId,
      bookingId: req.query.bookingId || req.query.reservationId,
      paymentStatus: req.query.paymentStatus || undefined,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      sort: req.query.sort || '-createdAt',
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to list revenues' });
  }
};

/* ——— Samsar payments ——— */
export const listSamsarPayments = async (req, res) => {
  try {
    const owner = ownerId(req);
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { owner };
    if (req.query.status && req.query.status !== 'all') filter.paymentStatus = req.query.status;
    if (req.query.samsarId && mongoose.isValidObjectId(req.query.samsarId)) {
      filter.samsar = req.query.samsarId;
    }
    const range = parseDateRange(req.query.from, req.query.to, 'paymentDate');
    if (range) Object.assign(filter, range);

    const [items, total] = await Promise.all([
      SamsarPayment.find(filter)
        .populate('samsar', 'fullName phone status')
        .populate('booking', 'reservationId customerName price')
        .sort(parseSort(req.query.sort, { paymentDate: true, amount: true, createdAt: true }, { paymentDate: -1 }))
        .skip(skip)
        .limit(limit)
        .lean(),
      SamsarPayment.countDocuments(filter),
    ]);
    res.json({
      success: true,
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to list Samsar payments' });
  }
};

export const createSamsarPayment = async (req, res) => {
  try {
    const owner = ownerId(req);
    const amount = money(req.body.amount);
    if (amount == null) return res.status(400).json({ success: false, message: 'Valid amount required' });
    if (!mongoose.isValidObjectId(req.body.samsarId)) {
      return res.status(400).json({ success: false, message: 'Valid samsarId required' });
    }
    const samsar = await Samsar.findOne({ _id: req.body.samsarId, owner });
    if (!samsar) return res.status(404).json({ success: false, message: 'Samsar not found' });

    let booking = null;
    if (req.body.bookingId) {
      if (!mongoose.isValidObjectId(req.body.bookingId)) {
        return res.status(400).json({ success: false, message: 'Invalid bookingId' });
      }
      booking = await Booking.findOne({ _id: req.body.bookingId, owner }).select('_id');
      if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const paymentDate = req.body.paymentDate ? new Date(req.body.paymentDate) : new Date();
    if (Number.isNaN(paymentDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid payment date' });
    }

    const item = await SamsarPayment.create({
      owner,
      samsar: samsar._id,
      booking: booking?._id || null,
      amount,
      currency: String(req.body.currency || process.env.CURRENCY || 'MAD'),
      paymentDate,
      paymentStatus: ['pending', 'paid', 'cancelled'].includes(req.body.paymentStatus)
        ? req.body.paymentStatus
        : 'pending',
      paymentMethod: ['cash', 'bank_transfer', 'check', 'other'].includes(req.body.paymentMethod)
        ? req.body.paymentMethod
        : 'cash',
      notes: String(req.body.notes || '').slice(0, 2000),
      createdBy: owner,
      updatedBy: owner,
    });

    await logAudit({
      owner,
      actor: owner,
      action: 'samsar_payment.create',
      entityType: 'SamsarPayment',
      entityId: item._id,
      details: `Samsar payment ${amount} for ${samsar.fullName}`,
    });

    res.status(201).json({ success: true, item });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to create Samsar payment' });
  }
};

export const updateSamsarPayment = async (req, res) => {
  try {
    const owner = ownerId(req);
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const item = await SamsarPayment.findOne({ _id: req.params.id, owner });
    if (!item) return res.status(404).json({ success: false, message: 'Payment not found' });

    if (req.body.amount != null) {
      const amount = money(req.body.amount);
      if (amount == null) return res.status(400).json({ success: false, message: 'Invalid amount' });
      item.amount = amount;
    }
    if (req.body.paymentDate) {
      const d = new Date(req.body.paymentDate);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ success: false, message: 'Invalid date' });
      item.paymentDate = d;
    }
    if (['pending', 'paid', 'cancelled'].includes(req.body.paymentStatus)) {
      item.paymentStatus = req.body.paymentStatus;
    }
    if (['cash', 'bank_transfer', 'check', 'other'].includes(req.body.paymentMethod)) {
      item.paymentMethod = req.body.paymentMethod;
    }
    if (req.body.notes != null) item.notes = String(req.body.notes).slice(0, 2000);
    item.updatedBy = owner;
    await item.save();

    await logAudit({
      owner,
      actor: owner,
      action: 'samsar_payment.update',
      entityType: 'SamsarPayment',
      entityId: item._id,
      details: 'Updated Samsar payment',
    });

    res.json({ success: true, item });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to update Samsar payment' });
  }
};

/* ——— Agency expenses ——— */
export const listAgencyExpenses = async (req, res) => {
  try {
    const owner = ownerId(req);
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { owner };
    if (req.query.status && req.query.status !== 'all') filter.paymentStatus = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    const range = parseDateRange(req.query.from, req.query.to, 'expenseDate');
    if (range) Object.assign(filter, range);
    if (req.query.search) {
      const re = new RegExp(escapeRegex(req.query.search), 'i');
      filter.$or = [{ description: re }, { notes: re }];
    }

    const [items, total] = await Promise.all([
      AgencyExpense.find(filter)
        .sort(parseSort(req.query.sort, { expenseDate: true, amount: true, createdAt: true }, { expenseDate: -1 }))
        .skip(skip)
        .limit(limit)
        .lean(),
      AgencyExpense.countDocuments(filter),
    ]);
    res.json({
      success: true,
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to list agency expenses' });
  }
};

export const createAgencyExpense = async (req, res) => {
  try {
    const owner = ownerId(req);
    const amount = money(req.body.amount);
    if (amount == null) return res.status(400).json({ success: false, message: 'Valid amount required' });
    const expenseDate = req.body.expenseDate ? new Date(req.body.expenseDate) : new Date();
    if (Number.isNaN(expenseDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid expense date' });
    }
    const item = await AgencyExpense.create({
      owner,
      category: req.body.category || 'other',
      amount,
      currency: String(req.body.currency || process.env.CURRENCY || 'MAD'),
      expenseDate,
      description: String(req.body.description || '').slice(0, 500),
      paymentStatus: ['pending', 'paid', 'cancelled'].includes(req.body.paymentStatus)
        ? req.body.paymentStatus
        : 'pending',
      paymentMethod: req.body.paymentMethod || 'cash',
      notes: String(req.body.notes || '').slice(0, 2000),
      partnerCompany: mongoose.isValidObjectId(req.body.partnerCompanyId)
        ? req.body.partnerCompanyId
        : null,
      createdBy: owner,
      updatedBy: owner,
    });
    await logAudit({
      owner,
      actor: owner,
      action: 'agency_expense.create',
      entityType: 'AgencyExpense',
      entityId: item._id,
      details: `Agency expense ${amount}`,
    });
    res.status(201).json({ success: true, item });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to create agency expense' });
  }
};

export const updateAgencyExpense = async (req, res) => {
  try {
    const owner = ownerId(req);
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const item = await AgencyExpense.findOne({ _id: req.params.id, owner });
    if (!item) return res.status(404).json({ success: false, message: 'Expense not found' });

    if (req.body.amount != null) {
      const amount = money(req.body.amount);
      if (amount == null) return res.status(400).json({ success: false, message: 'Invalid amount' });
      item.amount = amount;
    }
    if (req.body.category) item.category = req.body.category;
    if (req.body.expenseDate) {
      const d = new Date(req.body.expenseDate);
      if (!Number.isNaN(d.getTime())) item.expenseDate = d;
    }
    if (['pending', 'paid', 'cancelled'].includes(req.body.paymentStatus)) {
      item.paymentStatus = req.body.paymentStatus;
    }
    if (req.body.paymentMethod) item.paymentMethod = req.body.paymentMethod;
    if (req.body.description != null) item.description = String(req.body.description).slice(0, 500);
    if (req.body.notes != null) item.notes = String(req.body.notes).slice(0, 2000);
    item.updatedBy = owner;
    await item.save();

    await logAudit({
      owner,
      actor: owner,
      action: 'agency_expense.update',
      entityType: 'AgencyExpense',
      entityId: item._id,
      details: 'Updated agency expense',
    });
    res.json({ success: true, item });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to update agency expense' });
  }
};

/* ——— Vehicle expenses ——— */
export const listVehicleExpenses = async (req, res) => {
  try {
    const owner = ownerId(req);
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { owner };
    if (req.query.status && req.query.status !== 'all') filter.paymentStatus = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.carId && mongoose.isValidObjectId(req.query.carId)) filter.car = req.query.carId;
    const range = parseDateRange(req.query.from, req.query.to, 'expenseDate');
    if (range) Object.assign(filter, range);

    const [items, total] = await Promise.all([
      VehicleExpense.find(filter)
        .populate('car', 'brand model licensePlate fleetId')
        .sort(parseSort(req.query.sort, { expenseDate: true, amount: true, createdAt: true }, { expenseDate: -1 }))
        .skip(skip)
        .limit(limit)
        .lean(),
      VehicleExpense.countDocuments(filter),
    ]);
    res.json({
      success: true,
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to list vehicle expenses' });
  }
};

export const createVehicleExpense = async (req, res) => {
  try {
    const owner = ownerId(req);
    const amount = money(req.body.amount);
    if (amount == null) return res.status(400).json({ success: false, message: 'Valid amount required' });
    if (!mongoose.isValidObjectId(req.body.carId)) {
      return res.status(400).json({ success: false, message: 'Valid carId required' });
    }
    const car = await Car.findOne({ _id: req.body.carId, owner }).select('_id');
    if (!car) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    const expenseDate = req.body.expenseDate ? new Date(req.body.expenseDate) : new Date();
    if (Number.isNaN(expenseDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid expense date' });
    }

    const item = await VehicleExpense.create({
      owner,
      car: car._id,
      category: req.body.category || 'other',
      amount,
      currency: String(req.body.currency || process.env.CURRENCY || 'MAD'),
      expenseDate,
      description: String(req.body.description || '').slice(0, 500),
      paymentStatus: ['pending', 'paid', 'cancelled'].includes(req.body.paymentStatus)
        ? req.body.paymentStatus
        : 'pending',
      paymentMethod: req.body.paymentMethod || 'cash',
      odometer: req.body.odometer != null && Number.isFinite(Number(req.body.odometer))
        ? Number(req.body.odometer)
        : null,
      notes: String(req.body.notes || '').slice(0, 2000),
      booking: mongoose.isValidObjectId(req.body.bookingId) ? req.body.bookingId : null,
      createdBy: owner,
      updatedBy: owner,
    });

    await logAudit({
      owner,
      actor: owner,
      action: 'vehicle_expense.create',
      entityType: 'VehicleExpense',
      entityId: item._id,
      details: `Vehicle expense ${amount}`,
    });
    res.status(201).json({ success: true, item });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to create vehicle expense' });
  }
};

export const updateVehicleExpense = async (req, res) => {
  try {
    const owner = ownerId(req);
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const item = await VehicleExpense.findOne({ _id: req.params.id, owner });
    if (!item) return res.status(404).json({ success: false, message: 'Expense not found' });

    if (req.body.amount != null) {
      const amount = money(req.body.amount);
      if (amount == null) return res.status(400).json({ success: false, message: 'Invalid amount' });
      item.amount = amount;
    }
    if (req.body.category) item.category = req.body.category;
    if (req.body.expenseDate) {
      const d = new Date(req.body.expenseDate);
      if (!Number.isNaN(d.getTime())) item.expenseDate = d;
    }
    if (['pending', 'paid', 'cancelled'].includes(req.body.paymentStatus)) {
      item.paymentStatus = req.body.paymentStatus;
    }
    if (req.body.paymentMethod) item.paymentMethod = req.body.paymentMethod;
    if (req.body.description != null) item.description = String(req.body.description).slice(0, 500);
    if (req.body.notes != null) item.notes = String(req.body.notes).slice(0, 2000);
    if (req.body.odometer != null && Number.isFinite(Number(req.body.odometer))) {
      item.odometer = Number(req.body.odometer);
    }
    item.updatedBy = owner;
    await item.save();

    await logAudit({
      owner,
      actor: owner,
      action: 'vehicle_expense.update',
      entityType: 'VehicleExpense',
      entityId: item._id,
      details: 'Updated vehicle expense',
    });
    res.json({ success: true, item });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to update vehicle expense' });
  }
};
