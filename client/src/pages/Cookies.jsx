import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import PublicPage from '../components/PublicPage'
import { BUSINESS } from '../constants/site'
import { buildBreadcrumbList } from '../seo/structuredData'

const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Cookies', path: '/cookies' },
]

const Cookies = () => {
  const jsonLd = useMemo(() => buildBreadcrumbList(crumbs), [])

  return (
    <>
      <Seo
        title="Cookie Policy | Americonfort"
        description="How Americonfort uses cookies and similar storage for language preference, session needs, and optional analytics."
        path="/cookies"
        jsonLd={jsonLd}
      />
      <PublicPage
        eyebrow="Legal"
        title="Cookies"
        lead="This page describes cookies and local storage used on the Americonfort website."
        breadcrumbs={crumbs}
      >
        <h2 className="font-display text-xl text-ink font-medium">Essential / functional</h2>
        <p>
          The site may store language preference and session-related data needed to keep the booking interface
          working (for example remembering search dates during your visit).
        </p>
        <h2 className="font-display text-xl text-ink font-medium">Analytics</h2>
        <p>
          If Google Analytics 4 is enabled for this deployment, it may set cookies or use similar technology
          to measure aggregate traffic. Analytics loads only when configured by Americonfort.
        </p>
        <h2 className="font-display text-xl text-ink font-medium">More information</h2>
        <p>
          See our <Link to="/privacy" className="text-primary underline">Privacy policy</Link>. Contact:{' '}
          {BUSINESS.email}.
        </p>
      </PublicPage>
    </>
  )
}

export default Cookies
