import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Immutable history of a rental period extension ("Prolonger un contrat").
 * Never overwrite prior extension rows — each confirm creates a new document.
 */
const bookingExtensionSchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true, index: true },
    booking: { type: ObjectId, ref: 'Booking', required: true, index: true },
    originalPickupDate: { type: Date, required: true },
    originalReturnDate: { type: Date, required: true },
    previousReturnDate: { type: Date, required: true },
    newReturnDate: { type: Date, required: true },
    additionalDays: { type: Number, required: true, min: 0 },
    additionalAmount: { type: Number, required: true, min: 0 },
    previousTotal: { type: Number, required: true, min: 0 },
    newTotal: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'MAD' },
    priceBreakdownSnapshot: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    reason: { type: String, default: '' },
    notes: { type: String, default: '' },
    performedBy: { type: ObjectId, ref: 'User', required: true },
    contractId: { type: ObjectId, ref: 'Contract', default: null },
    contractVersion: { type: Number, default: null },
  },
  { timestamps: true },
);

bookingExtensionSchema.index({ owner: 1, createdAt: -1 });
bookingExtensionSchema.index({ owner: 1, booking: 1, createdAt: -1 });

const BookingExtension = mongoose.model('BookingExtension', bookingExtensionSchema);
export default BookingExtension;
