/** wa.me deep links — no Meta API. Numbers come from admin WhatsApp settings (DB) with env fallback. */

import { BRAND_NAME } from '../constants/brand'

export const DEFAULT_AGENCY_WHATSAPP = '212665330116'

export const normalizeWhatsAppDial = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('0') && digits.length === 10) return `212${digits.slice(1)}`
  return digits
}

/** Env fallback when DB settings are empty */
export const getEnvAgencyWhatsAppDial = () => {
  const raw =
    import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER ||
    import.meta.env.VITE_WHATSAPP_NUMBER ||
    DEFAULT_AGENCY_WHATSAPP
  return normalizeWhatsAppDial(raw) || DEFAULT_AGENCY_WHATSAPP
}

/**
 * Resolve dial from admin whatsappSettings (user.whatsappSettings).
 * kind: 'reservation' | 'confirmation'
 */
export const getAgencyWhatsAppDial = (whatsappSettings, kind = 'reservation') => {
  const settings = whatsappSettings || {}
  const primary = kind === 'confirmation'
    ? settings.confirmationNumber
    : settings.reservationNumber
  const secondary = kind === 'confirmation'
    ? settings.reservationNumber
    : settings.confirmationNumber
  return (
    normalizeWhatsAppDial(primary)
    || normalizeWhatsAppDial(secondary)
    || getEnvAgencyWhatsAppDial()
  )
}

const formatDateTime = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

export const buildWaMeUrl = (text, dial = getEnvAgencyWhatsAppDial()) => {
  const to = normalizeWhatsAppDial(dial) || getEnvAgencyWhatsAppDial()
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`
}

/** Customer phone from reservation — no fallback to agency/owner number. */
export const resolveCustomerWhatsAppDial = (booking) => {
  const dial = normalizeWhatsAppDial(booking?.customerPhone || booking?.phone)
  if (!dial || dial.length < 9) return null
  return dial
}

const customerDialOrError = (booking) => {
  const dial = resolveCustomerWhatsAppDial(booking)
  if (!dial) {
    return { error: 'missing_phone', url: null, dial: null }
  }
  return { error: null, dial, url: null }
}

/** Guest reservation after form submit */
export const buildGuestReservationWaUrl = (reservation, { currency = 'MAD', dial, whatsappSettings } = {}) => {
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
  const resolved = dial || getAgencyWhatsAppDial(whatsappSettings, 'reservation')
  return buildWaMeUrl(lines.join('\n'), resolved)
}

/** Customer confirmation — opens WhatsApp to the customer (not the agency). */
export const buildCustomerConfirmationWaUrl = (booking, completionUrl, { currency = 'MAD' } = {}) => {
  const dialResult = customerDialOrError(booking)
  if (dialResult.error) return dialResult

  const reservationId = booking.reservationId || `RES-${booking._id?.toString().slice(-8).toUpperCase()}`
  const vehicle = booking.car
    ? `${booking.car.brand} ${booking.car.model}${booking.car.licensePlate ? ` (${booking.car.licensePlate})` : ''}`
    : booking.carName || '—'

  const lines = [
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
  ]
  return { error: null, dial: dialResult.dial, url: buildWaMeUrl(lines.join('\n'), dialResult.dial) }
}

/** Customer signature request — opens WhatsApp to the customer with the signature link. */
export const buildCustomerSignatureWaUrl = (booking, signatureUrl, { currency = 'MAD' } = {}) => {
  const dialResult = customerDialOrError(booking)
  if (dialResult.error) return dialResult

  const reservationId = booking.reservationId || `RES-${booking._id?.toString().slice(-8).toUpperCase()}`
  const vehicle = booking.car
    ? `${booking.car.brand} ${booking.car.model}${booking.car.licensePlate ? ` (${booking.car.licensePlate})` : ''}`
    : booking.carName || '—'

  const lines = [
    `Hello ${booking.customerName || 'Customer'},`,
    '',
    'Your rental agreement is ready. Please review and sign:',
    '',
    `Reservation: ${reservationId}`,
    `Vehicle: ${vehicle}`,
    `Pickup: ${formatDateTime(booking.pickupDate)} — ${booking.pickupLocation || '—'}`,
    `Return: ${formatDateTime(booking.returnDate)} — ${booking.returnLocation || '—'}`,
    `Total: ${currency}${booking.price ?? '—'}`,
    '',
    signatureUrl,
  ]
  return { error: null, dial: dialResult.dial, url: buildWaMeUrl(lines.join('\n'), dialResult.dial) }
}

/** @deprecated Owner inbox flow — use buildCustomerConfirmationWaUrl for customer confirmations. */
export const buildOwnerCompletionWaUrl = (booking, completionUrl, { currency = 'MAD', dial, whatsappSettings } = {}) => {
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
  const resolved = dial || getAgencyWhatsAppDial(whatsappSettings, 'confirmation')
  return buildWaMeUrl(lines.join('\n'), resolved)
}

/** @deprecated use buildOwnerCompletionWaUrl */
export const buildCompletionWhatsAppUrl = buildOwnerCompletionWaUrl

export default {
  buildGuestReservationWaUrl,
  buildCustomerConfirmationWaUrl,
  buildCustomerSignatureWaUrl,
  buildOwnerCompletionWaUrl,
  buildWaMeUrl,
  getAgencyWhatsAppDial,
  getEnvAgencyWhatsAppDial,
  resolveCustomerWhatsAppDial,
}
