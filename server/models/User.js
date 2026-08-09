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
     * WhatsApp dial numbers used for guest reservation + booking confirmation wa.me links.
     * Stored without +; normalized to digits (e.g. 212665330116). Empty → env fallback.
     */
    whatsappSettings: {
      reservationNumber: { type: String, default: '' },
      confirmationNumber: { type: String, default: '' },
    },

    /**
     * Account gate (independent of license trial).
     * active    → can log in (subject to license for owners)
     * suspended → temporary lock
     * disabled  → permanent lock
     */
    accountStatus: {
        type: String,
        enum: ['active', 'suspended', 'disabled'],
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

    /** Bumped on password reset / lock to invalidate existing JWTs */
    tokenVersion: { type: Number, default: 0 },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

export default User;
