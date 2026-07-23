import mongoose from 'mongoose';

const contractSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'ExportTemplate', default: null },
  contractNumber: { type: String, required: true, index: true },
  renderedHtml: { type: String, default: '' },
  pdfUrl: { type: String, default: '' },
  pdfPath: { type: String, default: '' },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: {
    type: String,
    enum: ['draft', 'final'],
    default: 'final',
  },
}, { timestamps: true });

contractSchema.index({ owner: 1, contractNumber: 1 }, { unique: true });
contractSchema.index({ owner: 1, createdAt: -1 });

const Contract = mongoose.model('Contract', contractSchema);

export default Contract;
