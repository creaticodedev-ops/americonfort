import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import PublicPage from '../components/PublicPage'
import { BUSINESS } from '../constants/site'
import { buildBreadcrumbList } from '../seo/structuredData'

const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Insurance', path: '/insurance' },
]

const Insurance = () => {
  const jsonLd = useMemo(() => buildBreadcrumbList(crumbs), [])

  return (
    <>
      <Seo
        title="Insurance Information | Americonfort"
        description="How insurance and related rental protections are communicated for Americonfort car rentals in Morocco."
        path="/insurance"
        jsonLd={jsonLd}
      />
      <PublicPage
        eyebrow="Rental info"
        title="Insurance"
        lead="Coverage details are confirmed with your reservation — this page explains what the website does and does not claim."
        breadcrumbs={crumbs}
      >
        <p>
          Americonfort vehicles are offered through the online booking system. Specific insurance coverage,
          deductibles, and optional protections are not listed as fixed public packages on every vehicle page.
        </p>
        <p>
          When your reservation is confirmed — and during any booking completion steps — the agency communicates
          the applicable conditions for your vehicle and trip. A refundable security deposit may also apply
          depending on the vehicle.
        </p>
        <p>
          For questions before you book, contact us at{' '}
          <a className="text-primary underline" href={`mailto:${BUSINESS.email}`}>
            {BUSINESS.email}
          </a>{' '}
          or see the <Link to="/faq" className="text-primary underline">FAQ</Link>.
        </p>
      </PublicPage>
    </>
  )
}

export default Insurance
