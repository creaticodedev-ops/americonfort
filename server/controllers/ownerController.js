import fs from 'fs';
import mongoose from 'mongoose';
import imagekit from "../configs/imageKit.js";
import Booking from "../models/Booking.js";
import Car from "../models/Car.js";
import User from "../models/User.js";
import { cleanupUploadedFile } from "../middleware/multer.js";
import { escapeRegex } from "../utils/helpers.js";
import {
  generateFleetId,
  normalizeCategory,
  normalizePlate,
  normalizeVin,
} from "../utils/fleetAssets.js";
import {
  applyLocationsToCar,
  getCarLocations,
  normalizeLocations,
} from "../utils/carLocations.js";
import { logAudit } from "../utils/adminOps.js";
import {
  checkPlanLimit,
  PLAN_LIMIT_REACHED,
} from "../services/entitlementService.js";
import {
  buildFleetVehicleStats,
  buildVehicleDetailStats,
} from "../services/vehicleStatsService.js";

const uploadToImageKit = async (imageFile, folder, width = '1280') => {
  if (!imagekit) {
    throw Object.assign(new Error('ImageKit is not configured'), { status: 503 });
  }
  const fileBuffer = fs.readFileSync(imageFile.path);
  const response = await imagekit.upload({
    file: fileBuffer,
    fileName: imageFile.originalname,
    folder,
  });

  return imagekit.url({
    path: response.filePath,
    transformation: [
      { width },
      { quality: 'auto' },
      { format: 'webp' },
    ],
  });
};

const assertOwnerCar = async (carId, ownerId) => {
  if (!mongoose.isValidObjectId(carId)) return null;
  const car = await Car.findById(carId);
  if (!car || !car.owner || car.owner.toString() !== ownerId.toString()) return null;
  return car;
};

const ensureUniqueFleetId = async (ownerId, preferred = '') => {
  let fleetId = String(preferred || '').trim().toUpperCase();
  if (fleetId) {
    const clash = await Car.findOne({ owner: ownerId, fleetId });
    if (clash) throw Object.assign(new Error('Fleet ID already exists for another vehicle'), { status: 409 });
    return fleetId;
  }
  for (let i = 0; i < 12; i++) {
    fleetId = generateFleetId();
    const exists = await Car.exists({ owner: ownerId, fleetId });
    if (!exists) return fleetId;
  }
  return `FLT-${Date.now().toString(36).toUpperCase()}`;
};

const assertUniqueAssetFields = async (ownerId, { vin, licensePlate, fleetId }, excludeId = null) => {
  const checks = [];
  if (vin) checks.push({ field: 'VIN', query: { owner: ownerId, vin } });
  if (licensePlate) checks.push({ field: 'License plate', query: { owner: ownerId, licensePlate } });
  if (fleetId) checks.push({ field: 'Fleet ID', query: { owner: ownerId, fleetId } });

  for (const { field, query } of checks) {
    if (excludeId) query._id = { $ne: excludeId };
    const hit = await Car.findOne(query).select('_id');
    if (hit) {
      const err = new Error(`${field} is already assigned to another vehicle in your fleet`);
      err.status = 409;
      throw err;
    }
  }
};

/** Backfill fleetId / locations for legacy cars */
const backfillFleetIds = async (ownerId) => {
  const missing = await Car.find({
    owner: ownerId,
    $or: [
      { fleetId: '' },
      { fleetId: null },
      { fleetId: { $exists: false } },
      { locations: { $exists: false } },
      { locations: { $size: 0 } },
    ],
  });
  for (const car of missing) {
    if (!car.fleetId) {
      car.fleetId = await ensureUniqueFleetId(ownerId);
    }
    if (!car.branch && car.location) car.branch = car.location;
    const locs = getCarLocations(car);
    if (locs.length) {
      applyLocationsToCar(car, locs);
    }
    await car.save();
  }
};

export const addCar = async (req, res) => {
  let imageFile = req.file;
  try {
    const { _id } = req.user;

    const vehicleQuota = await checkPlanLimit(req.user, 'maxVehicles');
    if (!vehicleQuota.allowed) {
      return res.status(403).json({
        success: false,
        code: PLAN_LIMIT_REACHED,
        limit: 'maxVehicles',
        current: vehicleQuota.current,
        max: vehicleQuota.limit,
        message: `Vehicle limit reached for this plan (${vehicleQuota.current}/${vehicleQuota.limit}).`,
      });
    }

    if (!imageFile) {
      return res.status(400).json({ success: false, message: 'Car image is required' });
    }
    if (!req.body.carData) {
      return res.status(400).json({ success: false, message: 'Car data is required' });
    }

    let car;
    try {
      car = JSON.parse(req.body.carData);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid car data format' });
    }

    const required = ['brand', 'model', 'year', 'category', 'transmission', 'fuel_type', 'seating_capacity', 'description', 'pricePerDay'];
    for (const field of required) {
      if (!car[field] && car[field] !== 0) {
        return res.status(400).json({ success: false, message: `Missing required field: ${field}` });
      }
    }

    const locations = normalizeLocations(car.locations, car.location);
    if (!locations.length) {
      return res.status(400).json({
        success: false,
        message: 'Select at least one pickup location where this vehicle is available',
      });
    }

    const vin = normalizeVin(car.vin);
    const licensePlate = normalizePlate(car.licensePlate);
    const branch = String(car.branch || locations[0] || '').trim();
    const fleetId = await ensureUniqueFleetId(_id, car.fleetId);
    await assertUniqueAssetFields(_id, { vin, licensePlate, fleetId });

    const image = await uploadToImageKit(imageFile, '/cars');
    cleanupUploadedFile(imageFile);
    imageFile = null;

    const created = await Car.create({
      ...car,
      category: normalizeCategory(car.category),
      owner: _id,
      image,
      isAvaliable: true,
      fleetId,
      vin,
      licensePlate,
      branch,
      locations,
      location: locations[0],
      mileage: Number(car.mileage) || 0,
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle added to fleet',
      car: created,
    });
  } catch (error) {
    console.error(error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : 'Failed to add car',
    });
  } finally {
    cleanupUploadedFile(imageFile);
  }
};

export const getOwnerCars = async (req, res) => {
  try {
    const { _id } = req.user;
    await backfillFleetIds(_id);

    const {
      search = '',
      fleetId = '',
      vin = '',
      plate = '',
      status = '',
      branch = '',
      category = '',
    } = req.query;

    const filter = { owner: _id };
    if (status) filter.status = status;
    if (branch) filter.branch = new RegExp(escapeRegex(branch), 'i');
    if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
    if (fleetId) filter.fleetId = new RegExp(escapeRegex(fleetId), 'i');
    if (vin) filter.vin = new RegExp(escapeRegex(vin), 'i');
    if (plate) filter.licensePlate = new RegExp(escapeRegex(plate), 'i');

    if (search.trim()) {
      const q = escapeRegex(search.trim());
      filter.$or = [
        { fleetId: new RegExp(q, 'i') },
        { vin: new RegExp(q, 'i') },
        { licensePlate: new RegExp(q, 'i') },
        { brand: new RegExp(q, 'i') },
        { model: new RegExp(q, 'i') },
        { branch: new RegExp(q, 'i') },
        { location: new RegExp(q, 'i') },
        { locations: new RegExp(q, 'i') },
      ];
    }

    const cars = await Car.find(filter).sort({ fleetId: 1, createdAt: -1 });
    const branches = await Car.distinct('branch', { owner: _id, branch: { $nin: ['', null] } });

    res.json({ success: true, cars, branches });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch cars' });
  }
};

export const getOwnerCarById = async (req, res) => {
  try {
    const car = await assertOwnerCar(req.params.id, req.user._id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }
    res.json({ success: true, car });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch car' });
  }
};

export const getVehicleStats = async (req, res) => {
  try {
    const car = await assertOwnerCar(req.params.id, req.user._id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    const stats = await buildVehicleDetailStats({
      ownerId: req.user._id,
      car,
      period: req.query.period,
      from: req.query.from,
      to: req.query.to,
      grain: req.query.grain,
    });

    res.json({ success: true, stats });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load vehicle statistics' });
  }
};

export const getFleetVehicleStats = async (req, res) => {
  try {
    const payload = await buildFleetVehicleStats({
      ownerId: req.user._id,
      period: req.query.period,
      from: req.query.from,
      to: req.query.to,
    });
    res.json({ success: true, ...payload });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to load fleet statistics' });
  }
};

export const updateCar = async (req, res) => {
  let imageFile = req.file;
  try {
    const { carId } = req.body;
    const car = await assertOwnerCar(carId, req.user._id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    if (req.body.carData) {
      let updates;
      try {
        updates = JSON.parse(req.body.carData);
      } catch {
        return res.status(400).json({ success: false, message: 'Invalid car data format' });
      }

      const allowed = [
        'brand', 'model', 'year', 'category', 'transmission', 'fuel_type',
        'seating_capacity', 'description', 'pricePerDay', 'features',
        'licensePlate', 'mileage', 'fleetId', 'vin', 'branch', 'visibleOnWebsite',
      ];
      for (const key of allowed) {
        if (updates[key] !== undefined) car[key] = updates[key];
      }

      if (updates.visibleOnWebsite !== undefined) {
        car.visibleOnWebsite = Boolean(updates.visibleOnWebsite);
      }

      if (updates.category !== undefined) car.category = normalizeCategory(updates.category);
      if (updates.vin !== undefined) car.vin = normalizeVin(updates.vin);
      if (updates.licensePlate !== undefined) car.licensePlate = normalizePlate(updates.licensePlate);
      if (updates.fleetId !== undefined) car.fleetId = String(updates.fleetId || '').trim().toUpperCase();
      if (updates.branch !== undefined) car.branch = String(updates.branch || '').trim();
      if (updates.mileage !== undefined) car.mileage = Number(updates.mileage) || 0;

      if (updates.locations !== undefined || updates.location !== undefined) {
        const locations = normalizeLocations(updates.locations, updates.location);
        if (!locations.length) {
          return res.status(400).json({
            success: false,
            message: 'Select at least one pickup location where this vehicle is available',
          });
        }
        applyLocationsToCar(car, locations);
      }

      if (!car.fleetId) {
        car.fleetId = await ensureUniqueFleetId(req.user._id);
      }

      await assertUniqueAssetFields(
        req.user._id,
        { vin: car.vin, licensePlate: car.licensePlate, fleetId: car.fleetId },
        car._id
      );
    }

    if (imageFile) {
      car.image = await uploadToImageKit(imageFile, '/cars');
      cleanupUploadedFile(imageFile);
      imageFile = null;
    }

    await car.save();
    res.json({ success: true, message: 'Vehicle updated', car });
  } catch (error) {
    console.error(error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : 'Failed to update car',
    });
  } finally {
    cleanupUploadedFile(imageFile);
  }
};

export const toggleCarAvailability = async (req, res) => {
  try {
    const { _id } = req.user;
    const { carId } = req.body;

    const car = await assertOwnerCar(carId, _id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    car.isAvaliable = !car.isAvaliable;
    await car.save();

    res.json({
      success: true,
      message: car.isAvaliable ? 'Vehicle marked available for rentals' : 'Vehicle marked offline for rentals',
      car: { _id: car._id, isAvaliable: car.isAvaliable, visibleOnWebsite: car.visibleOnWebsite !== false },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to toggle availability' });
  }
};

/**
 * Show / hide a vehicle on the public website.
 * Does not change isAvaliable, status, pricing, or existing bookings.
 */
export const toggleCarWebsiteVisibility = async (req, res) => {
  try {
    const { _id } = req.user;
    const { carId, visibleOnWebsite } = req.body;

    const car = await assertOwnerCar(carId, _id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    const next =
      visibleOnWebsite === undefined
        ? !(car.visibleOnWebsite !== false)
        : Boolean(visibleOnWebsite);

    car.visibleOnWebsite = next;
    await car.save();

    await logAudit({
      owner: _id,
      actor: _id,
      action: next ? 'car.website.show' : 'car.website.hide',
      entityType: 'Car',
      entityId: car._id,
      details: next
        ? `Vehicle ${car.brand} ${car.model} shown on website`
        : `Vehicle ${car.brand} ${car.model} hidden from website`,
    });

    res.json({
      success: true,
      message: next
        ? 'Vehicle is now visible on the website'
        : 'Vehicle is now hidden from the website',
      car: {
        _id: car._id,
        visibleOnWebsite: car.visibleOnWebsite,
        isAvaliable: car.isAvaliable,
        status: car.status,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to update website visibility' });
  }
};

export const deleteCar = async (req, res) => {
  try {
    const { _id } = req.user;
    const { carId } = req.body;

    const car = await assertOwnerCar(carId, _id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    const activeBooking = await Booking.findOne({
      car: carId,
      status: { $in: ['pending', 'confirmed', 'active'] },
    });

    if (activeBooking) {
      return res.status(409).json({ success: false, message: 'Cannot remove a car with active reservations' });
    }

    car.owner = null;
    car.isAvaliable = false;
    await car.save();

    res.json({ success: true, message: 'Car removed from fleet' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to remove car' });
  }
};

export const getDashboardData = async (req, res) => {
  try {
    const { _id } = req.user;
    const ownerOid = _id instanceof mongoose.Types.ObjectId ? _id : new mongoose.Types.ObjectId(_id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      cars,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      activeBookings,
      completedBookings,
      todayBookings,
      upcomingPickups,
      upcomingReturns,
      recentBookings,
      monthlyRevenueAgg,
    ] = await Promise.all([
      Car.find({ owner: _id }).select('isAvaliable').lean(),
      Booking.countDocuments({ owner: _id }),
      Booking.countDocuments({ owner: _id, status: 'pending' }),
      Booking.countDocuments({ owner: _id, status: 'confirmed' }),
      Booking.countDocuments({ owner: _id, status: 'active' }),
      Booking.countDocuments({ owner: _id, status: 'completed' }),
      Booking.countDocuments({ owner: _id, createdAt: { $gte: today } }),
      Booking.find({
        owner: _id,
        status: { $in: ['confirmed', 'active'] },
        pickupDate: { $gte: today, $lte: nextWeek },
      }).populate('car', 'brand model').sort({ pickupDate: 1 }).limit(5).lean(),
      Booking.find({
        owner: _id,
        status: { $in: ['active', 'confirmed'] },
        returnDate: { $gte: today, $lte: nextWeek },
      }).populate('car', 'brand model').sort({ returnDate: 1 }).limit(5).lean(),
      Booking.find({ owner: _id })
        .populate('car', 'brand model')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Booking.aggregate([
        {
          $match: {
            owner: ownerOid,
            status: { $in: ['confirmed', 'active', 'completed'] },
            createdAt: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$price' } } },
      ]),
    ]);

    const totalCars = cars.length;
    const availableVehicles = cars.filter((car) => car.isAvaliable).length;
    const rentedVehicles = totalCars - availableVehicles;
    const occupancyRate = totalCars > 0 ? Math.round((rentedVehicles / totalCars) * 100) : 0;
    const monthlyRevenue = monthlyRevenueAgg[0]?.total || 0;

    res.json({
      success: true,
      dashboardData: {
        totalCars,
        totalBookings,
        pendingBookings,
        confirmedBookings,
        activeBookings,
        completedBookings,
        todayBookings,
        availableVehicles,
        rentedVehicles,
        occupancyRate,
        upcomingPickups,
        upcomingReturns,
        recentBookings,
        monthlyRevenue,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
};

export const getAdminOverview = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const ownerOid = ownerId instanceof mongoose.Types.ObjectId
      ? ownerId
      : new mongoose.Types.ObjectId(ownerId);

    const [
      cars,
      totalReservations,
      customers,
      revenueAgg,
      recentReservations,
    ] = await Promise.all([
      Car.find({ owner: ownerId }).select('isAvaliable').lean(),
      Booking.countDocuments({ owner: ownerId }),
      Booking.aggregate([
        { $match: { owner: ownerOid, customerEmail: { $ne: '' } } },
        { $group: { _id: { $toLower: '$customerEmail' } } },
        { $count: 'total' },
      ]),
      Booking.aggregate([
        {
          $match: {
            owner: ownerOid,
            status: { $in: ['confirmed', 'active', 'completed'] },
          },
        },
        { $group: { _id: null, total: { $sum: '$price' } } },
      ]),
      Booking.find({ owner: ownerId })
        .populate('car', 'brand model')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
    ]);

    res.json({
      success: true,
      overview: {
        totalVehicles: cars.length,
        totalReservations,
        availableVehicles: cars.filter((car) => car.isAvaliable).length,
        rentedVehicles: cars.filter((car) => !car.isAvaliable).length,
        totalCustomers: customers[0]?.total || 0,
        revenue: revenueAgg[0]?.total || 0,
        recentReservations,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch overview' });
  }
};

export const getCustomers = async (req, res) => {
  try {
    const ownerOid = req.user._id instanceof mongoose.Types.ObjectId
      ? req.user._id
      : new mongoose.Types.ObjectId(req.user._id);

    const rows = await Booking.aggregate([
      { $match: { owner: ownerOid, customerEmail: { $ne: '' } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { $toLower: '$customerEmail' },
          name: { $first: '$customerName' },
          email: { $first: '$customerEmail' },
          phone: { $first: '$customerPhone' },
          bookingsCount: { $sum: 1 },
          lastBookingAt: { $first: '$createdAt' },
          totalSpent: {
            $sum: {
              $cond: [
                { $in: ['$status', ['confirmed', 'active', 'completed']] },
                '$price',
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastBookingAt: -1 } },
    ]);

    const customers = rows.map((row) => ({
      _id: row._id,
      name: row.name || 'Guest',
      email: row.email,
      phone: row.phone || '',
      bookingsCount: row.bookingsCount,
      lastBookingAt: row.lastBookingAt,
      totalSpent: row.totalSpent || 0,
    }));

    res.json({ success: true, customers });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch customers' });
  }
};

export const updateUserImage = async (req, res) => {
  let imageFile = req.file;
  try {
    const { _id } = req.user;

    if (!imageFile) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }

    const image = await uploadToImageKit(imageFile, '/users', '400');
    cleanupUploadedFile(imageFile);
    imageFile = null;

    await User.findByIdAndUpdate(_id, { image });
    res.json({ success: true, message: 'Profile image updated' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to update profile image' });
  } finally {
    cleanupUploadedFile(imageFile);
  }
};
