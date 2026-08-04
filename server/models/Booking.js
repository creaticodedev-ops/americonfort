import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

const bookingSchema = new mongoose.Schema({
  reservationId: { type: String, unique: true, sparse: true, index: true },
  car: { type: ObjectId, ref: "Car", required: true },
  user: { type: ObjectId, ref: "User", default: null },
  owner: { type: ObjectId, ref: "User", required: true },
  pickupDate: { type: Date, required: true },
  returnDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ["pending", "confirmed", "ready_for_pickup", "active", "completed", "cancelled"],
    default: "pending",
  },
  price: { type: Number, required: true },
  priceBreakdown: {
    days: { type: Number, default: 0 },
    pricePerDay: { type: Number, default: 0 },
    rentalPrice: { type: Number, default: 0 },
    pickupDeliveryFee: { type: Number, default: 0 },
    dropoffDeliveryFee: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    discounts: [{
      code: { type: String, default: "" },
      label: { type: String, default: "" },
      amount: { type: Number, default: 0 },
    }],
    lineItems: [{
      type: { type: String },
      label: { type: String },
      amount: { type: Number },
      meta: { type: Object, default: {} },
    }],
  },
  customerName: { type: String, default: "" },
  customerEmail: { type: String, default: "" },
  customerPhone: { type: String, default: "" },
  pickupLocation: { type: String, default: "" },
  returnLocation: { type: String, default: "" },
  pickupLocationId: { type: ObjectId, ref: "PickupLocation", default: null },
  returnLocationId: { type: ObjectId, ref: "PickupLocation", default: null },
  notes: { type: String, default: "" },
  nationality: { type: String, default: "" },
  dateOfBirth: { type: String, default: "" },
  placeOfBirth: { type: String, default: "" },
  customerAddress: { type: String, default: "" },
  identityDocumentNumber: { type: String, default: "" },
  identityIssuedOn: { type: String, default: "" },
  driverLicenseNumber: { type: String, default: "" },
  driverLicenseExpiry: { type: String, default: "" },
  driverLicenseIssuedOn: { type: String, default: "" },
  passportNumber: { type: String, default: "" },
  /** Contract operational fields (filled at desk / pickup) */
  deliveredBy: { type: String, default: "" },
  receivedBy: { type: String, default: "" },
  fuelLevelStart: { type: String, default: "" },
  kmDepart: { type: String, default: "" },
  kmRetour: { type: String, default: "" },
  franchiseAmount: { type: Number, default: null },
  /** Optional second driver on rental contract */
  secondDriver: {
    enabled: { type: Boolean, default: false },
    fullName: { type: String, default: "" },
    dateOfBirth: { type: String, default: "" },
    nationality: { type: String, default: "" },
    driverLicenseNumber: { type: String, default: "" },
    driverLicenseExpiry: { type: String, default: "" },
    passportNumber: { type: String, default: "" },
    phone: { type: String, default: "" },
  },
  /** Permanent archive of customer identity documents */
  customerDocuments: {
    drivingLicenseUrl: { type: String, default: "" },
    identityType: {
      type: String,
      enum: ["", "national_id", "passport"],
      default: "",
    },
    identityDocumentUrl: { type: String, default: "" },
    passportUrl: { type: String, default: "" },
    uploadedAt: { type: Date, default: null },
    source: {
      type: String,
      enum: ["", "online", "walk_in", "admin"],
      default: "",
    },
    uploadedBy: { type: ObjectId, ref: "User", default: null },
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending",
  },
  /**
   * Reservation origin:
   * online   — guest booking from public site
   * walk_in  — created by staff at the agency desk
   * whatsapp — guest reserved via WhatsApp CTA (pending until staff confirms)
   */
  channel: {
    type: String,
    enum: ["online", "walk_in", "whatsapp"],
    default: "online",
    index: true,
  },
  /** Staff user who created a walk-in reservation */
  createdBy: { type: ObjectId, ref: "User", default: null },
  /** Secure post-confirmation completion workflow */
  completion: {
    /** SHA-256 hash of the raw token (required for /complete-booking/:token lookup) */
    tokenHash: { type: String, default: "" },
    shareableCompletionUrl: { type: String, default: "" },
    tokenExpiresAt: { type: Date, default: null },
    linkSentAt: { type: Date, default: null },
    drivingLicenseUrl: { type: String, default: "" },
    identityType: {
      type: String,
      enum: ["", "national_id", "passport"],
      default: "",
    },
    identityDocumentUrl: { type: String, default: "" },
    signatureUrl: { type: String, default: "" },
    signatureSignedAt: { type: Date, default: null },
    secondDriverSignatureUrl: { type: String, default: "" },
    secondDriverSignatureSignedAt: { type: Date, default: null },
    paymentType: {
      type: String,
      enum: ["", "deposit", "full"],
      default: "",
    },
    amountDue: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    paymentCompletedAt: { type: Date, default: null },
    stripeSessionId: { type: String, default: "" },
    contractPdfUrl: { type: String, default: "" },
    invoicePdfUrl: { type: String, default: "" },
    documentsComplete: { type: Boolean, default: false },
    paymentComplete: { type: Boolean, default: false },
    signatureComplete: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    lastEmail: {
      type: { type: String, default: "" },
      to: { type: String, default: "" },
      success: { type: Boolean, default: false },
      skipped: { type: Boolean, default: false },
      reason: { type: String, default: "" },
      messageId: { type: String, default: "" },
      at: { type: Date, default: null },
    },
    lastWhatsApp: {
      type: { type: String, default: "" },
      success: { type: Boolean, default: false },
      skipped: { type: Boolean, default: false },
      reason: { type: String, default: "" },
      provider: { type: String, default: "" },
      at: { type: Date, default: null },
    },
  },
}, { timestamps: true });

bookingSchema.index({ car: 1, status: 1, pickupDate: 1, returnDate: 1 });
bookingSchema.index({ owner: 1, createdAt: -1 });
bookingSchema.index({ owner: 1, customerEmail: 1 });
bookingSchema.index({ owner: 1, channel: 1, createdAt: -1 });
bookingSchema.index({ "completion.tokenHash": 1 });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
