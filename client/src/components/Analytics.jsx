import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../utils/ga'

/**
 * GA4 SPA page_view tracker.
 * gtag bootstrap lives in index.html (Vite transformIndexHtml) when
 * VITE_GA4_MEASUREMENT_ID is set — this component only reports route changes.
 */
const Analytics = () => {
  const location = useLocation()

  useEffect(() => {
    // Skip admin shells — keep public funnel clean
    if (location.pathname.startsWith('/owner') || location.pathname.startsWith('/superadmin')) {
      return
    }
    trackPageView(`${location.pathname}${location.search}`)
  }, [location.pathname, location.search])

  return null
}

export default Analytics
