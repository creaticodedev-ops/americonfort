import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/** Agency-scoped customer identity document archive (walk-in combined photo, etc.). */
const clientDocumentSchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true, index: true },
    customerName: { type: String, default: '', trim: true },
    customerPhone: { type: String, default: '', trim: true, index: true },
    identityDocumentNumber: { type: String, default: '', trim: true, index: true },
    passportNumber: { type: String, default: '', trim: true, index: true },
    documentUrl: { type: String, default: '' },
    documentType: {
      type: String,
      enum: ['combined'],
      default: 'combined',
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
clientDocumentSchema.index({ owner: 1, identityDocumentNumber: 1 });
clientDocumentSchema.index({ owner: 1, passportNumber: 1 });
clientDocumentSchema.index({ owner: 1, customerName: 1 });
clientDocumentSchema.index({ owner: 1, updatedAt: -1 });

const ClientDocument = mongoose.model('ClientDocument', clientDocumentSchema);
export default ClientDocument;
