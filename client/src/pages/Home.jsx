import React, { lazy, Suspense, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Hero from '../components/Hero'
import Seo from '../components/Seo'
import { AIRPORT_LANDING_PATH } from '../constants/site'
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
      <section className="page-pad page-shell pb-2 -mt-2 sm:-mt-4">
        <p className="text-center text-sm text-muted">
          Looking for{' '}
          <Link to={AIRPORT_LANDING_PATH} className="text-primary underline underline-offset-2 hover:text-primary-dull">
            car rental at Casablanca Mohammed V Airport
          </Link>
          ? See how online reservation and pickup work.
        </p>
      </section>
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
