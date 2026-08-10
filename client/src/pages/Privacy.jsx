import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import PublicPage from '../components/PublicPage'
import { BUSINESS } from '../constants/site'
import { buildBreadcrumbList } from '../seo/structuredData'

const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Privacy', path: '/privacy' },
]

const Privacy = () => {
  const jsonLd = useMemo(() => buildBreadcrumbList(crumbs), [])

  return (
    <>
      <Seo
        title="Privacy Policy | Americonfort"
        description="How Americonfort collects and uses contact and booking information when you reserve a car in Morocco."
        path="/privacy"
        jsonLd={jsonLd}
      />
      <PublicPage
        eyebrow="Legal"
        title="Privacy policy"
        lead="This policy describes personal data handled when you use the Americonfort website."
        breadcrumbs={crumbs}
      >
        <h2 className="font-display text-xl text-ink font-medium">Data we collect</h2>
        <p>
          When you submit a reservation request, we process details you provide such as name, email, phone number,
          pickup/return preferences, dates, and optional notes (for example a flight number).
        </p>
        <h2 className="font-display text-xl text-ink font-medium">Why we use it</h2>
        <p>
          Data is used to process and confirm bookings, communicate with you about your reservation, and operate
          the rental service.
        </p>
        <h2 className="font-display text-xl text-ink font-medium">Sharing</h2>
        <p>
          Booking information is handled by Americonfort staff systems required to fulfill the rental.
          We do not sell your personal information.
        </p>
        <h2 className="font-display text-xl text-ink font-medium">Contact</h2>
        <p>
          Privacy questions: {BUSINESS.email}. Related pages:{' '}
          <Link to="/cookies" className="text-primary underline">Cookies</Link>,{' '}
          <Link to="/terms" className="text-primary underline">Terms</Link>.
        </p>
      </PublicPage>
    </>
  )
}

export default Privacy
