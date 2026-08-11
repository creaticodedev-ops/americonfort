import mongoose from 'mongoose';
import {
  PLAN_FEATURES,
  UNLIMITED_LIMITS,
  normalizePlanFeatures,
  normalizePlanLimits,
} from '../constants/planFeatures.js';

const planSchema = new mongoose.Schema(
  {
    /** Stable machine key (e.g. full_access). Not shown as the primary UI name. */
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9_-]{2,64}$/, 'Invalid plan code'],
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    features: {
      type: [String],
      default: () => [...PLAN_FEATURES],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.every((f) => PLAN_FEATURES.includes(f));
        },
        message: 'Invalid plan feature',
      },
    },
    limits: {
      maxVehicles: { type: Number, default: 0, min: 0 },
      maxUsers: { type: Number, default: 0, min: 0 },
      maxReservations: { type: Number, default: 0, min: 0 },
    },
    isActive: { type: Boolean, default: true },
    /** Exactly one default plan should be used for new/legacy agencies. */
    isDefault: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 100 },
  },
  { timestamps: true },
);

planSchema.index({ isActive: 1, sortOrder: 1 });
planSchema.index({ isDefault: 1 });

planSchema.pre('validate', function normalize(next) {
  this.features = normalizePlanFeatures(this.features);
  this.limits = normalizePlanLimits(this.limits || UNLIMITED_LIMITS);
  if (this.code) this.code = String(this.code).trim().toLowerCase();
  next();
});

const Plan = mongoose.model('Plan', planSchema);
export default Plan;
