import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import PublicPage from '../components/PublicPage'
import { airportLanding } from '../content/airportLanding'
import { AIRPORT_LANDING_PATH, absoluteUrl } from '../constants/site'
import {
  airportBreadcrumbs,
  buildAutoRental,
  buildBreadcrumbList,
  buildFaqPage,
  buildOrganization,
} from '../seo/structuredData'

const AirportLanding = () => {
  const jsonLd = useMemo(
    () =>
      [
        buildOrganization(),
        buildAutoRental({
          url: absoluteUrl(AIRPORT_LANDING_PATH),
          description: airportLanding.description,
        }),
        buildBreadcrumbList(airportBreadcrumbs),
        buildFaqPage(airportLanding.faq),
      ].filter(Boolean),
    [],
  )

  return (
    <>
      <Seo
        title={airportLanding.title}
        description={airportLanding.description}
        path={AIRPORT_LANDING_PATH}
        locale={airportLanding.locale}
        jsonLd={jsonLd}
      />
      <PublicPage
        eyebrow="Casablanca · Aéroport Mohammed V"
        title={airportLanding.h1}
        lead={airportLanding.lead}
        breadcrumbs={airportBreadcrumbs}
      >
        {airportLanding.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="font-display text-2xl text-ink font-medium mb-3">{section.h2}</h2>
            {section.paragraphs?.map((p) => (
              <p key={p.slice(0, 48)} className="mb-3 text-muted">
                {p}
              </p>
            ))}
            {section.steps && (
              <ol className="list-decimal pl-5 space-y-2 text-muted mb-3">
                {section.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            )}
            {section.categories && (
              <ul className="flex flex-wrap gap-2 mt-2 mb-2">
                {section.categories.map((cat) => (
                  <li key={cat}>
                    <Link
                      to={`/cars?category=${encodeURIComponent(cat)}`}
                      className="inline-block rounded-lg border border-borderColor px-3 py-1.5 text-sm text-ink hover:border-primary hover:text-primary transition"
                    >
                      {cat}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section id="faq" className="scroll-mt-24 pt-2">
          <h2 className="font-display text-2xl text-ink font-medium mb-4">Questions fréquentes</h2>
          <div className="space-y-4">
            {airportLanding.faq.map((item) => (
              <div key={item.question}>
                <h3 className="font-medium text-ink text-[15px]">{item.question}</h3>
                <p className="mt-1.5 text-muted">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="not-prose mt-10 rounded-2xl bg-light border border-borderColor p-6 sm:p-8">
          <h2 className="font-display text-2xl text-ink font-medium">Réserver votre véhicule</h2>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            Consultez la flotte, choisissez une catégorie, puis finalisez la demande sur la fiche véhicule.
          </p>
          <p className="mt-3 text-xs text-muted">{airportLanding.contactLine}</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <Link
              to={airportLanding.cta.primaryHref}
              className="inline-flex justify-center px-5 py-2.5 rounded-xl bg-primary text-white text-sm hover:bg-primary-dull transition"
            >
              {airportLanding.cta.primaryLabel}
            </Link>
            <Link
              to={airportLanding.cta.secondaryHref}
              className="inline-flex justify-center px-5 py-2.5 rounded-xl border border-borderColor text-sm text-ink hover:border-primary hover:text-primary transition"
            >
              {airportLanding.cta.secondaryLabel}
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted">
            <Link to="/about" className="underline hover:text-ink">À propos</Link>
            {' · '}
            <Link to="/faq" className="underline hover:text-ink">FAQ</Link>
            {' · '}
            <Link to="/" className="underline hover:text-ink">Accueil</Link>
          </p>
        </section>
      </PublicPage>
    </>
  )
}

export default AirportLanding
