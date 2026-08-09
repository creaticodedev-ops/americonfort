/**
 * Owner-scoped booking rules — resolve defaults, validate bookings, sanitize admin input.
 * Defaults preserve current platform behavior (permissive) until an owner tightens them.
 */

import { calcRentalDays } from '../utils/helpers.js';

export const BOOKING_SETTINGS_DEFAULTS = {
  minRentalDays: 1,
  maxRentalDays: 0, // 0 = no maximum
  minAdvanceHours: 0,
  maxAdvanceDays: 0, // 0 = no horizon
  allowSameDayBooking: true,
  cancellation: {
    enabled: false, // off by default — existing free cancel behavior
    freeCancellationHours: 24,
    lateCancellationFeePercent: 0,
    noShowFeePercent: 0,
    policyText: '',
  },
  deposit: {
    defaultSecurityDeposit: 0, // 0 → use Car.securityDeposit only
    depositPercent: 0, // 0 → fall back to DEPOSIT_PERCENT env / 30
    requireDepositBeforePickup: false,
  },
  secondDriver: {
    enabled: true,
    feePerRental: 0,
    feePerDay: 0,
    minAge: 21,
    minLicenseYears: 1,
    maxExtraDrivers: 1,
  },
  mileage: {
    unlimited: true,
    includedKmPerDay: 0,
    extraKmRate: 0,
  },
  pickupReturn: {
    enforceHours: false, // off by default — server currently accepts any time
    openingTime: '06:00',
    closingTime: '22:00',
    allowAfterHours: true,
    afterHoursFee: 0,
    lateReturnGraceMinutes: 60,
    lateReturnFeePerHour: 0,
    allowDifferentReturnLocation: true,
    fuelPolicy: 'full_to_full',
  },
  pendingExpiry: {
    enabled: false, // off by default — no auto-cancel until configured
    expiryHours: 24,
    action: 'cancel',
    notifyOwner: true,
  },
};

const clampNumber = (value, { min = 0, max = Number.POSITIVE_INFINITY, fallback = 0 } = {}) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const isHhMm = (value) => typeof value === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);

const mergeDeep = (defaults, stored = {}) => {
  const out = { ...defaults };
  for (const [key, value] of Object.entries(stored || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value) && defaults[key] && typeof defaults[key] === 'object') {
      out[key] = { ...defaults[key], ...value };
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
};

/** Resolve effective booking settings for an owner document or raw settings object. */
export const resolveBookingSettings = (ownerOrSettings) => {
  const stored = ownerOrSettings?.bookingSettings || ownerOrSettings || {};
  const plain = typeof stored.toObject === 'function' ? stored.toObject() : stored;
  return mergeDeep(BOOKING_SETTINGS_DEFAULTS, plain);
};

/** Public-safe subset for the guest booking UI. */
export const toPublicBookingSettings = (settings) => {
  const s = resolveBookingSettings(settings);
  return {
    minRentalDays: s.minRentalDays,
    maxRentalDays: s.maxRentalDays,
    minAdvanceHours: s.minAdvanceHours,
    maxAdvanceDays: s.maxAdvanceDays,
    allowSameDayBooking: s.allowSameDayBooking,
    cancellation: {
      enabled: s.cancellation.enabled,
      freeCancellationHours: s.cancellation.freeCancellationHours,
      policyText: s.cancellation.policyText || '',
    },
    deposit: {
      defaultSecurityDeposit: s.deposit.defaultSecurityDeposit,
      depositPercent: s.deposit.depositPercent || Number(process.env.DEPOSIT_PERCENT) || 30,
    },
    secondDriver: {
      enabled: s.secondDriver.enabled,
      feePerRental: s.secondDriver.feePerRental,
      feePerDay: s.secondDriver.feePerDay,
      maxExtraDrivers: s.secondDriver.maxExtraDrivers,
    },
    mileage: {
      unlimited: s.mileage.unlimited,
      includedKmPerDay: s.mileage.includedKmPerDay,
      extraKmRate: s.mileage.extraKmRate,
    },
    pickupReturn: {
      enforceHours: s.pickupReturn.enforceHours,
      openingTime: s.pickupReturn.openingTime,
      closingTime: s.pickupReturn.closingTime,
      allowAfterHours: s.pickupReturn.allowAfterHours,
      allowDifferentReturnLocation: s.pickupReturn.allowDifferentReturnLocation,
      fuelPolicy: s.pickupReturn.fuelPolicy,
    },
  };
};

const minutesOfDay = (date) => date.getHours() * 60 + date.getMinutes();

const parseHhMmToMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};

/**
 * Validate a proposed rental against owner booking rules.
 * @param {object} opts
 * @param {object} opts.settings - resolved settings
 * @param {Date} opts.pickupDate
 * @param {Date} opts.returnDate
 * @param {Date} [opts.now]
 * @param {boolean} [opts.sameReturnLocation]
 * @param {boolean} [opts.skipTimeWindow] - walk-in / staff override for hours
 * @param {boolean} [opts.skipAdvance] - walk-in / staff override for min/max advance windows
 */
export const validateBookingAgainstRules = ({
  settings,
  pickupDate,
  returnDate,
  now = new Date(),
  sameReturnLocation = true,
  skipTimeWindow = false,
  skipAdvance = false,
} = {}) => {
  const s = resolveBookingSettings(settings);
  const pickup = pickupDate instanceof Date ? pickupDate : new Date(pickupDate);
  const ret = returnDate instanceof Date ? returnDate : new Date(returnDate);

  if (Number.isNaN(pickup.getTime()) || Number.isNaN(ret.getTime())) {
    return { valid: false, code: 'INVALID_DATES', message: 'Invalid pickup or return date & time' };
  }
  if (ret <= pickup) {
    return { valid: false, code: 'RETURN_BEFORE_PICKUP', message: 'Return date & time must be after pickup date & time' };
  }

  const days = calcRentalDays(pickup, ret);
  const durationMs = ret.getTime() - pickup.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);

  if (s.minRentalDays > 0 && days < s.minRentalDays) {
    return {
      valid: false,
      code: 'MIN_RENTAL_DAYS',
      message: `Minimum rental duration is ${s.minRentalDays} day(s)`,
    };
  }
  if (s.maxRentalDays > 0 && days > s.maxRentalDays) {
    return {
      valid: false,
      code: 'MAX_RENTAL_DAYS',
      message: `Maximum rental duration is ${s.maxRentalDays} day(s)`,
    };
  }

  const advanceMs = pickup.getTime() - now.getTime();
  const advanceHours = advanceMs / (1000 * 60 * 60);
  const advanceDays = advanceMs / (1000 * 60 * 60 * 24);

  if (!skipAdvance) {
    if (!s.allowSameDayBooking) {
      const sameDay =
        pickup.getFullYear() === now.getFullYear()
        && pickup.getMonth() === now.getMonth()
        && pickup.getDate() === now.getDate();
      if (sameDay) {
        return {
          valid: false,
          code: 'SAME_DAY_BLOCKED',
          message: 'Same-day bookings are not allowed',
        };
      }
    }

    if (s.minAdvanceHours > 0 && advanceHours < s.minAdvanceHours) {
      return {
        valid: false,
        code: 'MIN_ADVANCE',
        message: `Bookings must be made at least ${s.minAdvanceHours} hour(s) in advance`,
      };
    }

    if (s.maxAdvanceDays > 0 && advanceDays > s.maxAdvanceDays) {
      return {
        valid: false,
        code: 'MAX_ADVANCE',
        message: `Bookings cannot be made more than ${s.maxAdvanceDays} day(s) in advance`,
      };
    }
  }

  if (!s.pickupReturn.allowDifferentReturnLocation && !sameReturnLocation) {
    return {
      valid: false,
      code: 'RETURN_LOCATION',
      message: 'Pickup and return locations must be the same',
    };
  }

  if (!skipTimeWindow && s.pickupReturn.enforceHours && !s.pickupReturn.allowAfterHours) {
    const open = parseHhMmToMinutes(s.pickupReturn.openingTime || '06:00');
    const close = parseHhMmToMinutes(s.pickupReturn.closingTime || '22:00');
    const pMin = minutesOfDay(pickup);
    const rMin = minutesOfDay(ret);
    if (pMin < open || pMin > close || rMin < open || rMin > close) {
      return {
        valid: false,
        code: 'OUTSIDE_HOURS',
        message: `Pickup and return must be between ${s.pickupReturn.openingTime} and ${s.pickupReturn.closingTime}`,
      };
    }
  }

  // durationHours kept for future minRentalHours
  void durationHours;

  return { valid: true, days, settings: s };
};

/** Evaluate cancellation fee when transitioning to cancelled. */
export const evaluateCancellation = ({ settings, booking, now = new Date() } = {}) => {
  const s = resolveBookingSettings(settings);
  if (!s.cancellation.enabled) {
    return { allowed: true, feePercent: 0, feeAmount: 0, withinFreeWindow: true };
  }

  const pickup = new Date(booking.pickupDate);
  const hoursUntilPickup = (pickup.getTime() - now.getTime()) / (1000 * 60 * 60);
  const price = Number(booking.price) || 0;

  if (hoursUntilPickup >= s.cancellation.freeCancellationHours) {
    return { allowed: true, feePercent: 0, feeAmount: 0, withinFreeWindow: true };
  }

  // Already past pickup → treat as no-show if still pending/confirmed
  const feePercent = hoursUntilPickup < 0
    ? s.cancellation.noShowFeePercent
    : s.cancellation.lateCancellationFeePercent;
  const feeAmount = Math.round((price * feePercent) / 100 * 100) / 100;

  return {
    allowed: true,
    feePercent,
    feeAmount,
    withinFreeWindow: false,
  };
};

/** Sanitize + validate admin PUT body into a persistable bookingSettings object. */
export const sanitizeBookingSettingsInput = (body = {}) => {
  const errors = [];
  const current = resolveBookingSettings(body);

  const next = {
    minRentalDays: clampNumber(body.minRentalDays ?? current.minRentalDays, { min: 0, max: 365, fallback: 1 }),
    maxRentalDays: clampNumber(body.maxRentalDays ?? current.maxRentalDays, { min: 0, max: 3650, fallback: 0 }),
    minAdvanceHours: clampNumber(body.minAdvanceHours ?? current.minAdvanceHours, { min: 0, max: 24 * 60, fallback: 0 }),
    maxAdvanceDays: clampNumber(body.maxAdvanceDays ?? current.maxAdvanceDays, { min: 0, max: 3650, fallback: 0 }),
    allowSameDayBooking: body.allowSameDayBooking !== undefined
      ? Boolean(body.allowSameDayBooking)
      : current.allowSameDayBooking,
    cancellation: {
      enabled: body.cancellation?.enabled !== undefined
        ? Boolean(body.cancellation.enabled)
        : current.cancellation.enabled,
      freeCancellationHours: clampNumber(
        body.cancellation?.freeCancellationHours ?? current.cancellation.freeCancellationHours,
        { min: 0, max: 24 * 90, fallback: 24 },
      ),
      lateCancellationFeePercent: clampNumber(
        body.cancellation?.lateCancellationFeePercent ?? current.cancellation.lateCancellationFeePercent,
        { min: 0, max: 100, fallback: 0 },
      ),
      noShowFeePercent: clampNumber(
        body.cancellation?.noShowFeePercent ?? current.cancellation.noShowFeePercent,
        { min: 0, max: 100, fallback: 0 },
      ),
      policyText: String(body.cancellation?.policyText ?? current.cancellation.policyText ?? '').slice(0, 4000),
    },
    deposit: {
      defaultSecurityDeposit: clampNumber(
        body.deposit?.defaultSecurityDeposit ?? current.deposit.defaultSecurityDeposit,
        { min: 0, max: 1_000_000, fallback: 0 },
      ),
      depositPercent: clampNumber(
        body.deposit?.depositPercent ?? current.deposit.depositPercent,
        { min: 0, max: 100, fallback: 0 },
      ),
      requireDepositBeforePickup: body.deposit?.requireDepositBeforePickup !== undefined
        ? Boolean(body.deposit.requireDepositBeforePickup)
        : current.deposit.requireDepositBeforePickup,
    },
    secondDriver: {
      enabled: body.secondDriver?.enabled !== undefined
        ? Boolean(body.secondDriver.enabled)
        : current.secondDriver.enabled,
      feePerRental: clampNumber(
        body.secondDriver?.feePerRental ?? current.secondDriver.feePerRental,
        { min: 0, max: 1_000_000, fallback: 0 },
      ),
      feePerDay: clampNumber(
        body.secondDriver?.feePerDay ?? current.secondDriver.feePerDay,
        { min: 0, max: 1_000_000, fallback: 0 },
      ),
      minAge: clampNumber(
        body.secondDriver?.minAge ?? current.secondDriver.minAge,
        { min: 16, max: 99, fallback: 21 },
      ),
      minLicenseYears: clampNumber(
        body.secondDriver?.minLicenseYears ?? current.secondDriver.minLicenseYears,
        { min: 0, max: 50, fallback: 1 },
      ),
      maxExtraDrivers: clampNumber(
        body.secondDriver?.maxExtraDrivers ?? current.secondDriver.maxExtraDrivers,
        { min: 0, max: 5, fallback: 1 },
      ),
    },
    mileage: {
      unlimited: body.mileage?.unlimited !== undefined
        ? Boolean(body.mileage.unlimited)
        : current.mileage.unlimited,
      includedKmPerDay: clampNumber(
        body.mileage?.includedKmPerDay ?? current.mileage.includedKmPerDay,
        { min: 0, max: 100_000, fallback: 0 },
      ),
      extraKmRate: clampNumber(
        body.mileage?.extraKmRate ?? current.mileage.extraKmRate,
        { min: 0, max: 10_000, fallback: 0 },
      ),
    },
    pickupReturn: {
      enforceHours: body.pickupReturn?.enforceHours !== undefined
        ? Boolean(body.pickupReturn.enforceHours)
        : current.pickupReturn.enforceHours,
      openingTime: isHhMm(body.pickupReturn?.openingTime)
        ? body.pickupReturn.openingTime
        : current.pickupReturn.openingTime,
      closingTime: isHhMm(body.pickupReturn?.closingTime)
        ? body.pickupReturn.closingTime
        : current.pickupReturn.closingTime,
      allowAfterHours: body.pickupReturn?.allowAfterHours !== undefined
        ? Boolean(body.pickupReturn.allowAfterHours)
        : current.pickupReturn.allowAfterHours,
      afterHoursFee: clampNumber(
        body.pickupReturn?.afterHoursFee ?? current.pickupReturn.afterHoursFee,
        { min: 0, max: 1_000_000, fallback: 0 },
      ),
      lateReturnGraceMinutes: clampNumber(
        body.pickupReturn?.lateReturnGraceMinutes ?? current.pickupReturn.lateReturnGraceMinutes,
        { min: 0, max: 24 * 60, fallback: 60 },
      ),
      lateReturnFeePerHour: clampNumber(
        body.pickupReturn?.lateReturnFeePerHour ?? current.pickupReturn.lateReturnFeePerHour,
        { min: 0, max: 1_000_000, fallback: 0 },
      ),
      allowDifferentReturnLocation: body.pickupReturn?.allowDifferentReturnLocation !== undefined
        ? Boolean(body.pickupReturn.allowDifferentReturnLocation)
        : current.pickupReturn.allowDifferentReturnLocation,
      fuelPolicy: ['full_to_full', 'same_to_same', 'prepaid'].includes(body.pickupReturn?.fuelPolicy)
        ? body.pickupReturn.fuelPolicy
        : current.pickupReturn.fuelPolicy,
    },
    pendingExpiry: {
      enabled: body.pendingExpiry?.enabled !== undefined
        ? Boolean(body.pendingExpiry.enabled)
        : current.pendingExpiry.enabled,
      expiryHours: clampNumber(
        body.pendingExpiry?.expiryHours ?? current.pendingExpiry.expiryHours,
        { min: 1, max: 24 * 60, fallback: 24 },
      ),
      action: ['cancel', 'notify_only'].includes(body.pendingExpiry?.action)
        ? body.pendingExpiry.action
        : current.pendingExpiry.action,
      notifyOwner: body.pendingExpiry?.notifyOwner !== undefined
        ? Boolean(body.pendingExpiry.notifyOwner)
        : current.pendingExpiry.notifyOwner,
    },
  };

  if (next.maxRentalDays > 0 && next.minRentalDays > next.maxRentalDays) {
    errors.push('Minimum rental days cannot exceed maximum rental days');
  }
  if (
    next.pickupReturn.enforceHours
    && parseHhMmToMinutes(next.pickupReturn.openingTime) >= parseHhMmToMinutes(next.pickupReturn.closingTime)
  ) {
    errors.push('Opening time must be before closing time');
  }
  if (!next.mileage.unlimited && next.mileage.includedKmPerDay <= 0) {
    errors.push('Limited mileage requires included km per day greater than 0');
  }

  return { settings: next, errors };
};

export const resolveSecurityDeposit = (car, settings) => {
  const s = resolveBookingSettings(settings);
  const fromCar = Number(car?.securityDeposit);
  if (Number.isFinite(fromCar) && fromCar > 0) return fromCar;
  return Number(s.deposit.defaultSecurityDeposit) || 0;
};

export const resolveDepositPercent = (settings) => {
  const s = resolveBookingSettings(settings);
  if (s.deposit.depositPercent > 0) return s.deposit.depositPercent;
  const env = Number(process.env.DEPOSIT_PERCENT);
  if (Number.isFinite(env) && env > 0 && env <= 100) return env;
  return 30;
};

export const computeSecondDriverFee = (settings, days = 1) => {
  const s = resolveBookingSettings(settings);
  if (!s.secondDriver.enabled) return 0;
  const rental = Number(s.secondDriver.feePerRental) || 0;
  const perDay = (Number(s.secondDriver.feePerDay) || 0) * Math.max(1, days);
  return Math.round((rental + perDay) * 100) / 100;
};

export const buildPolicySnapshot = (settings) => {
  const s = resolveBookingSettings(settings);
  return {
    mileage: {
      unlimited: s.mileage.unlimited,
      includedKmPerDay: s.mileage.includedKmPerDay,
      extraKmRate: s.mileage.extraKmRate,
    },
    cancellation: {
      enabled: s.cancellation.enabled,
      freeCancellationHours: s.cancellation.freeCancellationHours,
      lateCancellationFeePercent: s.cancellation.lateCancellationFeePercent,
      noShowFeePercent: s.cancellation.noShowFeePercent,
      policyText: s.cancellation.policyText || '',
    },
    pickupReturn: {
      fuelPolicy: s.pickupReturn.fuelPolicy,
      lateReturnGraceMinutes: s.pickupReturn.lateReturnGraceMinutes,
      lateReturnFeePerHour: s.pickupReturn.lateReturnFeePerHour,
      openingTime: s.pickupReturn.openingTime,
      closingTime: s.pickupReturn.closingTime,
    },
    secondDriver: {
      enabled: s.secondDriver.enabled,
      feePerRental: s.secondDriver.feePerRental,
      feePerDay: s.secondDriver.feePerDay,
      minAge: s.secondDriver.minAge,
      minLicenseYears: s.secondDriver.minLicenseYears,
      maxExtraDrivers: s.secondDriver.maxExtraDrivers,
    },
    depositPercent: resolveDepositPercent(s),
  };
};

/** Age in full years from YYYY-MM-DD or parseable date string. */
const ageFromDob = (dob, now = new Date()) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
};

export const validateSecondDriverAgainstRules = ({ settings, secondDriver, now = new Date() } = {}) => {
  const s = resolveBookingSettings(settings);
  if (!secondDriver?.enabled) return { valid: true };

  if (!s.secondDriver.enabled) {
    return {
      valid: false,
      code: 'SECOND_DRIVER_DISABLED',
      message: 'Extra drivers are not allowed for this agency',
    };
  }
  if ((s.secondDriver.maxExtraDrivers || 0) < 1) {
    return {
      valid: false,
      code: 'SECOND_DRIVER_MAX',
      message: 'Extra drivers are not allowed for this agency',
    };
  }

  const age = ageFromDob(secondDriver.dateOfBirth, now);
  if (age != null && age < s.secondDriver.minAge) {
    return {
      valid: false,
      code: 'SECOND_DRIVER_AGE',
      message: `Extra driver must be at least ${s.secondDriver.minAge} years old`,
    };
  }

  return { valid: true };
};

export default {
  BOOKING_SETTINGS_DEFAULTS,
  resolveBookingSettings,
  toPublicBookingSettings,
  validateBookingAgainstRules,
  evaluateCancellation,
  sanitizeBookingSettingsInput,
  resolveSecurityDeposit,
  resolveDepositPercent,
  computeSecondDriverFee,
  buildPolicySnapshot,
  validateSecondDriverAgainstRules,
};
