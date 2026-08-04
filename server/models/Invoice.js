import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  description: { type: String, default: '' },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null, index: true },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'ExportTemplate', default: null },
  source: { type: String, enum: ['booking', 'manual'], default: 'booking', index: true },
  invoiceNumber: { type: String, required: true, index: true },
  invoiceDate: { type: Date, default: Date.now },
  dueDate: { type: Date, default: null },
  currency: { type: String, default: 'MAD' },
  customerName: { type: String, default: '' },
  customerEmail: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  customerAddress: { type: String, default: '' },
  customerTaxId: { type: String, default: '' },
  vehicleBrand: { type: String, default: '' },
  vehicleModel: { type: String, default: '' },
  vehicleYear: { type: String, default: '' },
  vehiclePlate: { type: String, default: '' },
  vehicleType: { type: String, default: '' },
  items: [invoiceItemSchema],
  subtotal: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, default: 'pending' },
  paymentMethod: { type: String, default: 'cash' },
  paymentReference: { type: String, default: '' },
  notes: { type: String, default: '' },
  renderedHtml: { type: String, default: '' },
  pdfUrl: { type: String, default: '' },
  pdfPath: { type: String, default: '' },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  includeCompanyStamp: { type: Boolean, default: true },
  status: {
    type: String,
    enum: ['draft', 'final'],
    default: 'final',
  },
}, { timestamps: true });

invoiceSchema.index({ owner: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ owner: 1, createdAt: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
