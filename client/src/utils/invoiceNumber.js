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
  const padded = seq.padStart(Math.max(3, seq.length), '0');
  return `${padded}/${year}`;
};

export const isValidInvoiceNumberFormat = (raw) => {
  const normalized = normalizeInvoiceNumber(raw);
  return INVOICE_NUMBER_RE.test(normalized);
};

export const invoiceNumberValidationMessage = (raw, t) => {
  if (!String(raw || '').trim()) {
    return t
      ? t('admin.invoices.numberRequired')
      : 'Invoice number is required (format XXX/YYYY, e.g. 001/2026)';
  }
  if (!isValidInvoiceNumberFormat(raw)) {
    return t
      ? t('admin.invoices.numberInvalid')
      : 'Invalid invoice number. Use XXX/YYYY (e.g. 001/2026)';
  }
  return null;
};

export default {
  normalizeInvoiceNumber,
  isValidInvoiceNumberFormat,
  invoiceNumberValidationMessage,
};
