import User from "../models/User.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import Car from "../models/Car.js";
import mongoose from 'mongoose';
import {
  buildPublicVisibleCarFilter,
  groupCarsForCatalog,
  PUBLIC_CATALOG_FIELDS,
  toPublicCatalogCar,
} from '../utils/carCatalog.js';
import { isOwnerPubliclyBookable } from '../services/agencyService.js';
import {
  syncLicenseStatus,
  serializeLicense,
  createTrialDefaults,
} from '../services/licenseService.js';
import { syncOwnerPermissions, resolveOwnerPermissions } from '../utils/ownerPermissions.js';
import { normalizeEmail, findUserByEmail } from '../utils/emailUtils.js';
import { BRAND_NAME } from '../utils/brand.js';
import { toPublicBookingSettings, resolveBookingSettings } from '../services/bookingRules.js';
import {
  serializeEntitlements,
  syncOwnerPlan,
} from '../services/entitlementService.js';

const generateToken = (user) => {
    const payload = { _id: user._id.toString(), tv: user.tokenVersion || 0 };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

/** Dummy hash so missing-user login takes similar time to a real bcrypt compare. */
const DUMMY_PASSWORD_HASH = '$2b$10$Ic6xS.w.3qa11b9um2Q0dOGirMB.eiqyf6gI.d0j2eLZIwBHKwAMy';

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const normalizedEmail = normalizeEmail(email);
        const user = await findUserByEmail(User, normalizedEmail);

        // Always bcrypt-compare to reduce timing/email enumeration side channels
        const isMatch = await bcrypt.compare(password, user?.password || DUMMY_PASSWORD_HASH);
        if (!user || !isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Role / portal hints only after successful password verification
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
            const pending = user.accountStatus === 'pending';
            return res.status(403).json({
                success: false,
                code: pending ? 'ACCOUNT_PENDING' : 'ACCOUNT_LOCKED',
                message: pending
                    ? `This agency account is pending activation. Contact ${BRAND_NAME}.`
                    : `This admin account has been suspended or disabled. Contact ${BRAND_NAME}.`,
            });
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
        await syncOwnerPlan(user);
        await user.save();

        const token = generateToken(user);
        const license = serializeLicense(user);
        const entitlements = serializeEntitlements(user);

        res.json({
            success: true,
            token,
            license,
            entitlements,
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
            const pending = user.accountStatus === 'pending';
            return res.status(403).json({
                success: false,
                code: pending ? 'ACCOUNT_PENDING' : 'ACCOUNT_LOCKED',
                message: pending
                    ? 'This agency account is pending activation.'
                    : 'This admin account has been suspended or disabled.',
            });
        }

        await syncLicenseStatus(user);
        await syncOwnerPermissions(user);
        await syncOwnerPlan(user);
        const license = serializeLicense(user);
        const entitlements = serializeEntitlements(user);

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
                entitlements,
            },
            license,
            entitlements,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch user data' });
    }
};

export const getCars = async (req, res) => {
    try {
        const filter = await buildPublicVisibleCarFilter();
        const cars = await Car.find(filter)
            .select(PUBLIC_CATALOG_FIELDS)
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

        const filter = await buildPublicVisibleCarFilter({ _id: id });
        const car = await Car.findOne(filter)
            .select(PUBLIC_CATALOG_FIELDS)
            .lean();
        if (!car) {
            return res.status(404).json({ success: false, message: 'Car not found' });
        }

        let bookingSettings = toPublicBookingSettings({});
        try {
            const owner = await User.findById(car.owner)
              .select('bookingSettings role accountStatus licenseStatus trialEndsAt')
              .lean();
            if (!isOwnerPubliclyBookable(owner)) {
              return res.status(404).json({ success: false, message: 'Car not found' });
            }
            bookingSettings = toPublicBookingSettings(resolveBookingSettings(owner));
        } catch (settingsError) {
            console.error('Public booking settings load failed:', settingsError.message);
        }

        res.json({
            success: true,
            car: toPublicCatalogCar(car),
            bookingSettings,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch car' });
    }
};
