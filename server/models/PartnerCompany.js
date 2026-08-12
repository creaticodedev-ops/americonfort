import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Partner company (Société partenaire) — agency-scoped.
 * Designed for future links to bookings, vehicles, and financial records
 * via nullable FKs (booking.partnerCompany, expenses, etc.).
 */
const partnerCompanySchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true, index: true },
    companyName: { type: String, required: true, trim: true },
    legalName: { type: String, default: '', trim: true },
    contactPerson: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    address: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    country: { type: String, default: 'Morocco', trim: true },
    taxId: { type: String, default: '', trim: true },
    registrationNumber: { type: String, default: '', trim: true },
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

partnerCompanySchema.index({ owner: 1, createdAt: -1 });
partnerCompanySchema.index({ owner: 1, companyName: 1 });
partnerCompanySchema.index({ owner: 1, status: 1, companyName: 1 });

const PartnerCompany = mongoose.model('PartnerCompany', partnerCompanySchema);
export default PartnerCompany;
