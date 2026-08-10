import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import PublicPage from '../components/PublicPage'
import { AIRPORT_LANDING_PATH, BUSINESS } from '../constants/site'
import { buildAutoRental, buildBreadcrumbList, buildOrganization } from '../seo/structuredData'
import { trackContactClick } from '../utils/ga'

const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Contact', path: '/contact' },
]

const Contact = () => {
  const jsonLd = useMemo(
    () => [buildOrganization(), buildAutoRental(), buildBreadcrumbList(crumbs)],
    [],
  )

  return (
    <>
      <Seo
        title="Contact Americonfort — Car Rental Morocco"
        description={`Contact Americonfort for car rental in Morocco. ${BUSINESS.streetAddress}, ${BUSINESS.addressLocality}. Tel ${BUSINESS.telephoneDisplay}.`}
        path="/contact"
        jsonLd={jsonLd}
      />
      <PublicPage
        eyebrow="Get in touch"
        title="Contact"
        lead="Reach Americonfort for reservation questions or fleet inquiries."
        breadcrumbs={crumbs}
      >
        <h2 className="font-display text-2xl text-ink font-medium">Agency details</h2>
        <ul className="space-y-2 text-muted">
          <li>
            <strong className="text-ink font-medium">Address:</strong> {BUSINESS.streetAddress},{' '}
            {BUSINESS.addressLocality}, Morocco
          </li>
          <li>
            <strong className="text-ink font-medium">Phone:</strong>{' '}
            <a
              className="text-primary underline"
              href={`tel:${BUSINESS.telephone}`}
              onClick={() => trackContactClick({ method: 'phone', location: 'contact_page' })}
            >
              {BUSINESS.telephoneDisplay}
            </a>
          </li>
          <li>
            <strong className="text-ink font-medium">Email:</strong>{' '}
            <a
              className="text-primary underline"
              href={`mailto:${BUSINESS.email}`}
              onClick={() => trackContactClick({ method: 'email', location: 'contact_page' })}
            >
              {BUSINESS.email}
            </a>
          </li>
        </ul>
        <p>
          Prefer to start online?{' '}
          <Link to="/cars" className="text-primary underline">
            Browse cars
          </Link>{' '}
          or read about{' '}
          <Link to={AIRPORT_LANDING_PATH} className="text-primary underline">
            airport car rental in Casablanca
          </Link>
          .
        </p>
      </PublicPage>
    </>
  )
}

export default Contact
