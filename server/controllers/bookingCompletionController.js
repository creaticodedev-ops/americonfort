import Booking from "../models/Booking.js";
import {
  findBookingByCompletionToken,
  initiateBookingCompletion,
  ensureBookingCompletionLink,
  markCompletionPayment,
  refreshCompletionFlags,
  saveSignatureAndMaybeFinalize,
  tryFinalizeBookingCompletion,
  ensureWalkInContractPreview,
} from "../services/bookingCompletionService.js";
import { storeDocumentImage } from "../services/documentStore.js";
import {
  computePayableAmount,
  createStripeCheckoutSession,
  getDepositPercent,
  getPaymentMode,
  retrieveStripeSession,
} from "../services/paymentService.js";
import { cleanupUploadedFile } from "../middleware/multer.js";
import { signDocumentAccessUrl } from "../middleware/uploadAccess.js";
import {
  applyCompletionDetailsToBooking,
  validateCompletionDetails,
} from "../utils/applyCompletionDetails.js";
import User from "../models/User.js";
import { resolveDepositPercent, resolveBookingSettings, validateSecondDriverAgainstRules } from "../services/bookingRules.js";
import { isWalkInChannel } from "../utils/bookingChannel.js";
import { resolveClientBaseUrl } from "../services/completionToken.js";
import { resolveLocalUploadPath } from "../utils/uploadPaths.js";
import { streamPdfFile } from "../utils/streamPdfFile.js";

const signIfLocalUpload = (url) => {
  if (!url || typeof url !== "string") return url || "";
  return signDocumentAccessUrl(url);
};

/** Allow www SPA to embed contract PDFs in an iframe. */
const allowPdfFraming = (res) => {
  const origins = [
    resolveClientBaseUrl(),
    ...(process.env.CLIENT_URL || "")
      .split(",")
      .map((o) => o.trim().replace(/\/$/, ""))
      .filter(Boolean),
    "https://www.americonfort.com",
    "https://americonfort.com",
    "http://localhost:5173",
  ];
  const unique = [...new Set(origins.filter(Boolean))];
  res.removeHeader("X-Frame-Options");
  res.setHeader("Content-Security-Policy", `frame-ancestors ${unique.join(" ")}`);
  res.setHeader("Cache-Control", "private, no-store");
};

/** Prefer snapshot at booking time; else live owner settings; else env default. */
const depositPercentForBooking = async (booking) => {
  const snap = Number(booking?.policySnapshot?.depositPercent);
  if (Number.isFinite(snap) && snap > 0) return snap;
  try {
    const owner = await User.findById(booking.owner).select("bookingSettings").lean();
    return resolveDepositPercent(resolveBookingSettings(owner));
  } catch {
    return getDepositPercent();
  }
};

const publicBookingView = (booking, depositPercent, { token } = {}) => {
  const pct = depositPercent != null ? depositPercent : getDepositPercent(booking?.policySnapshot?.depositPercent);
  const c = booking.completion || {};
  const flags = {
    documentsComplete: Boolean(c.documentsComplete),
    paymentComplete: Boolean(c.paymentComplete),
    signatureComplete: Boolean(c.signatureComplete),
  };
  const walkIn = isWalkInChannel(booking.channel);
  const apiBase = (process.env.API_PUBLIC_URL || "").replace(/\/$/, "");
  // Token-gated stream URL — survives ephemeral /uploads disks and is iframe-safe.
  const streamedContractUrl =
    token && walkIn
      ? `${apiBase || ""}/api/booking-completion/${token}/contract-preview?format=pdf`
      : "";

  return {
    reservationId: booking.reservationId,
    status: booking.status,
    channel: booking.channel || "online",
    signatureOnly: walkIn,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    customerAddress: booking.customerAddress || "",
    placeOfBirth: booking.placeOfBirth || "",
    identityDocumentNumber: booking.identityDocumentNumber || "",
    identityIssuedOn: booking.identityIssuedOn || "",
    driverLicenseIssuedOn: booking.driverLicenseIssuedOn || "",
    pickupDate: booking.pickupDate,
    returnDate: booking.returnDate,
    pickupLocation: booking.pickupLocation,
    returnLocation: booking.returnLocation,
    price: booking.price,
    priceBreakdown: booking.priceBreakdown,
    paymentStatus: booking.paymentStatus,
    dateOfBirth: booking.dateOfBirth || "",
    nationality: booking.nationality || "",
    driverLicenseNumber: booking.driverLicenseNumber || "",
    driverLicenseExpiry: booking.driverLicenseExpiry || "",
    passportNumber: booking.passportNumber || "",
    secondDriver: booking.secondDriver || {
      enabled: false,
      fullName: "",
      dateOfBirth: "",
      nationality: "",
      driverLicenseNumber: "",
      driverLicenseExpiry: "",
      passportNumber: "",
      phone: "",
    },
    car: booking.car
      ? {
          brand: booking.car.brand,
          model: booking.car.model,
          year: booking.car.year,
          image: booking.car.image,
          category: booking.car.category,
        }
      : null,
    completion: {
      drivingLicenseUrl: signIfLocalUpload(c.drivingLicenseUrl || ""),
      identityType: c.identityType || "",
      identityDocumentUrl: signIfLocalUpload(c.identityDocumentUrl || ""),
      signatureUrl: c.signatureUrl ? "on_file" : "",
      secondDriverSignatureUrl: c.secondDriverSignatureUrl ? "on_file" : "",
      paymentType: c.paymentType || "",
      amountPaid: c.amountPaid || 0,
      amountDue: c.amountDue || 0,
      contractPdfUrl: streamedContractUrl || signIfLocalUpload(c.contractPdfUrl || c.contractPreviewUrl || ""),
      contractPreviewUrl: streamedContractUrl || signIfLocalUpload(c.contractPreviewUrl || ""),
      invoicePdfUrl: signIfLocalUpload(c.invoicePdfUrl || ""),
      completedAt: c.completedAt || null,
      documentsComplete: flags.documentsComplete,
      paymentComplete: flags.paymentComplete,
      signatureComplete: flags.signatureComplete,
      depositPercent: pct,
      depositAmount: computePayableAmount(booking.price, "deposit", pct),
      fullAmount: computePayableAmount(booking.price, "full", pct),
      paymentMode: getPaymentMode(),
      expiresAt: c.tokenExpiresAt,
      secondDriverAllowed: booking?.policySnapshot?.secondDriver?.enabled !== false,
      mileage: booking?.policySnapshot?.mileage || null,
      cancellationPolicy: booking?.policySnapshot?.cancellation || null,
    },
  };
};

export const getCompletionBooking = async (req, res) => {
  try {
    let booking = await findBookingByCompletionToken(req.params.token);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Invalid or expired completion link" });
    }
    refreshCompletionFlags(booking);
    if (isWalkInChannel(booking.channel) && !booking.completion?.signatureComplete) {
      try {
        await ensureWalkInContractPreview(booking);
        booking = await findBookingByCompletionToken(req.params.token);
      } catch (previewErr) {
        console.error('[completion] Walk-in contract preview:', previewErr.message);
      }
    }
    await booking.save();
    const depositPercent = await depositPercentForBooking(booking);
    res.json({
      success: true,
      booking: publicBookingView(booking, depositPercent, { token: req.params.token }),
    });
  } catch (error) {
    const status = error.code === "TOKEN_EXPIRED" ? 410 : 400;
    res.status(status).json({ success: false, message: error.message });
  }
};

export const getCompletionContractPreview = async (req, res) => {
  try {
    const booking = await findBookingByCompletionToken(req.params.token);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Invalid or expired completion link" });
    }
    if (!isWalkInChannel(booking.channel)) {
      return res.status(403).json({ success: false, message: "Contract preview is not available for this reservation type" });
    }

    const wantsPdf =
      String(req.query.format || "").toLowerCase() === "pdf"
      || String(req.headers.accept || "").includes("application/pdf");

    let url = await ensureWalkInContractPreview(booking);
    let filePath = resolveLocalUploadPath(url);
    if (!filePath) {
      url = await ensureWalkInContractPreview(booking, { force: true });
      filePath = resolveLocalUploadPath(url);
    }

    if (wantsPdf) {
      if (!filePath) {
        return res.status(404).json({ success: false, message: "Contract PDF could not be generated" });
      }
      allowPdfFraming(res);
      const name = `${booking.reservationId || "contract"}-preview`;
      return streamPdfFile(res, filePath, name, { inline: true });
    }

    const apiBase = (process.env.API_PUBLIC_URL || "").replace(/\/$/, "");
    res.json({
      success: true,
      contractPdfUrl: `${apiBase}/api/booking-completion/${req.params.token}/contract-preview?format=pdf`,
    });
  } catch (error) {
    const status = error.code === "TOKEN_EXPIRED" ? 410 : 500;
    if (!res.headersSent) {
      res.status(status).json({ success: false, message: error.message || "Failed to load contract preview" });
    }
  }
};

/** Stream walk-in contract PDF (regenerates when ephemeral disk lost the file). */
export const streamCompletionContractPreview = async (req, res) => {
  try {
    const booking = await findBookingByCompletionToken(req.params.token);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Invalid or expired completion link" });
    }
    if (!isWalkInChannel(booking.channel)) {
      return res.status(403).json({ success: false, message: "Contract preview is not available for this reservation type" });
    }

    let url = await ensureWalkInContractPreview(booking);
    let filePath = resolveLocalUploadPath(url);
    if (!filePath) {
      url = await ensureWalkInContractPreview(booking, { force: true });
      filePath = resolveLocalUploadPath(url);
    }
    if (!filePath) {
      return res.status(404).json({ success: false, message: "Contract PDF could not be generated" });
    }

    allowPdfFraming(res);
    const name = `${booking.reservationId || "contract"}-preview`;
    return streamPdfFile(res, filePath, name, { inline: true });
  } catch (error) {
    console.error("[completion] stream contract preview:", error.message);
    const status = error.code === "TOKEN_EXPIRED" ? 410 : 500;
    if (!res.headersSent) {
      res.status(status).json({ success: false, message: error.message || "Failed to stream contract preview" });
    }
  }
};

export const uploadCompletionDocument = async (req, res) => {
  let file = req.file;
  try {
    const booking = await findBookingByCompletionToken(req.params.token);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Invalid or expired completion link" });
    }
    if (booking.status === "ready_for_pickup") {
      return res.status(400).json({ success: false, message: "This reservation is already complete" });
    }
    if (isWalkInChannel(booking.channel)) {
      return res.status(403).json({
        success: false,
        message: "This link is for contract signature only. Document uploads are not available.",
      });
    }

    const docType = req.body.docType; // driving_license | identity
    const identityType = req.body.identityType; // national_id | passport

    if (!file) {
      return res.status(400).json({ success: false, message: "Please upload an image file" });
    }
    if (!["driving_license", "identity"].includes(docType)) {
      return res.status(400).json({ success: false, message: "Invalid document type" });
    }

    const url = await storeDocumentImage(file, `/booking-docs/${booking.reservationId}`);
    file = null;

    booking.completion = booking.completion || {};
    if (docType === "driving_license") {
      booking.completion.drivingLicenseUrl = url;
    } else {
      if (!["national_id", "passport"].includes(identityType)) {
        return res.status(400).json({ success: false, message: "Select National ID or Passport" });
      }
      booking.completion.identityType = identityType;
      booking.completion.identityDocumentUrl = url;
    }

    refreshCompletionFlags(booking);
    const { syncCompletionDocumentsToArchive } = await import('../services/customerDocuments.js');
    syncCompletionDocumentsToArchive(booking);
    await booking.save();
    try {
      const { ensureClientDocumentsSynced } = await import('../services/clientDocumentService.js');
      await ensureClientDocumentsSynced(booking.owner);
    } catch (syncErr) {
      console.error('[completion] ClientDocument sync:', syncErr.message);
    }
    await tryFinalizeBookingCompletion(booking._id);
    const fresh = await Booking.findById(booking._id).populate("car");

    res.json({
      success: true,
      message: "Document uploaded",
      booking: publicBookingView(fresh),
    });
  } catch (error) {
    console.error(error.message);
    const status = error.code === "TOKEN_EXPIRED" ? 410 : 500;
    res.status(status).json({ success: false, message: error.message || "Upload failed" });
  } finally {
    cleanupUploadedFile(file);
  }
};

export const saveCompletionDetails = async (req, res) => {
  try {
    const booking = await findBookingByCompletionToken(req.params.token);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Invalid or expired completion link" });
    }
    if (booking.status === "ready_for_pickup") {
      return res.status(400).json({ success: false, message: "This reservation is already complete" });
    }
    if (isWalkInChannel(booking.channel)) {
      return res.status(403).json({
        success: false,
        message: "This link is for contract signature only. Reservation details cannot be changed here.",
      });
    }

    console.log('[SAVE_DETAILS] Incoming body', req.body);

    if (req.body?.secondDriver?.enabled) {
      const owner = await User.findById(booking.owner).select('bookingSettings').lean();
      const sdCheck = validateSecondDriverAgainstRules({
        settings: resolveBookingSettings(owner),
        secondDriver: req.body.secondDriver,
      });
      if (!sdCheck.valid) {
        return res.status(400).json({ success: false, message: sdCheck.message, code: sdCheck.code });
      }
    }

    applyCompletionDetailsToBooking(booking, req.body);

    await booking.save();
    refreshCompletionFlags(booking);
    const fresh = await Booking.findById(booking._id).populate('car');
    const depositPercent = await depositPercentForBooking(fresh);

    res.json({
      success: true,
      message: 'Contract details saved',
      booking: publicBookingView(fresh, depositPercent),
    });
  } catch (error) {
    console.error(error.message);
    const status = error.code === 'TOKEN_EXPIRED' ? 410 : error.code === 'VALIDATION' ? 400 : 500;
    res.status(status).json({ success: false, message: error.message || 'Failed to save contract details' });
  }
};

export const createCompletionPayment = async (req, res) => {
  try {
    const booking = await findBookingByCompletionToken(req.params.token);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Invalid or expired completion link" });
    }
    if (isWalkInChannel(booking.channel)) {
      return res.status(403).json({
        success: false,
        message: "Online payment is not required for this reservation. Please sign the contract.",
      });
    }
    if (booking.completion?.paymentComplete) {
      return res.json({ success: true, alreadyPaid: true, booking: publicBookingView(booking) });
    }

    const paymentType = req.body.paymentType === "deposit" ? "deposit" : "full";
    const depositPercent = await depositPercentForBooking(booking);
    const amount = computePayableAmount(booking.price, paymentType, depositPercent);
    const mode = getPaymentMode();
    const clientBase = resolveClientBaseUrl();
    const token = req.params.token;

    booking.completion = booking.completion || {};
    booking.completion.paymentType = paymentType;
    booking.completion.amountDue = amount;
    await booking.save();

    if (mode === "stripe") {
      const session = await createStripeCheckoutSession({
        booking,
        paymentType,
        amount,
        successUrl: `${clientBase}/complete-booking/${token}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${clientBase}/complete-booking/${token}?cancelled=1`,
      });
      booking.completion.stripeSessionId = session.id;
      await booking.save();
      return res.json({
        success: true,
        mode: "stripe",
        checkoutUrl: session.url,
        amount,
        paymentType,
      });
    }

    if (mode === "disabled") {
      return res.status(503).json({
        success: false,
        message: "Online payments are not configured. Contact the agency.",
      });
    }

    // Demo / sandbox payment — local/staging only (blocked in production without ALLOW_DEMO_PAYMENT)
    return res.json({
      success: true,
      mode: "demo",
      amount,
      paymentType,
      message: "Demo payment ready — confirm to simulate a successful charge",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Payment init failed" });
  }
};

export const confirmDemoPayment = async (req, res) => {
  try {
    const mode = getPaymentMode();
    if (mode === "stripe" || mode === "disabled") {
      return res.status(400).json({
        success: false,
        message: "Demo payment is disabled in this environment",
      });
    }
    if (String(process.env.ALLOW_DEMO_PAYMENT || "").toLowerCase() !== "true" && process.env.NODE_ENV === "production") {
      return res.status(400).json({ success: false, message: "Demo payment disabled" });
    }

    const booking = await findBookingByCompletionToken(req.params.token);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Invalid or expired completion link" });
    }

    const paymentType = req.body.paymentType === "deposit" ? "deposit" : "full";
    const depositPercent = await depositPercentForBooking(booking);
    const amount = computePayableAmount(booking.price, paymentType, depositPercent);
    const result = await markCompletionPayment(booking, { paymentType, amount });

    res.json({
      success: true,
      message: "Payment recorded",
      finalized: result.finalized,
      booking: publicBookingView(result.booking, depositPercent),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Payment failed" });
  }
};

export const confirmStripePayment = async (req, res) => {
  try {
    const booking = await findBookingByCompletionToken(req.params.token);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Invalid or expired completion link" });
    }

    const sessionId = req.body.sessionId || req.query.session_id;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Missing Stripe session" });
    }

    const session = await retrieveStripeSession(sessionId);
    if (session.payment_status !== "paid") {
      return res.status(400).json({ success: false, message: "Payment not completed yet" });
    }

    const metaBookingId = session.metadata?.bookingId || session.client_reference_id;
    if (!metaBookingId || metaBookingId !== booking._id.toString()) {
      return res.status(400).json({ success: false, message: "Session mismatch" });
    }

    const depositPercent = await depositPercentForBooking(booking);
    const expectedAmount = computePayableAmount(
      booking.price,
      session.metadata?.paymentType === "deposit" ? "deposit" : "full",
      depositPercent,
    );
    const paidAmount = (session.amount_total || 0) / 100;
    // Allow 1 minor-unit tolerance for currency rounding
    if (Math.abs(paidAmount - expectedAmount) > 0.02) {
      return res.status(400).json({ success: false, message: "Paid amount does not match booking" });
    }

    const paymentType = session.metadata?.paymentType === "deposit" ? "deposit" : "full";
    const amount = paidAmount;
    const result = await markCompletionPayment(booking, {
      paymentType,
      amount,
      stripeSessionId: sessionId,
    });

    res.json({
      success: true,
      message: "Payment confirmed",
      finalized: result.finalized,
      booking: publicBookingView(result.booking),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message || "Stripe confirmation failed" });
  }
};

export const submitCompletionSignature = async (req, res) => {
  try {
    const booking = await findBookingByCompletionToken(req.params.token);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Invalid or expired completion link" });
    }

    const walkIn = isWalkInChannel(booking.channel);
    const { signatureDataUrl, secondDriverSignatureDataUrl, agreed, ...detailsPayload } = req.body;
    if (!agreed) {
      return res.status(400).json({ success: false, message: "You must agree to the rental terms" });
    }
    if (!signatureDataUrl || !String(signatureDataUrl).startsWith("data:image")) {
      return res.status(400).json({ success: false, message: "Please provide your signature" });
    }

    if (walkIn) {
      const blockedKeys = [
        'customerName', 'customerEmail', 'customerPhone', 'dateOfBirth', 'nationality',
        'customerAddress', 'placeOfBirth', 'identityDocumentNumber', 'identityIssuedOn',
        'driverLicenseNumber', 'driverLicenseExpiry', 'driverLicenseIssuedOn', 'passportNumber',
        'secondDriver', 'docType', 'identityType', 'paymentType',
      ].filter((k) => detailsPayload[k] !== undefined);
      if (blockedKeys.length) {
        return res.status(400).json({
          success: false,
          message: "Only signature data is accepted on this link.",
          code: 'SIGNATURE_ONLY',
        });
      }
    } else {
      // Persist any last-minute form fields sent with the signature step (online flow)
      const hasDetailFields = [
        'customerName',
        'customerEmail',
        'customerPhone',
        'dateOfBirth',
        'nationality',
        'customerAddress',
        'placeOfBirth',
        'identityDocumentNumber',
        'identityIssuedOn',
        'driverLicenseNumber',
        'driverLicenseExpiry',
        'driverLicenseIssuedOn',
        'passportNumber',
        'secondDriver',
      ].some((k) => detailsPayload[k] !== undefined);

      if (hasDetailFields) {
        applyCompletionDetailsToBooking(booking, detailsPayload);
      }
      validateCompletionDetails(booking);
      await booking.save();

      refreshCompletionFlags(booking);
      if (!booking.completion.documentsComplete) {
        return res.status(400).json({ success: false, message: "Upload required documents first" });
      }
    }

    if (booking.secondDriver?.enabled) {
      if (!secondDriverSignatureDataUrl || !String(secondDriverSignatureDataUrl).startsWith("data:image")) {
        return res.status(400).json({ success: false, message: "Please provide the second driver signature" });
      }
    }

    const result = await saveSignatureAndMaybeFinalize(booking, {
      signatureDataUrl,
      secondDriverSignatureDataUrl,
    });
    const message = walkIn
      ? (result.finalized ? "Signature saved — thank you" : "Signature saved")
      : (result.finalized
        ? "Signed — your reservation is ready for pickup"
        : "Signature saved");
    res.json({
      success: true,
      message,
      finalized: result.finalized,
      booking: publicBookingView(result.booking, undefined, { token: req.params.token }),
    });
  } catch (error) {
    console.error(error.message);
    const status = error.code === 'VALIDATION' ? 400
      : error.code === 'ALREADY_SIGNED' || error.code === 'TOKEN_CANCELLED' ? 409
      : 500;
    res.status(status).json({ success: false, message: error.message || "Signature failed" });
  }
};

/** Owner: ensure a valid completion link exists (no WhatsApp / Meta API). */
export const ensureCompletionLink = async (req, res) => {
  try {
    const { bookingId, refresh } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: "bookingId is required" });
    }
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.owner?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const result = await ensureBookingCompletionLink(bookingId, { refresh: Boolean(refresh) });
    res.status(200).json({
      success: true,
      completionUrl: result.completionUrl,
      shareableCompletionUrl: result.completionUrl,
      created: result.created,
      status: result.booking.status,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message || "Failed to ensure completion link" });
  }
};

/** Owner: resend secure completion link */
export const resendCompletionLink = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.owner?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const result = await initiateBookingCompletion(bookingId, { resend: true });
    const emailOk = Boolean(result.emailResult?.success);
    res.status(200).json({
      success: true,
      emailSent: emailOk,
      message: emailOk
        ? `Completion email accepted by SMTP for ${result.emailResult.to}`
        : `Completion link refreshed. Email NOT delivered: ${result.emailResult?.reason || "unknown error"}`,
      completionUrl: result.completionUrl,
      email: result.emailResult,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message || "Failed to send link" });
  }
};

export const emailDiagnostics = async (req, res) => {
  try {
    const { verifyEmailTransport, getSmtpConfigSummary } = await import("../services/emailService.js");
    const result = await verifyEmailTransport();
    res.json({
      success: result.success,
      diagnostics: result,
      summary: getSmtpConfigSummary(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendTestEmail = async (req, res) => {
  try {
    const { sendEmail, getSmtpConfigSummary } = await import("../services/emailService.js");
    const to = (req.body?.to || req.user?.email || "").trim();
    if (!to) {
      return res.status(400).json({ success: false, message: "Provide { to: 'email@example.com' }" });
    }
    const result = await sendEmail({
      to,
      subject: "Americonfort — SMTP test",
      html: `<p>This is a test email from Americonfort.</p><p>If you received this, SMTP delivery is working.</p><p>${new Date().toISOString()}</p>`,
    });
    res.status(result.success ? 200 : 502).json({
      success: result.success,
      message: result.success
        ? `Test email accepted by SMTP for ${result.to}`
        : `Test email FAILED: ${result.reason}`,
      email: result,
      smtp: getSmtpConfigSummary(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const adminInitiateCompletion = initiateBookingCompletion;

export default {
  getCompletionBooking,
  getCompletionContractPreview,
  streamCompletionContractPreview,
  uploadCompletionDocument,
  createCompletionPayment,
  confirmDemoPayment,
  confirmStripePayment,
  submitCompletionSignature,
  resendCompletionLink,
  ensureCompletionLink,
  emailDiagnostics,
  sendTestEmail,
};
