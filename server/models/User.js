import mongoose from "mongoose";

export const OWNER_PERMISSIONS = [
  'dashboard',
  'analytics',
  'fleet',
  'bookings',
  'customers',
  'locations',
  'calendar',
  'maintenance',
  'reports',
  'audit',
  'contracts',
  'templates',
  'settings',
];

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['user', 'owner', 'superadmin'],
        default: 'user',
    },
    image: { type: String, default: '' },

    /** Display name for the agency this admin operates */
    agencyName: { type: String, default: '' },

    /**
     * SaaS agency profile (Phase 1 — Super Admin Agencies Management).
     * The owner User document remains the agency root for data isolation.
     */
    agencyProfile: {
      legalName: { type: String, default: '' },
      phone: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      country: { type: String, default: 'Morocco' },
      logo: { type: String, default: '' },
      /** Reserved for future multi-tenant routing; stored only for now */
      primaryDomain: { type: String, default: '' },
    },

    /**
     * WhatsApp dial numbers used for guest reservation + booking confirmation wa.me links.
     * Stored without +; normalized to digits (e.g. 212665330116). Empty → env fallback.
     */
    whatsappSettings: {
      reservationNumber: { type: String, default: '' },
      confirmationNumber: { type: String, default: '' },
    },

    /**
     * Owner-scoped document preferences (Admin → Settings → Agency Stamp).
     * Applied as defaults when generating contracts/invoices; per-document
     * includeCompanyStamp can still override on generate/edit.
     */
    documentSettings: {
      contracts: {
        showAgencyStamp: { type: Boolean, default: true },
      },
      invoices: {
        showAgencyStamp: { type: Boolean, default: true },
      },
    },

    /**
     * Owner-scoped booking rules (Admin → Settings → Booking Settings).
     * Empty / missing fields resolve to permissive defaults in bookingRules.js
     * so existing behaviour is preserved until an owner tightens them.
     */
    bookingSettings: {
      minRentalDays: { type: Number, default: 1 },
      maxRentalDays: { type: Number, default: 0 },
      minAdvanceHours: { type: Number, default: 0 },
      maxAdvanceDays: { type: Number, default: 0 },
      allowSameDayBooking: { type: Boolean, default: true },
      cancellation: {
        enabled: { type: Boolean, default: false },
        freeCancellationHours: { type: Number, default: 24 },
        lateCancellationFeePercent: { type: Number, default: 0 },
        noShowFeePercent: { type: Number, default: 0 },
        policyText: { type: String, default: '' },
      },
      deposit: {
        defaultSecurityDeposit: { type: Number, default: 0 },
        depositPercent: { type: Number, default: 0 },
        requireDepositBeforePickup: { type: Boolean, default: false },
      },
      secondDriver: {
        enabled: { type: Boolean, default: true },
        feePerRental: { type: Number, default: 0 },
        feePerDay: { type: Number, default: 0 },
        minAge: { type: Number, default: 21 },
        minLicenseYears: { type: Number, default: 1 },
        maxExtraDrivers: { type: Number, default: 1 },
      },
      mileage: {
        unlimited: { type: Boolean, default: true },
        includedKmPerDay: { type: Number, default: 0 },
        extraKmRate: { type: Number, default: 0 },
      },
      pickupReturn: {
        enforceHours: { type: Boolean, default: false },
        openingTime: { type: String, default: '06:00' },
        closingTime: { type: String, default: '22:00' },
        allowAfterHours: { type: Boolean, default: true },
        afterHoursFee: { type: Number, default: 0 },
        lateReturnGraceMinutes: { type: Number, default: 60 },
        lateReturnFeePerHour: { type: Number, default: 0 },
        allowDifferentReturnLocation: { type: Boolean, default: true },
        fuelPolicy: {
          type: String,
          enum: ['full_to_full', 'same_to_same', 'prepaid'],
          default: 'full_to_full',
        },
      },
      pendingExpiry: {
        enabled: { type: Boolean, default: false },
        expiryHours: { type: Number, default: 24 },
        action: {
          type: String,
          enum: ['cancel', 'notify_only'],
          default: 'cancel',
        },
        notifyOwner: { type: Boolean, default: true },
      },
    },

    /**
     * Account gate (independent of license trial).
     * active    → can log in (subject to license for owners)
     * pending   → onboarding / not yet activated (no login)
     * suspended → temporary lock
     * disabled  → permanent lock (legacy; treated as suspended in Agencies UI)
     */
    accountStatus: {
        type: String,
        enum: ['active', 'pending', 'suspended', 'disabled'],
        default: 'active',
    },

    /**
     * Feature permissions for owner admins.
     * Empty array = all permissions (default full access).
     */
    permissions: {
        type: [String],
        default: [],
    },

    /**
     * Product license (owners only — ignored for superadmin).
     * trial | active | expired
     */
    licenseStatus: {
        type: String,
        enum: ['trial', 'active', 'expired'],
        default: 'trial',
    },
    trialStartedAt: { type: Date },
    trialEndsAt: { type: Date },
    licensedAt: { type: Date },

    lastLoginAt: { type: Date },
    notes: { type: String, default: '' },

    /**
     * SaaS plan assignment (Phase 2).
     * `plan` is the source Plan document; `planSnapshot` is denormalized for hot-path checks
     * so every request does not need a Plan populate. Missing plan → entitlementService
     * grants legacy full access then lazily assigns the default plan.
     */
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null, index: true },
    planSnapshot: {
      code: { type: String, default: '' },
      name: { type: String, default: '' },
      features: { type: [String], default: [] },
      limits: {
        maxVehicles: { type: Number, default: 0 },
        maxUsers: { type: Number, default: 0 },
        maxReservations: { type: Number, default: 0 },
      },
      isDefault: { type: Boolean, default: false },
      assignedAt: { type: Date },
    },

    /** Bumped on password reset / lock to invalidate existing JWTs */
    tokenVersion: { type: Number, default: 0 },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

export default User;
