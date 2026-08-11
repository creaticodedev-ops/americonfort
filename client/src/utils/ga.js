/**
 * Single source of truth for Google Analytics 4 (gtag).
 * Bootstrap is injected into index.html at build time when VITE_GA4_MEASUREMENT_ID is set.
 *
 * Conversion funnel (public site):
 *   view_car → begin_checkout → booking_lead → booking_completed
 *
 * Conversion candidates: whatsapp_click, phone_click, contact_submit,
 * booking_lead, booking_completed (primary).
 *
 * Never send PII (name, email, phone, CIN, address, signature, etc.).
 */

export const getGaMeasurementId = () => {
  const id = import.meta.env.VITE_GA4_MEASUREMENT_ID
  return typeof id === 'string' ? id.trim() : ''
}

export const isGaEnabled = () => Boolean(getGaMeasurementId())

const canSend = () =>
  typeof window !== 'undefined'
  && typeof window.gtag === 'function'
  && isGaEnabled()

/** Keys that must never leave the browser toward GA4. */
const PII_PARAM_KEYS = new Set([
  'email',
  'phone',
  'telephone',
  'full_name',
  'fullName',
  'name',
  'customer_name',
  'customerName',
  'first_name',
  'last_name',
  'address',
  'customer_address',
  'cin',
  'passport',
  'national_id',
  'signature',
  'signature_url',
  'signatureUrl',
  'notes',
  'message',
  'user_data',
])

const stripPii = (params = {}) => {
  const out = {}
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === '') continue
    if (PII_PARAM_KEYS.has(key) || PII_PARAM_KEYS.has(String(key).toLowerCase())) continue
    if (typeof value === 'object' && !Array.isArray(value)) {
      out[key] = stripPii(value)
      continue
    }
    out[key] = value
  }
  return out
}

const currencyCode = (currency) => {
  const raw = String(currency || 'MAD').replace(/\s/g, '')
  return raw || 'MAD'
}

const toNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

/** Last SPA path we reported — avoids duplicate page_view on StrictMode remounts. */
let lastPagePath = ''
const viewedCars = new Set()
const beginCheckoutKeys = new Set()
const completedBookings = new Set()
const searchKeys = new Set()

/**
 * SPA page view. Call on route changes only.
 * Initial HTML bootstrap uses send_page_view:false so this is the only page_view source.
 */
export const trackPageView = (path) => {
  if (!canSend()) return
  const pagePath = path || `${window.location.pathname}${window.location.search}`
  if (pagePath === lastPagePath) return
  lastPagePath = pagePath

  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
    send_to: getGaMeasurementId(),
  })
}

export const trackEvent = (eventName, params = {}) => {
  if (!canSend() || !eventName) return
  window.gtag('event', eventName, {
    send_to: getGaMeasurementId(),
    ...stripPii(params),
  })
}

/** @deprecated Prefer trackViewCar — kept for ecommerce compatibility */
export const trackViewItemList = ({ itemListId = 'fleet', itemListName = 'Cars', items = [] } = {}) => {
  trackEvent('view_item_list', {
    item_list_id: itemListId,
    item_list_name: itemListName,
    items,
  })
}

/** @deprecated Prefer trackViewCar */
export const trackViewItem = ({ itemId, itemName, itemCategory, price, currency = 'MAD' } = {}) => {
  trackEvent('view_item', {
    currency: currencyCode(currency),
    value: toNumber(price),
    items: [
      {
        item_id: itemId,
        item_name: itemName,
        item_category: itemCategory,
        price: toNumber(price),
      },
    ],
  })
}

/**
 * view_car — car detail page viewed (once per car_id per session).
 */
export const trackViewCar = ({
  carId,
  carCategory,
  value,
  currency = 'MAD',
  pickupCity,
} = {}) => {
  if (!carId) return
  const key = String(carId)
  if (viewedCars.has(key)) return
  viewedCars.add(key)

  trackEvent('view_car', {
    car_id: key,
    car_category: carCategory || undefined,
    value: toNumber(value),
    currency: currencyCode(currency),
    pickup_city: pickupCity || undefined,
  })

  // Keep recommended ecommerce event alongside custom funnel event
  trackViewItem({
    itemId: key,
    itemName: undefined,
    itemCategory: carCategory,
    price: value,
    currency,
  })
}

/**
 * search_cars — availability / fleet search results (deduped per query).
 */
export const trackSearchCars = ({
  pickupCity,
  resultsCount,
  pickupDate,
  returnDate,
  source = 'fleet',
} = {}) => {
  const key = [
    source,
    pickupCity || '',
    pickupDate || '',
    returnDate || '',
    resultsCount ?? '',
  ].join('|')
  if (searchKeys.has(key)) return
  searchKeys.add(key)

  trackEvent('search_cars', {
    pickup_city: pickupCity || undefined,
    results_count: toNumber(resultsCount),
    booking_source: source,
    has_dates: Boolean(pickupDate && returnDate),
  })
}

/**
 * begin_checkout — user entered the booking flow for a car (once per car/session).
 * Does NOT mean the reservation succeeded.
 */
export const trackBeginCheckout = ({
  carId,
  itemId,
  carCategory,
  value,
  currency = 'MAD',
  pickupCity,
  bookingSource = 'website',
  channel,
} = {}) => {
  const resolvedCarId = carId || itemId || undefined
  const key = String(resolvedCarId || channel || 'checkout')
  if (resolvedCarId && beginCheckoutKeys.has(key)) return
  if (resolvedCarId) beginCheckoutKeys.add(key)

  trackEvent('begin_checkout', {
    car_id: resolvedCarId,
    car_category: carCategory || undefined,
    value: toNumber(value),
    currency: currencyCode(currency),
    pickup_city: pickupCity || undefined,
    booking_source: bookingSource,
    channel: channel || undefined,
  })
}

/**
 * booking_lead — backend confirmed a reservation/lead was created.
 */
export const trackBookingLead = ({
  bookingId,
  value,
  currency = 'MAD',
  carId,
  carCategory,
  pickupCity,
  bookingSource = 'website',
  channel,
} = {}) => {
  if (!bookingId) return
  trackEvent('booking_lead', {
    booking_id: String(bookingId),
    value: toNumber(value),
    currency: currencyCode(currency),
    car_id: carId || undefined,
    car_category: carCategory || undefined,
    pickup_city: pickupCity || undefined,
    booking_source: bookingSource || channel || 'website',
    channel: channel || undefined,
  })
}

/**
 * booking_completed — primary conversion.
 * Fire ONLY after backend confirms successful create/confirm.
 * Deduped by booking_id so React remounts / confirmation revisits do not double-count.
 */
export const trackBookingCompleted = ({
  bookingId,
  value,
  currency = 'MAD',
  carId,
  carCategory,
  pickupCity,
  bookingSource = 'website',
  channel,
} = {}) => {
  if (!bookingId) return
  const key = String(bookingId)
  if (completedBookings.has(key)) return
  completedBookings.add(key)

  trackEvent('booking_completed', {
    booking_id: key,
    value: toNumber(value),
    currency: currencyCode(currency),
    car_id: carId || undefined,
    car_category: carCategory || undefined,
    pickup_city: pickupCity || undefined,
    booking_source: bookingSource || channel || 'website',
    channel: channel || undefined,
  })
}

/**
 * Successful reservation path: lead + primary conversion (no PII).
 */
export const trackBookingSuccess = (params = {}) => {
  trackBookingLead(params)
  trackBookingCompleted(params)
}

/** @deprecated Use trackBookingSuccess */
export const trackBookingSubmit = (params = {}) => {
  trackBookingSuccess({
    bookingId: params.reservationId || params.bookingId,
    value: params.value,
    currency: params.currency,
    carId: params.itemId || params.carId,
    carCategory: params.carCategory,
    pickupCity: params.pickupCity,
    bookingSource: params.channel || params.bookingSource || 'website',
    channel: params.channel,
  })
}

/**
 * whatsapp_click — conversion candidate.
 * cta_location: homepage | car_detail | booking | contact
 */
export const trackWhatsAppClick = ({
  ctaLocation = 'unknown',
  location,
  carId,
  carCategory,
  bookingSource = 'website',
} = {}) => {
  const resolved = ctaLocation || location || 'unknown'
  // Normalize legacy location labels
  const map = {
    home_whatsapp_help: 'homepage',
    homepage: 'homepage',
    car_detail: 'car_detail',
    car_details: 'car_detail',
    booking: 'booking',
    booking_submit: 'booking',
    contact: 'contact',
    contact_page: 'contact',
  }
  const cta_location = map[resolved] || resolved

  trackEvent('whatsapp_click', {
    cta_location,
    car_id: carId || undefined,
    car_category: carCategory || undefined,
    booking_source: bookingSource,
    method: 'whatsapp',
  })
}

/**
 * phone_click — conversion candidate.
 */
export const trackPhoneClick = ({
  ctaLocation = 'unknown',
  location,
  bookingSource = 'website',
} = {}) => {
  const cta_location = ctaLocation || location || 'unknown'
  trackEvent('phone_click', {
    cta_location,
    booking_source: bookingSource,
    method: 'phone',
  })
}

/**
 * contact_submit — conversion candidate (contact intent / form / email CTA).
 */
export const trackContactSubmit = ({
  ctaLocation = 'contact',
  method = 'contact',
  bookingSource = 'website',
} = {}) => {
  trackEvent('contact_submit', {
    cta_location: ctaLocation,
    method,
    booking_source: bookingSource,
  })
}

/** @deprecated Prefer trackPhoneClick / trackContactSubmit */
export const trackContactClick = ({ method = 'contact', location = 'unknown' } = {}) => {
  if (method === 'phone') {
    trackPhoneClick({ ctaLocation: location === 'contact_page' ? 'contact' : location })
    return
  }
  if (method === 'email') {
    trackContactSubmit({ ctaLocation: location === 'contact_page' ? 'contact' : location, method: 'email' })
    return
  }
  trackContactSubmit({ ctaLocation: location, method })
}

/** Test helpers — not for production UI */
export const __resetGaDedupeForTests = () => {
  lastPagePath = ''
  viewedCars.clear()
  beginCheckoutKeys.clear()
  completedBookings.clear()
  searchKeys.clear()
}

export default {
  getGaMeasurementId,
  isGaEnabled,
  trackPageView,
  trackEvent,
  trackViewItemList,
  trackViewItem,
  trackViewCar,
  trackSearchCars,
  trackBeginCheckout,
  trackBookingLead,
  trackBookingCompleted,
  trackBookingSuccess,
  trackBookingSubmit,
  trackWhatsAppClick,
  trackPhoneClick,
  trackContactSubmit,
  trackContactClick,
}
