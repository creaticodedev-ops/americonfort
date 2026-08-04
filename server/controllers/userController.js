import User from "../models/User.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import Car from "../models/Car.js";
import mongoose from 'mongoose';
import { groupCarsForCatalog } from '../utils/carCatalog.js';
import {
  syncLicenseStatus,
  serializeLicense,
  createTrialDefaults,
} from '../services/licenseService.js';
import { syncOwnerPermissions, resolveOwnerPermissions } from '../utils/ownerPermissions.js';
import { normalizeEmail, findUserByEmail } from '../utils/emailUtils.js';
import { BRAND_NAME } from '../utils/brand.js';

const generateToken = (user) => {
    const payload = { _id: user._id.toString(), tv: user.tokenVersion || 0 };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const normalizedEmail = normalizeEmail(email);
        const user = await findUserByEmail(User, normalizedEmail);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Admin account not found' });
        }
        if (user.role === 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Use the Super Admin login page',
                code: 'USE_SUPERADMIN_LOGIN',
            });
        }
        if (user.role !== 'owner') {
            return res.status(403).json({ success: false, message: 'Admin access only' });
        }
        if (user.accountStatus && user.accountStatus !== 'active') {
            return res.status(403).json({
                success: false,
                code: 'ACCOUNT_LOCKED',
                message: `This admin account has been suspended or disabled. Contact ${BRAND_NAME}.`,
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Ensure trial fields exist; auto-mark expired if needed (login still allowed)
        if (!user.trialEndsAt && user.licenseStatus !== 'active') {
            Object.assign(user, createTrialDefaults(user.createdAt || new Date()));
            await user.save();
        } else {
            await syncLicenseStatus(user);
        }

        user.lastLoginAt = new Date();
        await syncOwnerPermissions(user);
        await user.save();

        const token = generateToken(user);
        const license = serializeLicense(user);

        res.json({
            success: true,
            token,
            license,
            // Login always succeeds for valid admins so the Trial Expired screen can show
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
};

export const getUserData = async (req, res) => {
    try {
        const { user } = req;
        if (user.role === 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Use the Super Admin panel',
                code: 'USE_SUPERADMIN_LOGIN',
            });
        }
        if (user.role !== 'owner') {
            return res.status(403).json({ success: false, message: 'Admin access only' });
        }
        if (user.accountStatus && user.accountStatus !== 'active') {
            return res.status(403).json({
                success: false,
                code: 'ACCOUNT_LOCKED',
                message: 'This admin account has been suspended or disabled.',
            });
        }

        await syncLicenseStatus(user);
        await syncOwnerPermissions(user);
        const license = serializeLicense(user);

        // Strip password already done by protect; return user + explicit license snapshot
        const safeUser = user.toObject ? user.toObject() : { ...user };
        delete safeUser.password;
        const resolvedPermissions = resolveOwnerPermissions(safeUser.permissions);
        safeUser.permissions = Array.isArray(resolvedPermissions) ? resolvedPermissions : [];

        res.json({
            success: true,
            user: {
                ...safeUser,
                license,
            },
            license,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch user data' });
    }
};

export const getCars = async (req, res) => {
    try {
        const cars = await Car.find({
            isAvaliable: true,
            owner: { $ne: null },
            status: { $ne: 'maintenance' },
        })
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, cars: groupCarsForCatalog(cars) });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch cars' });
    }
};

export const getCarById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid car ID' });
        }

        const car = await Car.findOne({ _id: id, isAvaliable: true, owner: { $ne: null } });
        if (!car) {
            return res.status(404).json({ success: false, message: 'Car not found' });
        }

        res.json({ success: true, car });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch car' });
    }
};
