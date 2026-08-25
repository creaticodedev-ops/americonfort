import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const FUEL_LEVELS = ['empty', 'quarter', 'half', 'three_quarter', 'full'];

const photoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    caption: { type: String, default: '' },
    takenAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const damageSchema = new mongoose.Schema(
  {
    area: { type: String, default: '' },
    severity: {
      type: String,
      enum: ['minor', 'major', 'total'],
      default: 'minor',
    },
    description: { type: String, default: '' },
    photoUrls: { type: [String], default: [] },
    estimatedCost: { type: Number, default: 0, min: 0 },
    /** Set when a ledger damage charge is posted from this row */
    ledgerEntryId: { type: ObjectId, ref: 'BookingLedgerEntry', default: null },
    chargePostedAt: { type: Date, default: null },
  },
  { _id: true },
);

/**
 * Pickup / return vehicle inspection for a booking.
 * Completing mirrors km/fuel onto Booking for contract templates.
 */
const rentalInspectionSchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true, index: true },
    booking: { type: ObjectId, ref: 'Booking', required: true, index: true },
    car: { type: ObjectId, ref: 'Car', required: true, index: true },
    type: {
      type: String,
      enum: ['pickup', 'return'],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'completed'],
      default: 'draft',
      index: true,
    },
    performedAt: { type: Date, default: null },
    performedBy: { type: ObjectId, ref: 'User', default: null },
    odometer: { type: Number, default: null },
    fuelLevel: {
      type: String,
      enum: [...FUEL_LEVELS, ''],
      default: '',
    },
    checklist: {
      keys: { type: Boolean, default: false },
      papers: { type: Boolean, default: false },
      spareTire: { type: Boolean, default: false },
      jack: { type: Boolean, default: false },
      clean: { type: Boolean, default: false },
    },
    conditionNotes: { type: String, default: '' },
    notes: { type: String, default: '' },
    photos: { type: [photoSchema], default: [] },
    damages: { type: [damageSchema], default: [] },
    /**
     * Optional suggested late fee (hours past return − grace) — staff confirms as charge.
     */
    suggestedLateFee: { type: Number, default: 0 },
    suggestedLateHours: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

rentalInspectionSchema.index({ owner: 1, booking: 1, type: 1 });
rentalInspectionSchema.index(
  { booking: 1, type: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'completed' },
  },
);

export const INSPECTION_FUEL_LEVELS = FUEL_LEVELS;

const RentalInspection = mongoose.model('RentalInspection', rentalInspectionSchema);
export default RentalInspection;
