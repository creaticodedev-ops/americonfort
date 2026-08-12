import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const PAYMENT_STATUSES = ['pending', 'paid', 'cancelled'];

/**
 * Agency-level operating expense (Charges Agences).
 */
const agencyExpenseSchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true, index: true },
    category: {
      type: String,
      enum: [
        'rent',
        'utilities',
        'salaries',
        'marketing',
        'insurance',
        'taxes',
        'supplies',
        'software',
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
      enum: PAYMENT_STATUSES,
      default: 'pending',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'check', 'card', 'other'],
      default: 'cash',
    },
    notes: { type: String, default: '' },
    /** Optional future link to partner company */
    partnerCompany: { type: ObjectId, ref: 'PartnerCompany', default: null },
    createdBy: { type: ObjectId, ref: 'User', default: null },
    updatedBy: { type: ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

agencyExpenseSchema.index({ owner: 1, expenseDate: -1 });
agencyExpenseSchema.index({ owner: 1, category: 1, expenseDate: -1 });

const AgencyExpense = mongoose.model('AgencyExpense', agencyExpenseSchema);
export default AgencyExpense;
export { PAYMENT_STATUSES as AGENCY_EXPENSE_PAYMENT_STATUSES };
