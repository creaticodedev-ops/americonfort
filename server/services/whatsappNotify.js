/**
 * WhatsApp — wa.me deep links only (no Meta/Twilio API).
 */
import { BRAND_NAME } from '../utils/brand.js';

export const DEFAULT_AGENCY_WHATSAPP = '212665330116';

const normalizePhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length === 10) return `212${digits.slice(1)}`;
  return digits;
};

export const getAgencyWhatsAppDial = () => {
  const raw =
    process.env.WHATSAPP_BUSINESS_NUMBER ||
    process.env.WHATSAPP_TO ||
    process.env.AGENCY_PHONE ||
    DEFAULT_AGENCY_WHATSAPP;
  return normalizePhone(raw) || DEFAULT_AGENCY_WHATSAPP;
};

export const buildWaMeUrl = (text, dial = getAgencyWhatsAppDial()) => {
  const to = normalizePhone(dial) || DEFAULT_AGENCY_WHATSAPP;
  if (!text?.trim()) return `https://wa.me/${to}`;
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('en-GB', { hour12: false });
};

export const buildReservationWhatsAppMessage = ({
  reservationId,
  customerName,
  customerPhone,
  customerEmail,
  vehicle,
  pickupLocation,
  returnLocation,
  pickupDate,
  returnDate,
  price,
  priceBreakdown,
  currency = 'MAD',
  notes = '',
}) => {
  const lines = [
    `Hello, I would like to confirm my ${BRAND_NAME} car rental reservation.`,
    '',
    `Reservation: ${reservationId || '—'}`,
    `Customer: ${customerName || '—'}`,
    `Phone: ${customerPhone || '—'}`,
    `Email: ${customerEmail || '—'}`,
    `Vehicle: ${vehicle || '—'}`,
    `Pickup: ${formatDateTime(pickupDate)} — ${pickupLocation || '—'}`,
    `Return: ${formatDateTime(returnDate)} — ${returnLocation || '—'}`,
  ];

  if (priceBreakdown && typeof priceBreakdown === 'object') {
    lines.push(
      `Rental: ${currency}${priceBreakdown.rentalPrice ?? '—'}`,
      `Total: ${currency}${priceBreakdown.total ?? price ?? '—'}`,
    );
  } else {
    lines.push(`Total: ${currency}${price ?? '—'}`);
  }

  if (notes?.trim()) lines.push(`Notes: ${notes.trim()}`);
  return lines.join('\n');
};

/** Guest reservation → chat with agency on wa.me */
export const buildGuestToAgencyWhatsAppUrl = (reservation = {}) => {
  const currency = process.env.WHATSAPP_CURRENCY || process.env.CURRENCY || 'MAD';
  const body = buildReservationWhatsAppMessage({ ...reservation, currency });
  return buildWaMeUrl(body);
};

/** Owner: message to agency with customer + completion link (review & send in WhatsApp) */
export const buildCompletionToAgencyWhatsAppUrl = ({
  reservationId,
  customerName,
  customerPhone,
  vehicle,
  pickupLocation,
  returnLocation,
  pickupDate,
  returnDate,
  price,
  currency = 'MAD',
  completionUrl,
}) => {
  const lines = [
    `${BRAND_NAME} — booking confirmation (please send to customer):`,
    '',
    `Hello ${customerName || 'Customer'},`,
    '',
    'Your reservation is confirmed.',
    `Reservation: ${reservationId || '—'}`,
    `Vehicle: ${vehicle || '—'}`,
    `Pickup: ${formatDateTime(pickupDate)} — ${pickupLocation || '—'}`,
    `Return: ${formatDateTime(returnDate)} — ${returnLocation || '—'}`,
    `Total: ${currency}${price ?? '—'}`,
    '',
    'Complete your booking (documents & signature):',
    completionUrl || '—',
    '',
    `Customer phone: ${customerPhone || '—'}`,
  ];
  return buildWaMeUrl(lines.join('\n'));
};

/** Legacy no-op — API disabled */
export const notifyNewReservationWhatsApp = async () => ({
  success: false,
  skipped: true,
  reason: 'WhatsApp API disabled — use wa.me links only',
});

export const sendWhatsAppText = async () => {
  throw new Error('Server-side WhatsApp API is disabled. Use wa.me links only.');
};

export default buildGuestToAgencyWhatsAppUrl;
