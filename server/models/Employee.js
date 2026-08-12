import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Agency employee (personnel record) — NOT a dashboard login.
 * Distinct from:
 * - User/owner (authenticated agency admin)
 * - Staff permissions on User (authenticated operators)
 * - Chauffeur (drivers assignable to bookings)
 * - Samsar (intermediaries)
 */
const employeeSchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true, index: true },
    photo: { type: String, default: '' },
    position: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    hireDate: { type: Date, default: null },
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

employeeSchema.index({ owner: 1, createdAt: -1 });
employeeSchema.index({ owner: 1, status: 1, fullName: 1 });
employeeSchema.index({ owner: 1, position: 1 });

employeeSchema.pre('validate', function syncFullName(next) {
  const first = String(this.firstName || '').trim();
  const last = String(this.lastName || '').trim();
  this.fullName = [first, last].filter(Boolean).join(' ').trim() || this.fullName || 'Employee';
  next();
});

const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;
