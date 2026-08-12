import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Commission / payment to a Samsar — separate from customer Payment model.
 */
const samsarPaymentSchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true, index: true },
    samsar: { type: ObjectId, ref: 'Samsar', required: true, index: true },
    booking: { type: ObjectId, ref: 'Booking', default: null, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'MAD' },
    paymentDate: { type: Date, required: true, index: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'check', 'other'],
      default: 'cash',
    },
    notes: { type: String, default: '' },
    createdBy: { type: ObjectId, ref: 'User', default: null },
    updatedBy: { type: ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

samsarPaymentSchema.index({ owner: 1, paymentDate: -1 });
samsarPaymentSchema.index({ owner: 1, samsar: 1, paymentDate: -1 });
samsarPaymentSchema.index({ owner: 1, paymentStatus: 1, paymentDate: -1 });

const SamsarPayment = mongoose.model('SamsarPayment', samsarPaymentSchema);
export default SamsarPayment;
