import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Agency chauffeur (staff driver) — distinct from Booking.secondDriver (customer).
 * Future: assign via booking.chauffeur.
 */
const chauffeurSchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true, index: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    address: { type: String, default: '', trim: true },
    licenseNumber: { type: String, default: '', trim: true },
    licenseExpiry: { type: Date, default: null },
    licenseCategory: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    notes: { type: String, default: '' },
    /** Optional document URLs if uploads are attached later */
    documents: {
      licenseUrl: { type: String, default: '' },
      identityUrl: { type: String, default: '' },
    },
    createdBy: { type: ObjectId, ref: 'User', default: null },
    updatedBy: { type: ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

chauffeurSchema.index({ owner: 1, createdAt: -1 });
chauffeurSchema.index({ owner: 1, fullName: 1 });
chauffeurSchema.index({ owner: 1, status: 1 });
chauffeurSchema.index({ owner: 1, licenseExpiry: 1 });

const Chauffeur = mongoose.model('Chauffeur', chauffeurSchema);
export default Chauffeur;
