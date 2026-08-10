import React, { lazy, Suspense, useMemo } from 'react'
import Hero from '../components/Hero'
import Seo from '../components/Seo'
import {
  buildAutoRental,
  buildOrganization,
  buildBreadcrumbList,
} from '../seo/structuredData'

const FeaturedSection = lazy(() => import('../components/FeaturedSection'))
const Banner = lazy(() => import('../components/Banner'))
const Testimonial = lazy(() => import('../components/Testimonial'))
const Newsletter = lazy(() => import('../components/Newsletter'))

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
        <Testimonial />
        <Newsletter />
      </Suspense>
    </>
  )
}

export default Home
