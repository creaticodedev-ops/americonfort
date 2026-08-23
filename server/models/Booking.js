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
  /** @deprecated legacy plain-text snapshot — prefer brokerReferrerSamsar / brokerReferrerPartner refs */
  brokerReferrer: { type: String, default: "" },
  /** @deprecated legacy plain-text snapshot — prefer vehicleDeliveryDriverChauffeur ref */
  vehicleDeliveryDriver: { type: String, default: "" },
  /** Broker / referrer — individual intermediary (Samsar record) */
  brokerReferrerSamsar: { type: ObjectId, ref: "Samsar", default: null, index: true },
  /** Broker / referrer — partner company (Hotel, agency partner, etc.) */
  brokerReferrerPartner: { type: ObjectId, ref: "PartnerCompany", default: null, index: true },
  /** Staff driver who delivered the vehicle (distinct from booking.chauffeur assignment) */
  vehicleDeliveryDriverChauffeur: { type: ObjectId, ref: "Chauffeur", default: null, index: true },
  deliveredBy: { type: String, default: "" },
  receivedBy: { type: String, default: "" },
  fuelLevelStart: { type: String, default: "" },
  kmDepart: { type: String, default: "" },
  kmRetour: { type: String, default: "" },
  franchiseAmount: { type: Number, default: null },
  /** Snapshot of owner booking rules applied at create/update (audit / contracts) */
  policySnapshot: {
    mileage: {
      unlimited: { type: Boolean, default: true },
      includedKmPerDay: { type: Number, default: 0 },
      extraKmRate: { type: Number, default: 0 },
    },
    cancellation: {
      enabled: { type: Boolean, default: false },
      freeCancellationHours: { type: Number, default: 24 },
      lateCancellationFeePercent: { type: Number, default: 0 },
      noShowFeePercent: { type: Number, default: 0 },
      policyText: { type: String, default: '' },
    },
    pickupReturn: {
      fuelPolicy: { type: String, default: 'full_to_full' },
      lateReturnGraceMinutes: { type: Number, default: 60 },
      lateReturnFeePerHour: { type: Number, default: 0 },
      openingTime: { type: String, default: '06:00' },
      closingTime: { type: String, default: '22:00' },
    },
    secondDriver: {
      enabled: { type: Boolean, default: true },
      feePerRental: { type: Number, default: 0 },
      feePerDay: { type: Number, default: 0 },
      minAge: { type: Number, default: 21 },
      minLicenseYears: { type: Number, default: 1 },
      maxExtraDrivers: { type: Number, default: 1 },
    },
    depositPercent: { type: Number, default: 0 },
  },
  cancellationMeta: {
    feePercent: { type: Number, default: 0 },
    feeAmount: { type: Number, default: 0 },
    withinFreeWindow: { type: Boolean, default: true },
    reason: { type: String, default: '' },
    at: { type: Date, default: null },
  },
  /** Set when pending reservation auto-expired by booking settings job */
  expiredAt: { type: Date, default: null },
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
    combinedDocumentUrl: { type: String, default: "" },
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
  /** Linked agency client document archive (walk-in combined photo) */
  clientDocument: { type: ObjectId, ref: "ClientDocument", default: null },
  /** Future-ready partner / staff links (nullable) */
  chauffeur: { type: ObjectId, ref: "Chauffeur", default: null, index: true },
  samsar: { type: ObjectId, ref: "Samsar", default: null, index: true },
  partnerCompany: { type: ObjectId, ref: "PartnerCompany", default: null, index: true },
  /** Secure post-confirmation completion workflow */
  completion: {
    /** SHA-256 hash of the raw token (required for /complete-booking/:token lookup) */
    tokenHash: { type: String, default: "" },
    shareableCompletionUrl: { type: String, default: "" },
    tokenExpiresAt: { type: Date, default: null },
    linkSentAt: { type: Date, default: null },
    /**
     * Signature-request state machine (extends completion; does not replace it).
     * none | pending | signed | expired | cancelled
     */
    signatureRequestStatus: {
      type: String,
      enum: ["none", "pending", "signed", "expired", "cancelled"],
      default: "none",
    },
    signatureCancelledAt: { type: Date, default: null },
    signatureCancelledBy: { type: ObjectId, ref: "User", default: null },
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
bookingSchema.index({ owner: 1, status: 1, createdAt: 1 });
bookingSchema.index({ "completion.tokenHash": 1 });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
