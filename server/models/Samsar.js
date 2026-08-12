import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Commissionaire / intermediary (Samsar) — agency-scoped master data.
 * Can later be linked to many Bookings via booking.samsar.
 */
const samsarSchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true, index: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    address: { type: String, default: '', trim: true },
    /** Default commission configuration (actual payouts live in SamsarPayment). */
    commissionType: {
      type: String,
      enum: ['percent', 'fixed', 'none'],
      default: 'percent',
    },
    commissionValue: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    notes: { type: String, default: '' },
    createdBy: { type: ObjectId, ref: 'User', default: null },
    updatedBy: { type: ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

samsarSchema.index({ owner: 1, createdAt: -1 });
samsarSchema.index({ owner: 1, fullName: 1 });
samsarSchema.index({ owner: 1, status: 1, fullName: 1 });

const Samsar = mongoose.model('Samsar', samsarSchema);
export default Samsar;
