/** wa.me deep links — no Meta API. Agency: +212 665 330 116 */

import { BRAND_NAME } from '../constants/brand'

export const DEFAULT_AGENCY_WHATSAPP = '212665330116'

export const getAgencyWhatsAppDial = () => {
  const raw =
    import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER ||
    import.meta.env.VITE_WHATSAPP_NUMBER ||
    DEFAULT_AGENCY_WHATSAPP
  return String(raw).replace(/\D/g, '') || DEFAULT_AGENCY_WHATSAPP
}

const formatDateTime = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

export const buildWaMeUrl = (text, dial = getAgencyWhatsAppDial()) => {
  const to = String(dial).replace(/\D/g, '') || DEFAULT_AGENCY_WHATSAPP
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`
}

/** Guest reservation after form submit */
export const buildGuestReservationWaUrl = (reservation, { currency = 'MAD' } = {}) => {
  const lines = [
    `Hello, I would like to confirm my ${BRAND_NAME} car rental reservation.`,
    '',
    `Reservation: ${reservation.reservationId || '—'}`,
    `Name: ${reservation.customerName || '—'}`,
    `Phone: ${reservation.phone || reservation.customerPhone || '—'}`,
    `Email: ${reservation.email || reservation.customerEmail || '—'}`,
    `Vehicle: ${reservation.carName || reservation.vehicle || '—'}`,
    `Pickup: ${formatDateTime(reservation.pickupDate)} — ${reservation.pickupLocation || '—'}`,
    `Return: ${formatDateTime(reservation.returnDate)} — ${reservation.returnLocation || '—'}`,
    `Total: ${currency}${reservation.price ?? '—'}`,
  ]
  if (reservation.notes?.trim()) lines.push(`Notes: ${reservation.notes.trim()}`)
  return buildWaMeUrl(lines.join('\n'))
}

/** Owner dashboard — open WhatsApp to agency with message to forward to customer */
export const buildOwnerCompletionWaUrl = (booking, completionUrl, { currency = 'MAD' } = {}) => {
  const reservationId = booking.reservationId || `RES-${booking._id?.toString().slice(-8).toUpperCase()}`
  const vehicle = booking.car
    ? `${booking.car.brand} ${booking.car.model}${booking.car.licensePlate ? ` (${booking.car.licensePlate})` : ''}`
    : booking.carName || '—'

  const lines = [
    `${BRAND_NAME} — booking confirmation (message for customer):`,
    '',
    `Hello ${booking.customerName || 'Customer'},`,
    '',
    'Your reservation is confirmed.',
    `Reservation: ${reservationId}`,
    `Vehicle: ${vehicle}`,
    `Pickup: ${formatDateTime(booking.pickupDate)} — ${booking.pickupLocation || '—'}`,
    `Return: ${formatDateTime(booking.returnDate)} — ${booking.returnLocation || '—'}`,
    `Total: ${currency}${booking.price ?? '—'}`,
    '',
    'Complete your booking securely here:',
    completionUrl,
    '',
    `(Customer: ${booking.customerPhone || '—'})`,
  ]
  return buildWaMeUrl(lines.join('\n'))
}

/** @deprecated use buildOwnerCompletionWaUrl */
export const buildCompletionWhatsAppUrl = buildOwnerCompletionWaUrl

export const buildGuestToAgencyWhatsAppUrlFromDial = (dial, reservation, opts) => {
  if (dial) return buildGuestReservationWaUrl(reservation, opts)
  return buildGuestReservationWaUrl(reservation, opts)
}

export default {
  buildGuestReservationWaUrl,
  buildOwnerCompletionWaUrl,
  buildWaMeUrl,
  getAgencyWhatsAppDial,
}
