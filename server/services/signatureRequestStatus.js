import { isTokenExpired } from './completionToken.js';

export const SIGNATURE_STATUSES = Object.freeze([
  'none',
  'pending',
  'signed',
  'expired',
  'cancelled',
]);

/**
 * Resolve signature-request status from completion fields (safe backfill).
 * Prefer persisted signatureRequestStatus when authoritative; otherwise derive.
 */
export const resolveSignatureRequestStatus = (booking) => {
  const c = booking?.completion || {};
  const stored = c.signatureRequestStatus;

  if (c.signatureComplete || (c.signatureUrl && c.signatureSignedAt)) {
    return 'signed';
  }
  if (stored === 'cancelled' || c.signatureCancelledAt) {
    return 'cancelled';
  }
  if (stored === 'expired') {
    return 'expired';
  }
  if (c.tokenHash) {
    if (isTokenExpired(c.tokenExpiresAt)) return 'expired';
    return 'pending';
  }
  if (stored && stored !== 'none') return stored;
  return 'none';
};

/**
 * Persist derived status when it drifted (additive, non-destructive).
 */
export const syncSignatureRequestStatus = (booking) => {
  booking.completion = booking.completion || {};
  const next = resolveSignatureRequestStatus(booking);
  if (booking.completion.signatureRequestStatus !== next) {
    booking.completion.signatureRequestStatus = next;
  }
  return next;
};

export default {
  SIGNATURE_STATUSES,
  resolveSignatureRequestStatus,
  syncSignatureRequestStatus,
};
