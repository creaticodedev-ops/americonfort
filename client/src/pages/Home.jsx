import React, { lazy, Suspense, useMemo } from 'react'
import Hero from '../components/Hero'
import Seo from '../components/Seo'
import {
  buildAutoRental,
  buildOrganization,
  buildBreadcrumbList,
} from '../seo/structuredData'

const LAZY_RETRY_KEY = 'americonfort:lazy-retry'

/** Retry once on stale hashed chunks after a deploy. */
const lazyWithRetry = (importer) =>
  lazy(async () => {
    try {
      return await importer()
    } catch (err) {
      try {
        if (!sessionStorage.getItem(LAZY_RETRY_KEY)) {
          sessionStorage.setItem(LAZY_RETRY_KEY, '1')
          const next = new URL(window.location.href)
          next.searchParams.set('_', String(Date.now()))
          window.location.replace(next.toString())
          return new Promise(() => {})
        }
        sessionStorage.removeItem(LAZY_RETRY_KEY)
      } catch {
        /* private mode */
      }
      throw err
    }
  })

const FeaturedSection = lazyWithRetry(() => import('../components/FeaturedSection'))
const Banner = lazyWithRetry(() => import('../components/Banner'))
const FleetShowcase = lazyWithRetry(() => import('../components/FleetShowcase'))
const WhatsAppHelp = lazyWithRetry(() => import('../components/WhatsAppHelp'))

const BelowFoldFallback = () => (
  <div className="min-h-[12rem]" aria-hidden="true" />
)

const Home = () => {
  const jsonLd = useMemo(
    () => [
      buildOrganization(),
      buildAutoRental(),
      buildBreadcrumbList([{ name: 'Home', path: '/' }]),
    ],
    [],
  )

  return (
    <>
      <Seo
        title="Americonfort — Premium Car Rental in Morocco"
        description="Rent a car in Morocco with Americonfort. Browse the fleet, reserve online without an account, and arrange pickup around Casablanca Mohammed V Airport."
        path="/"
        jsonLd={jsonLd}
      />
      <Hero />
      <Suspense fallback={<BelowFoldFallback />}>
        <FeaturedSection />
        <Banner />
        <FleetShowcase />
        <WhatsAppHelp />
      </Suspense>
    </>
  )
}

export default Home
