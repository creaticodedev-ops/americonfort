import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import {
  buildCompletionUrl,
  generateCompletionToken,
  hashToken,
  isTokenExpired,
  isStaleCompletionUrl,
  resolveClientBaseUrl,
} from "./completionToken.js";
import { sendCompletionInviteEmail, sendFinalConfirmationEmail } from "./emailService.js";
import { publicUploadUrl } from "./pdfDocuments.js";
import { ensureDefaultTemplates } from "../controllers/exportTemplateController.js";
import { getDefaultContractTemplate } from "../utils/resolveExportTemplate.js";
import { logAudit } from "../utils/adminOps.js";
import { storeDataUrlImage } from "./documentStore.js";
import { resolveIncludeCompanyStamp } from "./documentSettings.js";
import { upsertContractFromBooking } from "../controllers/contractController.js";
import { nextContractNumber } from "./contractNumberService.js";
import { isWalkInChannel } from "../utils/bookingChannel.js";
import { generateContractPdf } from "./templatePdfExport.js";

const formatDt = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("en-GB", { hour12: false });
};

export const generateCompletionLink = async (bookingId, { resend = false } = {}) => {
  const booking = await Booking.findById(bookingId).populate('car');
  if (!booking) throw new Error('Booking not found');
  if (booking.status === 'cancelled') throw new Error('Cancelled reservations cannot be completed');

  booking.completion = booking.completion || {};
  const existingUrl = String(booking.completion.shareableCompletionUrl || '').trim();
  const hasStoredHash = Boolean(booking.completion.tokenHash);
  const tokenStillValid =
    hasStoredHash && !isTokenExpired(booking.completion.tokenExpiresAt);
  // Stored URLs built with a missing/wrong CLIENT_URL (e.g. localhost) must be rotated
  // once the public SPA origin is configured — otherwise customers receive dead links.
  const urlStale = isStaleCompletionUrl(existingUrl);

  if (!resend && existingUrl && tokenStillValid && !urlStale) {
    return {
      booking,
      completionUrl: existingUrl,
      reused: true,
    };
  }

  if (urlStale && existingUrl) {
    console.warn(
      '[completion] Regenerating shareable link; stored URL origin does not match',
      resolveClientBaseUrl(),
      { reservationId: booking.reservationId, existingUrl },
    );
  }

  const { token, tokenHash, expiresAt } = generateCompletionToken();
  booking.completion.tokenHash = tokenHash;
  booking.completion.tokenExpiresAt = expiresAt;

  if (booking.status === 'pending') {
    booking.status = 'confirmed';
  }

  const completionUrl = buildCompletionUrl(token);
  booking.completion.shareableCompletionUrl = completionUrl;
  if (booking.completion.signatureRequestStatus !== 'signed') {
    booking.completion.signatureRequestStatus = 'pending';
    booking.completion.signatureCancelledAt = null;
    booking.completion.signatureCancelledBy = null;
  }
  await booking.save();

  return {
    booking,
    completionUrl,
    reused: false,
  };
};

/**
 * Return a valid completion URL, creating or refreshing the token when missing or expired.
 */
export const ensureBookingCompletionLink = async (bookingId, { refresh = false } = {}) => {
  const result = await generateCompletionLink(bookingId, { resend: refresh });
  return {
    booking: result.booking,
    completionUrl: result.completionUrl,
    created: !result.reused,
  };
};

export const initiateBookingCompletion = async (bookingId, { resend = false } = {}) => {
  const { booking, completionUrl } = await generateCompletionLink(bookingId, { resend });

  const vehicle = booking.car ? `${booking.car.brand} ${booking.car.model}` : 'Vehicle';
  const currency = process.env.CURRENCY || 'MAD';

  let emailResult = {
    success: false,
    skipped: true,
    reason: 'not attempted',
    to: booking.customerEmail,
  };

  try {
    emailResult = await sendCompletionInviteEmail({
      to: booking.customerEmail,
      customerName: booking.customerName,
      reservationId: booking.reservationId,
      completionUrl,
      vehicle,
      pickupDate: formatDt(booking.pickupDate),
      returnDate: formatDt(booking.returnDate),
      total: booking.price,
      currency,
    });
  } catch (emailErr) {
    console.error('[email] Completion invite threw:', emailErr.message);
    emailResult = {
      success: false,
      skipped: false,
      reason: emailErr.message || 'Email send failed',
      to: booking.customerEmail,
    };
  }

  booking.completion.lastEmail = {
    type: 'completion_invite',
    to: emailResult.to || booking.customerEmail,
    success: Boolean(emailResult.success),
    skipped: Boolean(emailResult.skipped),
    reason: emailResult.reason || '',
    messageId: emailResult.messageId || '',
    at: new Date(),
  };
  if (emailResult.success) {
    booking.completion.linkSentAt = new Date();
  }
  await booking.save();

  if (!emailResult.success && !emailResult.skipped) {
    console.error(
      '[email] Completion invite NOT delivered:',
      emailResult.reason || emailResult.error,
      { reservationId: booking.reservationId },
    );
  }

  try {
    await logAudit({
      owner: booking.owner,
      action: resend ? 'booking.completion_link_resent' : 'booking.completion_link_sent',
      entityType: 'Booking',
      entityId: booking._id,
      details: emailResult.success
        ? `Completion email accepted by SMTP for ${booking.reservationId}`
        : `Completion link ensured for ${booking.reservationId} (email: ${emailResult.reason || 'skipped'})`,
    });
  } catch { /* ignore */ }

  return {
    booking,
    completionUrl,
    emailResult,
  };
};

export const buildCompletionMessageBody = ({ booking, completionUrl, vehicle, pickupDate, returnDate, currency }) => [
  `Hello ${booking.customerName || 'Customer'},`,
  '',
  `Your reservation ${booking.reservationId || ''} has been confirmed.`,
  `Vehicle: ${vehicle}`,
  `Pickup: ${pickupDate}`,
  `Return: ${returnDate}`,
  `Total: ${currency}${booking.price}`,
  '',
  `Complete your booking securely here: ${completionUrl}`,
].join('\n');

export const findBookingByCompletionToken = async (rawToken) => {
  if (!rawToken || String(rawToken).length < 20) return null;
  const tokenHash = hashToken(rawToken);
  const booking = await Booking.findOne({ "completion.tokenHash": tokenHash }).populate("car");
  if (!booking) return null;
  if (isTokenExpired(booking.completion?.tokenExpiresAt)) {
    try {
      booking.completion.signatureRequestStatus = 'expired';
      await booking.save();
    } catch {
      /* non-fatal */
    }
    const err = new Error("This completion link has expired. Please contact the agency.");
    err.code = "TOKEN_EXPIRED";
    throw err;
  }
  if (booking.completion?.signatureRequestStatus === 'cancelled') {
    const err = new Error("This signature request was cancelled. Please contact the agency.");
    err.code = "TOKEN_CANCELLED";
    throw err;
  }
  if (["cancelled"].includes(booking.status)) {
    const err = new Error("This reservation is no longer available.");
    err.code = "CANCELLED";
    throw err;
  }
  return booking;
};

export const refreshCompletionFlags = (booking) => {
  const c = booking.completion || {};
  const walkIn = isWalkInChannel(booking.channel);
  if (walkIn) {
    // Walk-in: staff collected customer data at desk — no customer document upload step.
    c.documentsComplete = true;
  } else {
    c.documentsComplete = Boolean(
      c.drivingLicenseUrl && c.identityDocumentUrl && (c.identityType === "national_id" || c.identityType === "passport")
    );
  }
  c.paymentComplete = Boolean(c.paymentCompletedAt && (c.amountPaid > 0 || booking.paymentStatus === "paid"));
  const needsSecondDriverSig = Boolean(booking.secondDriver?.enabled);
  const secondDriverSigOk =
    !needsSecondDriverSig ||
    Boolean(c.secondDriverSignatureUrl && c.secondDriverSignatureSignedAt);
  c.signatureComplete = Boolean(
    c.signatureUrl && c.signatureSignedAt && secondDriverSigOk
  );
  if (c.signatureComplete) {
    c.signatureRequestStatus = 'signed';
  }
  booking.completion = c;
  return c;
};

/** Generate (or reuse) unsigned contract PDF for walk-in signature review. */
export const ensureWalkInContractPreview = async (booking) => {
  if (!isWalkInChannel(booking.channel)) return null;

  booking.completion = booking.completion || {};
  const c = booking.completion;

  if (c.signatureComplete && c.contractPdfUrl) {
    return c.contractPdfUrl;
  }
  if (c.contractPreviewUrl && !c.signatureUrl) {
    return c.contractPreviewUrl;
  }

  await ensureDefaultTemplates(booking.owner);
  const populated = await Booking.findById(booking._id).populate('car').populate('owner');
  const template = await getDefaultContractTemplate(populated.owner?._id || populated.owner);
  if (!template) {
    throw new Error('No contract template found. Set a default contract template in Admin → Export Templates.');
  }

  const ownerId = populated.owner?._id || populated.owner;
  const ownerDoc =
    populated.owner && typeof populated.owner === 'object' && populated.owner.documentSettings != null
      ? populated.owner
      : await User.findById(ownerId).select('documentSettings agencyName email').lean();
  const includeCompanyStamp = resolveIncludeCompanyStamp({
    owner: ownerDoc || populated.owner,
    documentType: 'contracts',
  });

  const contractNumber = populated.reservationId || `PREVIEW-${populated._id.toString().slice(-6).toUpperCase()}`;
  const bookingObj = populated.toObject ? populated.toObject() : populated;
  const { filePath, pdfUrl } = await generateContractPdf({
    template: template.toObject ? template.toObject() : template,
    booking: bookingObj,
    contractNumber,
    owner: ownerDoc || populated.owner,
    includeCompanyStamp,
  });

  c.contractPreviewUrl = pdfUrl || publicUploadUrl(filePath);
  populated.completion = c;
  populated.markModified('completion');
  await populated.save();
  return c.contractPreviewUrl;
};

/**
 * When docs + payment + signature are done → Ready for Pickup + PDFs + final email.
 * Walk-in: signature only — keep status confirmed, generate signed contract PDF.
 */
export const tryFinalizeBookingCompletion = async (bookingId) => {
  let booking = await Booking.findById(bookingId).populate('car').populate('owner');
  if (!booking) return null;

  const flags = refreshCompletionFlags(booking);
  await booking.save();

  const walkIn = isWalkInChannel(booking.channel);

  if (walkIn) {
    if (!flags.signatureComplete) {
      return { finalized: false, booking, flags };
    }
    // Only skip regeneration when a signed PDF was already produced after this signature.
    const signedAt = booking.completion.signatureSignedAt
      ? new Date(booking.completion.signatureSignedAt).getTime()
      : 0;
    const signedPdfAt = booking.completion.signedContractGeneratedAt
      ? new Date(booking.completion.signedContractGeneratedAt).getTime()
      : 0;
    if (
      booking.completion.contractPdfUrl
      && signedAt
      && signedPdfAt
      && signedPdfAt >= signedAt
    ) {
      return { finalized: true, booking, flags, alreadyDone: true, walkIn: true };
    }
  } else if (!flags.documentsComplete || !flags.signatureComplete) {
    return { finalized: false, booking, flags };
  }

  if (!walkIn && booking.status === "ready_for_pickup" && booking.completion.completedAt) {
    return { finalized: true, booking, flags, alreadyDone: true };
  }

  let contractPath;
  let contractPdfUrl;

  // Always use the Admin-selected default contract template (SSOT).
  await ensureDefaultTemplates(booking.owner);
  booking = await Booking.findById(bookingId).populate('car').populate('owner');
  const template = await getDefaultContractTemplate(booking.owner);

  if (!template) {
    throw new Error('No contract template found. Set a default contract template in Admin → Export Templates.');
  }

  const ownerId = booking.owner?._id || booking.owner;
  const contractNumber = await nextContractNumber(ownerId);
  const ownerDoc =
    booking.owner && typeof booking.owner === 'object' && booking.owner.documentSettings != null
      ? booking.owner
      : await User.findById(ownerId).select('documentSettings agencyName email').lean();
  const includeCompanyStamp = resolveIncludeCompanyStamp({
    owner: ownerDoc || booking.owner,
    documentType: 'contracts',
  });
  let persistedContract;
  try {
    // Never overwrite manually edited contracts during completion
    persistedContract = await upsertContractFromBooking({
      owner: booking.owner,
      booking,
      user: booking.owner,
      template,
      includeCompanyStamp,
      contractNumber,
      note: 'Booking completion',
      // Walk-in must refresh placeholders after signature so the pad appears on the PDF.
      forceFromBooking: walkIn,
    });
  } catch (pdfError) {
    console.error('[FINALIZE] Contract PDF failed:', pdfError);
    const err = new Error(pdfError.message || 'Contract PDF generation failed');
    err.cause = pdfError;
    throw err;
  }
  contractPath = persistedContract.pdfPath;
  contractPdfUrl = persistedContract.pdfUrl;

  booking.completion.contractPdfUrl = contractPdfUrl || publicUploadUrl(contractPath);
  if (walkIn) {
    booking.completion.signedContractGeneratedAt = new Date();
  }
  delete booking.completion.invoicePdfUrl;

  if (walkIn) {
    booking.completion.completedAt = booking.completion.completedAt || new Date();
    booking.markModified('completion');
    await booking.save();
    return { finalized: true, booking, flags, walkIn: true };
  }

  booking.completion.completedAt = new Date();
  booking.status = "ready_for_pickup";

  const paid = Boolean(booking.completion.paymentCompletedAt && booking.completion.amountPaid > 0);
  if (paid) {
    booking.paymentStatus = "paid";
    await booking.save();

    await Payment.findOneAndUpdate(
      { booking: booking._id },
      {
        status: "paid",
        amount: booking.completion.amountPaid,
        gateway: booking.completion.stripeSessionId ? "stripe" : (process.env.PAYMENT_MODE || "demo"),
        method: booking.completion.paymentType || "online",
        reference: booking.reservationId,
      },
      { upsert: true }
    );
  } else {
    await booking.save();
  }

  const vehicle = booking.car ? `${booking.car.brand} ${booking.car.model}` : "Vehicle";
  const currency = process.env.CURRENCY || "MAD";
  const detailsHtml = `
    <ul>
      <li>Pickup: ${booking.pickupLocation || "—"} · ${formatDt(booking.pickupDate)}</li>
      <li>Return: ${booking.returnLocation || "—"} · ${formatDt(booking.returnDate)}</li>
      <li>Total: ${currency}${booking.price}</li>
      <li>Paid: ${currency}${booking.completion.amountPaid} (${booking.completion.paymentType})</li>
    </ul>
  `;

  const finalEmailResult = await sendFinalConfirmationEmail({
    to: booking.customerEmail,
    customerName: booking.customerName,
    reservationId: booking.reservationId,
    vehicle,
    detailsHtml,
    contractPath,
  });

  booking.completion.lastEmail = {
    type: "final_confirmation",
    to: finalEmailResult.to || booking.customerEmail,
    success: Boolean(finalEmailResult.success),
    skipped: Boolean(finalEmailResult.skipped),
    reason: finalEmailResult.reason || "",
    messageId: finalEmailResult.messageId || "",
    at: new Date(),
  };
  await booking.save();

  if (!finalEmailResult.success) {
    console.error(
      "[email] Final confirmation NOT delivered:",
      finalEmailResult.reason,
      { reservationId: booking.reservationId }
    );
  }

  try {
    await logAudit({
      owner: booking.owner,
      action: "booking.ready_for_pickup",
      entityType: "Booking",
      entityId: booking._id,
      details: finalEmailResult.success
        ? `${booking.reservationId} ready for pickup — final email accepted by SMTP`
        : `${booking.reservationId} ready for pickup — final EMAIL FAILED: ${finalEmailResult.reason || "unknown"}`,
    });
  } catch { /* ignore */ }

  return { finalized: true, booking, flags, emailResult: finalEmailResult };
};

export const markCompletionPayment = async (booking, { paymentType, amount, stripeSessionId = "" }) => {
  booking.completion = booking.completion || {};
  booking.completion.paymentType = paymentType;
  booking.completion.amountDue = amount;
  booking.completion.amountPaid = amount;
  booking.completion.paymentCompletedAt = new Date();
  booking.completion.stripeSessionId = stripeSessionId || booking.completion.stripeSessionId || "";
  booking.paymentStatus = "paid";
  refreshCompletionFlags(booking);
  await booking.save();
  return tryFinalizeBookingCompletion(booking._id);
};

export const saveSignatureAndMaybeFinalize = async (
  booking,
  { signatureDataUrl, secondDriverSignatureDataUrl } = {}
) => {
  booking.completion = booking.completion || {};
  if (booking.completion.signatureComplete || booking.completion.signatureRequestStatus === 'signed') {
    const err = new Error('This contract has already been signed');
    err.code = 'ALREADY_SIGNED';
    throw err;
  }
  if (booking.completion.signatureRequestStatus === 'cancelled') {
    const err = new Error('This signature request was cancelled');
    err.code = 'TOKEN_CANCELLED';
    throw err;
  }

  const url = await storeDataUrlImage(signatureDataUrl, `signature-${booking.reservationId}.png`);
  booking.completion.signatureUrl = url;
  booking.completion.signatureSignedAt = new Date();
  booking.completion.signatureRequestStatus = 'signed';

  const needsSecond = Boolean(booking.secondDriver?.enabled);
  if (needsSecond) {
    if (!secondDriverSignatureDataUrl || !String(secondDriverSignatureDataUrl).startsWith('data:image')) {
      const err = new Error('Second driver signature is required');
      err.code = 'VALIDATION';
      throw err;
    }
    const secondUrl = await storeDataUrlImage(
      secondDriverSignatureDataUrl,
      `signature-2nd-${booking.reservationId}.png`
    );
    booking.completion.secondDriverSignatureUrl = secondUrl;
    booking.completion.secondDriverSignatureSignedAt = new Date();
  } else {
    booking.completion.secondDriverSignatureUrl = '';
    booking.completion.secondDriverSignatureSignedAt = null;
  }

  refreshCompletionFlags(booking);
  booking.markModified('completion');
  await booking.save();
  return tryFinalizeBookingCompletion(booking._id);
};

export default {
  initiateBookingCompletion,
  generateCompletionLink,
  ensureBookingCompletionLink,
  findBookingByCompletionToken,
  refreshCompletionFlags,
  ensureWalkInContractPreview,
  tryFinalizeBookingCompletion,
  markCompletionPayment,
  saveSignatureAndMaybeFinalize,
};
