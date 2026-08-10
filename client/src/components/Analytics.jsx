import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * GA4 page views for SPA navigations.
 * The gtag bootstrap is injected at build time into index.html when
 * VITE_GA4_MEASUREMENT_ID is set (avoids Vite dead-code elimination).
 */
const Analytics = () => {
  const location = useLocation()

  useEffect(() => {
    const measurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID
    if (typeof measurementId !== 'string' || !measurementId.trim()) return
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return

    window.gtag('config', measurementId.trim(), {
      page_path: `${location.pathname}${location.search}`,
      anonymize_ip: true,
    })
  }, [location.pathname, location.search])

  return null
}

export default Analytics
