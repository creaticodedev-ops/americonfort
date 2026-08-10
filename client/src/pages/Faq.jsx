import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import PublicPage from '../components/PublicPage'
import { AIRPORT_LANDING_PATH } from '../constants/site'
import { buildBreadcrumbList, buildFaqPage, buildOrganization } from '../seo/structuredData'

const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'FAQ', path: '/faq' },
]

const faqs = [
  {
    question: 'Do I need an account to reserve a car?',
    answer:
      'No. Public reservation requests do not require creating a customer account.',
  },
  {
    question: 'How does booking work?',
    answer:
      'Choose a vehicle, select pickup and return details and dates, enter your contact information, and submit the request. The agency confirms the reservation. Depending on the booking, a secure completion link may be sent for documents and related steps.',
  },
  {
    question: 'Where is Americonfort located?',
    answer:
      'The public business address is Aéroport international Mohamed V, Casablanca, Morocco.',
  },
  {
    question: 'Can I filter by vehicle category?',
    answer:
      'Yes. The fleet page supports categories such as Economy, Compact, Sedan, SUV, Luxury, and Van, depending on what is currently listed.',
  },
  {
    question: 'How is pricing shown?',
    answer:
      'Each vehicle shows a daily rate. After you select dates and locations, a price preview can include rental cost and any delivery fees configured for those pickup or return points.',
  },
  {
    question: 'Is a security deposit required?',
    answer:
      'A refundable security deposit may apply when finalizing a booking (from 5,000 MAD depending on the vehicle, as shown in the completion flow). Exact amounts are confirmed with your reservation.',
  },
]

const Faq = () => {
  const jsonLd = useMemo(
    () => [buildOrganization(), buildBreadcrumbList(crumbs), buildFaqPage(faqs)],
    [],
  )

  return (
    <>
      <Seo
        title="FAQ — Americonfort Car Rental Morocco"
        description="Frequently asked questions about renting with Americonfort in Morocco: booking, pricing, airport location, and deposits."
        path="/faq"
        jsonLd={jsonLd}
      />
      <PublicPage
        eyebrow="Help"
        title="Frequently asked questions"
        lead="Practical answers based on how the Americonfort booking website works."
        breadcrumbs={crumbs}
      >
        <div className="space-y-5">
          {faqs.map((item) => (
            <div key={item.question}>
              <h2 className="font-display text-xl text-ink font-medium">{item.question}</h2>
              <p className="mt-1.5 text-muted">{item.answer}</p>
            </div>
          ))}
        </div>
        <p className="pt-2">
          More about airport pickup intent:{' '}
          <Link to={AIRPORT_LANDING_PATH} className="text-primary underline">
            location voiture Casablanca aéroport
          </Link>
          . Or <Link to="/contact" className="text-primary underline">contact us</Link>.
        </p>
      </PublicPage>
    </>
  )
}

export default Faq
