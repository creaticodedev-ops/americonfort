/**
 * Agency-scoped customer identity resolution for ClientDocument profiles.
 *
 * Priority (strong → weak):
 *  1. Explicit ClientDocument id
 *  2. Official ID (CIN / national ID, passport) — definitive
 *  3. Normalized phone + compatible name (and no conflicting official IDs)
 *  4. Email + compatible name
 *
 * Shared phones (family / company) MUST NOT merge when official IDs conflict
 * or when names clearly identify different people without an ID match.
 */

import { normalizeToE164 } from '../utils/phoneValidation.js';

const NAME_PARTICLES = new Set([
  'bin', 'bint', 'ben', 'ibn', 'al', 'el', 'dela', 'del', 'de', 'la', 'le', 'van', 'von', 'mr', 'mrs', 'ms', 'mme',
]);

export const normalizeClientPhone = (phone) => {
  const check = normalizeToE164(phone);
  return check.valid ? check.e164 : String(phone || '').trim();
};

export const normalizeOfficialId = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s\-_.]/g, '');

export const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

export const nameTokens = (name) => {
  const raw = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !NAME_PARTICLES.has(t));
  return [...new Set(raw)];
};

/** True when names are compatible enough to support a phone/email match. */
export const namesCompatible = (a, b) => {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.length || !tb.length) return true; // no contradictory name signal
  const setA = new Set(ta);
  const setB = new Set(tb);
  const inter = ta.filter((t) => setB.has(t)).length;
  if (inter === 0) return false;
  const subset =
    ta.every((t) => setB.has(t)) || tb.every((t) => setA.has(t));
  if (subset) return true;
  const union = new Set([...ta, ...tb]).size;
  return inter / union >= 0.5;
};

export const identityFromBooking = (booking = {}) => ({
  clientDocumentId: booking.clientDocument || booking.clientDocumentId || null,
  name: booking.customerName || '',
  phone: normalizeClientPhone(booking.customerPhone),
  email: normalizeEmail(booking.customerEmail),
  cin: normalizeOfficialId(booking.identityDocumentNumber),
  passport: normalizeOfficialId(booking.passportNumber),
  bookingId: booking._id || null,
});

export const identityFromFields = ({
  clientDocumentId,
  name,
  phone,
  email,
  identityDocumentNumber,
  passportNumber,
} = {}) => ({
  clientDocumentId: clientDocumentId || null,
  name: name || '',
  phone: normalizeClientPhone(phone),
  email: normalizeEmail(email),
  cin: normalizeOfficialId(identityDocumentNumber),
  passport: normalizeOfficialId(passportNumber),
  bookingId: null,
});

const profileIds = (doc) => ({
  cin: normalizeOfficialId(doc.identityDocumentNumber),
  passport: normalizeOfficialId(doc.passportNumber),
  phone: normalizeClientPhone(doc.customerPhone),
  email: normalizeEmail(doc.customerEmail),
  name: doc.customerName || '',
});

/** Official IDs conflict when both sides present and differ. */
export const officialIdsConflict = (incoming, existing) => {
  const a = typeof incoming.cin === 'string' ? incoming : identityFromFields(incoming);
  const b = existing.cin !== undefined && existing.phone !== undefined
    ? existing
    : profileIds(existing);
  if (a.cin && b.cin && a.cin !== b.cin) return true;
  if (a.passport && b.passport && a.passport !== b.passport) return true;
  return false;
};

/**
 * Score a candidate profile against incoming identity.
 * score >= 100 → definitive (official ID)
 * score >= 55  → confident merge
 * score < 55   → reject for auto-merge
 */
export const scoreIdentityMatch = (incoming, candidateDoc) => {
  const inc = incoming.phone !== undefined ? incoming : identityFromFields(incoming);
  const cand = profileIds(candidateDoc);
  let score = 0;
  const reasons = [];

  if (officialIdsConflict(inc, cand)) {
    return { score: -1000, reasons: ['official_id_conflict'], reject: true };
  }

  if (inc.cin && cand.cin && inc.cin === cand.cin) {
    score += 100;
    reasons.push('cin');
  }
  if (inc.passport && cand.passport && inc.passport === cand.passport) {
    score += 100;
    reasons.push('passport');
  }

  const phoneHit = Boolean(inc.phone && cand.phone && inc.phone === cand.phone);
  const emailHit = Boolean(inc.email && cand.email && inc.email === cand.email);
  const nameOk = namesCompatible(inc.name, cand.name);
  const nameBothPresent = Boolean(nameTokens(inc.name).length && nameTokens(cand.name).length);

  if (phoneHit) {
    score += 40;
    reasons.push('phone');
    if (nameOk && nameBothPresent) {
      score += 25;
      reasons.push('name');
    } else if (!nameOk && nameBothPresent) {
      // Shared phone + clearly different names without ID proof → do not merge
      score -= 45;
      reasons.push('name_mismatch');
    } else {
      // Name missing on one/both sides — phone is usable but not definitive
      score += 20;
      reasons.push('phone_incomplete_name');
    }
  }

  if (emailHit) {
    score += 20;
    reasons.push('email');
    if (nameOk && nameBothPresent) {
      score += 15;
      reasons.push('name');
    }
  }

  // Soft boost when incoming brings an ID onto a phone-matched profile that lacks one
  if (phoneHit && ((inc.cin && !cand.cin) || (inc.passport && !cand.passport))) {
    score += 10;
    reasons.push('id_enrichment');
  }

  return { score, reasons, reject: score < 0 };
};

export const CONFIDENT_MATCH_SCORE = 55;

/**
 * Stable customerKey preferring official IDs so shared phones do not collide.
 */
export const buildCustomerKey = (identityOrBooking) => {
  const id = identityOrBooking.customerPhone !== undefined || identityOrBooking.phone !== undefined
    ? (identityOrBooking.phone !== undefined
      ? identityOrBooking
      : identityFromBooking(identityOrBooking))
    : identityFromBooking(identityOrBooking);

  if (id.cin) return `cin:${id.cin}`;
  if (id.passport) return `passport:${id.passport}`;
  if (id.phone) {
    const tokens = nameTokens(id.name);
    if (tokens.length) return `phone:${id.phone}:n:${tokens.slice(0, 3).join('-')}`;
    return `phone:${id.phone}`;
  }
  if (id.email) return `email:${id.email}`;
  if (id.bookingId) return `booking:${id.bookingId}`;
  return `anon:${Date.now().toString(36)}`;
};

/**
 * Pick the best ClientDocument among candidates for an incoming identity.
 * @returns {{ match: object|null, ambiguous: boolean, candidates: object[], score: number }}
 */
export const pickBestIdentityMatch = (incoming, candidates = []) => {
  const id = incoming.phone !== undefined ? incoming : identityFromFields(incoming);
  const scored = candidates
    .map((doc) => ({ doc, ...scoreIdentityMatch(id, doc) }))
    .filter((row) => !row.reject && row.score >= CONFIDENT_MATCH_SCORE)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return { match: null, ambiguous: false, candidates: [], score: 0 };
  }

  const top = scored[0];
  // Ambiguous when two confident phone-based matches are close and neither has definitive ID score
  const second = scored[1];
  const topIsDefinitive = top.score >= 100;
  const ambiguous =
    !topIsDefinitive
    && second
    && second.score >= CONFIDENT_MATCH_SCORE
    && top.score - second.score < 20;

  if (ambiguous) {
    return {
      match: null,
      ambiguous: true,
      candidates: scored.slice(0, 5).map((s) => s.doc),
      score: top.score,
    };
  }

  return {
    match: top.doc,
    ambiguous: false,
    candidates: scored.slice(0, 5).map((s) => s.doc),
    score: top.score,
  };
};

/**
 * Build Mongo $or clauses to load candidate ClientDocuments for scoring.
 */
export const candidateQueryForIdentity = (ownerId, identity) => {
  const id = identity.phone !== undefined ? identity : identityFromFields(identity);
  const or = [];
  if (id.cin) {
    or.push({ identityDocumentNumber: id.cin });
    // also match loosely stored CINs (with spaces) via regex on original — use normalized equality after load
  }
  if (id.passport) or.push({ passportNumber: id.passport });
  if (id.phone) or.push({ customerPhone: id.phone });
  if (id.email) or.push({ customerEmail: id.email });
  if (!or.length) return null;
  return { owner: ownerId, $or: or };
};

export default {
  normalizeClientPhone,
  normalizeOfficialId,
  normalizeEmail,
  nameTokens,
  namesCompatible,
  identityFromBooking,
  identityFromFields,
  officialIdsConflict,
  scoreIdentityMatch,
  buildCustomerKey,
  pickBestIdentityMatch,
  candidateQueryForIdentity,
  CONFIDENT_MATCH_SCORE,
};
