/**
 * Single source of truth for Google Analytics 4 (gtag).
 * Bootstrap is injected into index.html at build time when VITE_GA4_MEASUREMENT_ID is set.
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

/** Last SPA path we reported — avoids duplicate page_view on StrictMode remounts. */
let lastPagePath = ''

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
    ...params,
  })
}

export const trackViewItemList = ({ itemListId = 'fleet', itemListName = 'Cars', items = [] } = {}) => {
  trackEvent('view_item_list', {
    item_list_id: itemListId,
    item_list_name: itemListName,
    items,
  })
}

export const trackViewItem = ({ itemId, itemName, itemCategory, price, currency = 'MAD' } = {}) => {
  trackEvent('view_item', {
    currency,
    value: typeof price === 'number' ? price : undefined,
    items: [
      {
        item_id: itemId,
        item_name: itemName,
        item_category: itemCategory,
        price,
      },
    ],
  })
}

export const trackBeginCheckout = ({ itemId, itemName, value, currency = 'MAD', channel } = {}) => {
  trackEvent('begin_checkout', {
    currency,
    value,
    channel,
    items: itemId
      ? [{ item_id: itemId, item_name: itemName, price: value }]
      : undefined,
  })
}

export const trackBookingSubmit = ({
  reservationId,
  value,
  currency = 'MAD',
  channel,
  itemId,
  itemName,
} = {}) => {
  trackEvent('generate_lead', {
    currency,
    value,
    lead_source: channel || 'website',
    transaction_id: reservationId,
    items: itemId
      ? [{ item_id: itemId, item_name: itemName, price: value }]
      : undefined,
  })
}

export const trackWhatsAppClick = ({ location = 'unknown' } = {}) => {
  trackEvent('whatsapp_click', {
    link_url: location,
    method: 'whatsapp',
  })
}

export const trackContactClick = ({ method = 'contact', location = 'unknown' } = {}) => {
  trackEvent('contact', {
    method,
    link_url: location,
  })
}

export default {
  getGaMeasurementId,
  isGaEnabled,
  trackPageView,
  trackEvent,
  trackViewItemList,
  trackViewItem,
  trackBeginCheckout,
  trackBookingSubmit,
  trackWhatsAppClick,
  trackContactClick,
}
