import React, { lazy, Suspense } from 'react'
import Hero from '../components/Hero'
import Seo from '../components/Seo'

const FeaturedSection = lazy(() => import('../components/FeaturedSection'))
const Banner = lazy(() => import('../components/Banner'))
const Testimonial = lazy(() => import('../components/Testimonial'))
const Newsletter = lazy(() => import('../components/Newsletter'))

const BelowFoldFallback = () => (
  <div className="min-h-[12rem]" aria-hidden="true" />
)

const Home = () => {
  return (
    <>
      <Seo
        title="Americonfort — Premium Car Rental in Morocco"
        description="Americonfort — premium car rental in Morocco. Browse vehicles and reserve online with ease."
        path="/"
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
