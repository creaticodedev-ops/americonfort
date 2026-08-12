import Booking from '../models/Booking.js';
import Contract from '../models/Contract.js';
import {
  generateCompletionLink,
  ensureBookingCompletionLink,
} from './bookingCompletionService.js';
import { sendCompletionInviteEmail } from './emailService.js';
import {
  resolveSignatureRequestStatus,
  syncSignatureRequestStatus,
} from './signatureRequestStatus.js';
import { logAudit } from '../utils/adminOps.js';
import { parsePagination, parseDateRange, escapeRegex } from '../utils/listQuery.js';

const assertOwnerBooking = async (bookingId, ownerId) => {
  const booking = await Booking.findById(bookingId)
    .populate('car', 'brand model licensePlate')
    .lean(false);
  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }
  if (String(booking.owner) !== String(ownerId)) {
    const err = new Error('Unauthorized');
    err.status = 403;
    throw err;
  }
  return booking;
};

export const generateSignatureRequest = async ({ bookingId, ownerId, actorId, resend = false }) => {
  const booking = await assertOwnerBooking(bookingId, ownerId);
  if (booking.status === 'cancelled') {
    const err = new Error('Cancelled reservations cannot receive signature requests');
    err.status = 400;
    throw err;
  }

  const result = await generateCompletionLink(bookingId, { resend: true });
  const b = result.booking;
  b.completion = b.completion || {};
  b.completion.signatureRequestStatus = 'pending';
  b.completion.signatureCancelledAt = null;
  b.completion.signatureCancelledBy = null;
  b.completion.linkSentAt = new Date();
  await b.save();

  await logAudit({
    owner: ownerId,
    actor: actorId || ownerId,
    action: resend ? 'signature.resend' : 'signature.generate',
    entityType: 'Booking',
    entityId: bookingId,
    details: `Signature request link ${resend ? 'resent' : 'generated'} for ${b.reservationId || bookingId}`,
  });

  return {
    booking: b,
    completionUrl: result.completionUrl,
    status: resolveSignatureRequestStatus(b),
  };
};

export const resendSignatureRequest = async ({ bookingId, ownerId, actorId }) => {
  // Rotate token exactly once, then email that URL (do not regenerate again).
  const generated = await generateSignatureRequest({
    bookingId,
    ownerId,
    actorId,
    resend: true,
  });

  const booking = generated.booking;
  const vehicle = booking.car ? `${booking.car.brand} ${booking.car.model}` : 'Vehicle';
  try {
    const emailResult = await sendCompletionInviteEmail({
      to: booking.customerEmail,
      customerName: booking.customerName,
      reservationId: booking.reservationId,
      completionUrl: generated.completionUrl,
      vehicle,
      pickupDate: booking.pickupDate,
      returnDate: booking.returnDate,
      total: booking.price,
      currency: process.env.CURRENCY || 'MAD',
    });
    booking.completion = booking.completion || {};
    booking.completion.lastEmail = {
      type: 'completion_invite',
      to: emailResult.to || booking.customerEmail,
      success: Boolean(emailResult.success),
      skipped: Boolean(emailResult.skipped),
      reason: emailResult.reason || '',
      messageId: emailResult.messageId || '',
      at: new Date(),
    };
    await booking.save();
  } catch {
    // Link remains valid even if email fails
  }
  return generated;
};

export const cancelSignatureRequest = async ({ bookingId, ownerId, actorId }) => {
  const booking = await assertOwnerBooking(bookingId, ownerId);
  booking.completion = booking.completion || {};

  if (booking.completion.signatureComplete) {
    const err = new Error('Cannot cancel a signed signature request');
    err.status = 400;
    throw err;
  }

  booking.completion.signatureRequestStatus = 'cancelled';
  booking.completion.signatureCancelledAt = new Date();
  booking.completion.signatureCancelledBy = actorId || ownerId;
  // Invalidate token (single-use / cancel) while keeping audit of prior URL cleared
  booking.completion.tokenHash = '';
  booking.completion.shareableCompletionUrl = '';
  booking.completion.tokenExpiresAt = null;
  await booking.save();

  await logAudit({
    owner: ownerId,
    actor: actorId || ownerId,
    action: 'signature.cancel',
    entityType: 'Booking',
    entityId: bookingId,
    details: `Signature request cancelled for ${booking.reservationId || bookingId}`,
  });

  return {
    booking,
    status: 'cancelled',
  };
};

export const getSignatureRequestStatus = async ({ bookingId, ownerId }) => {
  const booking = await assertOwnerBooking(bookingId, ownerId);
  const prev = booking.completion?.signatureRequestStatus;
  const status = syncSignatureRequestStatus(booking);
  if (prev !== status) {
    await booking.save();
  }

  let contract = null;
  if (status === 'signed') {
    contract = await Contract.findOne({ owner: ownerId, booking: bookingId })
      .select('contractNumber pdfUrl status version updatedAt')
      .lean();
  }

  return {
    bookingId: booking._id,
    reservationId: booking.reservationId,
    customerName: booking.customerName,
    status,
    tokenExpiresAt: booking.completion?.tokenExpiresAt || null,
    shareableCompletionUrl: booking.completion?.shareableCompletionUrl || '',
    signatureComplete: Boolean(booking.completion?.signatureComplete),
    signatureSignedAt: booking.completion?.signatureSignedAt || null,
    contract,
  };
};

export const listSignatureRequests = async ({ ownerId, query = {} }) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { owner: ownerId };

  if (query.search) {
    const re = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [
      { reservationId: re },
      { customerName: re },
      { customerEmail: re },
      { customerPhone: re },
    ];
  }

  const dateFilter = parseDateRange(query.from, query.to, 'createdAt');
  if (dateFilter) Object.assign(filter, dateFilter);

  // Preload candidates that have any completion activity or explicit status
  filter.$and = filter.$and || [];
  filter.$and.push({
    $or: [
      { 'completion.tokenHash': { $ne: '' } },
      { 'completion.signatureRequestStatus': { $in: ['pending', 'signed', 'expired', 'cancelled'] } },
      { 'completion.signatureComplete': true },
      { 'completion.signatureUrl': { $ne: '' } },
    ],
  });

  const bookings = await Booking.find(filter)
    .populate('car', 'brand model licensePlate')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Booking.countDocuments(filter);

  const items = bookings.map((b) => {
    const status = resolveSignatureRequestStatus(b);
    return {
      _id: b._id,
      bookingId: b._id,
      reservationId: b.reservationId,
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      car: b.car,
      status,
      tokenExpiresAt: b.completion?.tokenExpiresAt || null,
      shareableCompletionUrl: b.completion?.shareableCompletionUrl || '',
      signatureSignedAt: b.completion?.signatureSignedAt || null,
      updatedAt: b.updatedAt,
      createdAt: b.createdAt,
    };
  }).filter((row) => {
    if (!query.status || query.status === 'all') return true;
    return row.status === query.status;
  });

  // Note: status filter applied after derive — total may be approximate when status filtered
  return {
    items,
    pagination: {
      page,
      limit,
      total: query.status && query.status !== 'all' ? items.length : total,
      pages: Math.ceil((query.status && query.status !== 'all' ? items.length : total) / limit) || 1,
    },
  };
};

export const ensureSignatureLink = async ({ bookingId, ownerId, actorId, refresh = false }) => {
  await assertOwnerBooking(bookingId, ownerId);
  if (refresh) {
    return generateSignatureRequest({ bookingId, ownerId, actorId, resend: true });
  }
  const result = await ensureBookingCompletionLink(bookingId, { refresh: false });
  const b = result.booking;
  b.completion = b.completion || {};
  if (b.completion.signatureRequestStatus === 'none' || !b.completion.signatureRequestStatus) {
    b.completion.signatureRequestStatus = 'pending';
    await b.save();
  }
  return {
    booking: b,
    completionUrl: result.completionUrl,
    status: resolveSignatureRequestStatus(b),
  };
};

export default {
  generateSignatureRequest,
  resendSignatureRequest,
  cancelSignatureRequest,
  getSignatureRequestStatus,
  listSignatureRequests,
  ensureSignatureLink,
};
