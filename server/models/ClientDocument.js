import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const clientFileSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['combined', 'national_id', 'driving_license', 'passport', 'identity', 'other'],
      required: true,
    },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: null },
    sourceBookingId: { type: ObjectId, ref: 'Booking', default: null },
    channel: { type: String, default: '' },
  },
  { _id: true },
);

/** Agency-scoped customer identity document archive. */
const clientDocumentSchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true, index: true },
    customerKey: { type: String, default: '', trim: true, index: true },
    customerName: { type: String, default: '', trim: true },
    customerPhone: { type: String, default: '', trim: true, index: true },
    customerEmail: { type: String, default: '', trim: true, lowercase: true },
    identityDocumentNumber: { type: String, default: '', trim: true, index: true },
    passportNumber: { type: String, default: '', trim: true, index: true },
    /** Primary / legacy single URL (mirrors latest combined or first file) */
    documentUrl: { type: String, default: '' },
    documentType: {
      type: String,
      enum: ['combined', 'national_id', 'driving_license', 'passport', 'identity', 'other'],
      default: 'combined',
    },
    files: [clientFileSchema],
    syncedLegacyKeys: [{ type: String }],
    channelFlags: {
      walkIn: { type: Boolean, default: false },
      online: { type: Boolean, default: false },
      channels: [{ type: String }],
    },
    guestCustomer: { type: ObjectId, ref: 'GuestCustomer', default: null },
    bookingIds: [{ type: ObjectId, ref: 'Booking' }],
    lastBooking: { type: ObjectId, ref: 'Booking', default: null },
    reservationCount: { type: Number, default: 0 },
    uploadedBy: { type: ObjectId, ref: 'User', default: null },
    uploadedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

clientDocumentSchema.index({ owner: 1, customerPhone: 1 });
clientDocumentSchema.index({ owner: 1, customerKey: 1 });
clientDocumentSchema.index({ owner: 1, identityDocumentNumber: 1 });
clientDocumentSchema.index({ owner: 1, passportNumber: 1 });
clientDocumentSchema.index({ owner: 1, customerName: 1 });
clientDocumentSchema.index({ owner: 1, updatedAt: -1 });
clientDocumentSchema.index({ owner: 1, 'files.type': 1 });

const ClientDocument = mongoose.model('ClientDocument', clientDocumentSchema);
export default ClientDocument;
