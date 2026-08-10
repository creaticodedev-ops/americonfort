import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import PublicPage from '../components/PublicPage'
import { AIRPORT_LANDING_PATH, BUSINESS } from '../constants/site'
import { buildBreadcrumbList, buildOrganization } from '../seo/structuredData'

const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
]

const About = () => {
  const jsonLd = useMemo(() => [buildOrganization(), buildBreadcrumbList(crumbs)], [])

  return (
    <>
      <Seo
        title="About Americonfort — Car Rental in Morocco"
        description="Americonfort is a premium car rental service in Morocco. Browse the fleet online and reserve with clear pricing. Based at Casablanca Mohammed V Airport."
        path="/about"
        jsonLd={jsonLd}
      />
      <PublicPage
        eyebrow="Americonfort"
        title="About us"
        lead="Premium car rental in Morocco — curated vehicles, transparent pricing, and online reservation without a customer account."
        breadcrumbs={crumbs}
      >
        <p>
          Americonfort helps travelers and residents rent well-maintained vehicles online. You can browse
          categories, compare daily rates, choose pickup and return details, and send a reservation request
          in a few steps.
        </p>
        <p>
          Our public business address is {BUSINESS.streetAddress}, {BUSINESS.addressLocality}, Morocco.
          Learn more about airport-oriented rental on our{' '}
          <Link to={AIRPORT_LANDING_PATH} className="text-primary underline">
            Casablanca Mohammed V airport page
          </Link>
          .
        </p>
        <h2 className="font-display text-2xl text-ink font-medium pt-2">What you can do on the website</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-muted">
          <li>
            Browse the <Link to="/cars" className="text-primary underline">full fleet</Link> and filter by category
          </li>
          <li>Open a vehicle page for specs, pricing preview, and reservation</li>
          <li>Contact the agency by phone or email</li>
        </ul>
        <p>
          Questions? Visit <Link to="/faq" className="text-primary underline">FAQ</Link> or{' '}
          <Link to="/contact" className="text-primary underline">Contact</Link>.
        </p>
      </PublicPage>
    </>
  )
}

export default About
