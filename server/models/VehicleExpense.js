import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Vehicle-related accounting expense (Charges Voitures).
 * Distinct from operational MaintenanceRecord (optional link).
 */
const vehicleExpenseSchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true, index: true },
    car: { type: ObjectId, ref: 'Car', required: true, index: true },
    category: {
      type: String,
      enum: [
        'fuel',
        'maintenance',
        'repair',
        'insurance',
        'registration',
        'tires',
        'cleaning',
        'parking',
        'tolls',
        'other',
      ],
      default: 'other',
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'MAD' },
    expenseDate: { type: Date, required: true, index: true },
    description: { type: String, default: '', trim: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'check', 'card', 'other'],
      default: 'cash',
    },
    odometer: { type: Number, default: null },
    notes: { type: String, default: '' },
    booking: { type: ObjectId, ref: 'Booking', default: null },
    maintenanceRecord: { type: ObjectId, ref: 'MaintenanceRecord', default: null },
    createdBy: { type: ObjectId, ref: 'User', default: null },
    updatedBy: { type: ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

vehicleExpenseSchema.index({ owner: 1, expenseDate: -1 });
vehicleExpenseSchema.index({ owner: 1, car: 1, expenseDate: -1 });
vehicleExpenseSchema.index({ owner: 1, category: 1, expenseDate: -1 });

const VehicleExpense = mongoose.model('VehicleExpense', vehicleExpenseSchema);
export default VehicleExpense;
