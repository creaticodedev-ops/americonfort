import mongoose from 'mongoose';
import { documentVersionSchema, templateSnapshotSchema } from './documentVersionSchema.js';

const contractSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'ExportTemplate', default: null },
  contractNumber: { type: String, required: true, index: true },
  /** Frozen template sections for this instance — never mutates ExportTemplate */
  templateSnapshot: { type: templateSnapshotSchema, default: () => ({}) },
  /** Canonical JSON: { variables, structured, meta } */
  sourceData: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  renderedHtml: { type: String, default: '' },
  pdfUrl: { type: String, default: '' },
  pdfPath: { type: String, default: '' },
  includeCompanyStamp: { type: Boolean, default: true },
  /** Denormalized for list search */
  customerName: { type: String, default: '', index: true },
  customerPhone: { type: String, default: '' },
  customerEmail: { type: String, default: '' },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  version: { type: Number, default: 1 },
  versions: { type: [documentVersionSchema], default: [] },
  lastGeneratedAt: { type: Date, default: null },
  status: {
    type: String,
    enum: ['draft', 'final'],
    default: 'final',
  },
}, { timestamps: true });

contractSchema.index({ owner: 1, contractNumber: 1 }, { unique: true });
// One active contract per booking (booking-sourced docs)
contractSchema.index(
  { owner: 1, booking: 1 },
  { unique: true, partialFilterExpression: { booking: { $type: 'objectId' } } },
);
contractSchema.index({ owner: 1, createdAt: -1 });

const Contract = mongoose.model('Contract', contractSchema);

export default Contract;
