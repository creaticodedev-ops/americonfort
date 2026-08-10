/**
 * Shared helpers so walk-in → booking → contract map identity/email consistently.
 */

/** Desk-fabricated placeholder emails must never print on contracts. */
export const isSyntheticWalkInEmail = (email) => {
  const value = String(email || '').trim().toLowerCase();
  if (!value) return false;
  return value.endsWith('@local.americonfort') || value.startsWith('walkin+');
};

/** Contract/PDF display value for customer email. */
export const displayCustomerEmail = (email, empty = '—') => {
  const value = String(email || '').trim();
  if (!value || isSyntheticWalkInEmail(value)) return empty;
  return value;
};

/**
 * Identity document (CIN / ID) is distinct from passport.
 * Prefer explicit identity number; only fall back to passport when no ID was entered.
 */
export const resolveIdentityDocument = ({
  identityDocumentNumber,
  passportNumber,
} = {}, empty = '—') => {
  const identity = String(identityDocumentNumber || '').trim();
  if (identity) return identity;
  const passport = String(passportNumber || '').trim();
  if (passport) return passport;
  return empty;
};

export default {
  isSyntheticWalkInEmail,
  displayCustomerEmail,
  resolveIdentityDocument,
};
