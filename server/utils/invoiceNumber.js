/**
 * Manual invoice numbering: XXX/YYYY (e.g. 001/2026).
 */

const INVOICE_NUMBER_RE = /^(\d{1,6})\/(\d{4})$/;

export const normalizeInvoiceNumber = (raw) => {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  const match = trimmed.match(INVOICE_NUMBER_RE);
  if (!match) return trimmed;
  const seq = String(parseInt(match[1], 10));
  const year = match[2];
  // Keep operator intent: pad to at least 3 digits when they type a short sequence.
  const padded = seq.padStart(Math.max(3, seq.length), '0');
  return `${padded}/${year}`;
};

export const isValidInvoiceNumberFormat = (raw) => {
  const normalized = normalizeInvoiceNumber(raw);
  return INVOICE_NUMBER_RE.test(normalized);
};

export const invoiceNumberValidationMessage = (raw) => {
  if (!String(raw || '').trim()) {
    return 'Invoice number is required (format XXX/YYYY, e.g. 001/2026)';
  }
  if (!isValidInvoiceNumberFormat(raw)) {
    return 'Invalid invoice number. Use XXX/YYYY (e.g. 001/2026)';
  }
  return null;
};

/** Suggest next number for a given year from existing numbers like 012/2026. */
export const suggestNextInvoiceNumber = (existingNumbers = [], year = new Date().getFullYear()) => {
  const y = String(year);
  let max = 0;
  for (const raw of existingNumbers) {
    const n = normalizeInvoiceNumber(raw);
    const m = n.match(INVOICE_NUMBER_RE);
    if (!m || m[2] !== y) continue;
    max = Math.max(max, parseInt(m[1], 10) || 0);
  }
  return `${String(max + 1).padStart(3, '0')}/${y}`;
};

export default {
  normalizeInvoiceNumber,
  isValidInvoiceNumberFormat,
  invoiceNumberValidationMessage,
  suggestNextInvoiceNumber,
};
