import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import PublicPage from '../components/PublicPage'
import { BUSINESS } from '../constants/site'
import { buildBreadcrumbList } from '../seo/structuredData'

const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Terms', path: '/terms' },
]

const Terms = () => {
  const jsonLd = useMemo(() => buildBreadcrumbList(crumbs), [])

  return (
    <>
      <Seo
        title="Terms of Service | Americonfort"
        description="Terms for using the Americonfort website and submitting car rental reservation requests in Morocco."
        path="/terms"
        jsonLd={jsonLd}
      />
      <PublicPage
        eyebrow="Legal"
        title="Terms of service"
        lead="These terms explain how you may use the Americonfort website and reservation request flow."
        breadcrumbs={crumbs}
      >
        <h2 className="font-display text-xl text-ink font-medium">1. Service description</h2>
        <p>
          Americonfort provides an online catalog of rental vehicles and a form to request a reservation.
          Submitting a request does not automatically guarantee a vehicle until the agency confirms availability
          and booking conditions.
        </p>
        <h2 className="font-display text-xl text-ink font-medium">2. Accurate information</h2>
        <p>
          You agree to provide accurate contact and trip details. The agency may decline or cancel a request
          if information is incomplete or incorrect.
        </p>
        <h2 className="font-display text-xl text-ink font-medium">3. Pricing</h2>
        <p>
          Daily rates and any delivery fees shown in the booking preview are based on the information you select.
          The final amount is confirmed by Americonfort when the reservation is accepted.
        </p>
        <h2 className="font-display text-xl text-ink font-medium">4. Documents and deposit</h2>
        <p>
          If a completion link is provided, you may be asked for identification documents and a refundable
          security deposit depending on the vehicle. Details are communicated during confirmation.
        </p>
        <h2 className="font-display text-xl text-ink font-medium">5. Contact</h2>
        <p>
          Questions about these terms: {BUSINESS.email} · {BUSINESS.telephoneDisplay}. See also{' '}
          <Link to="/privacy" className="text-primary underline">Privacy</Link> and{' '}
          <Link to="/contact" className="text-primary underline">Contact</Link>.
        </p>
      </PublicPage>
    </>
  )
}

export default Terms
