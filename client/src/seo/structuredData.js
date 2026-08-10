import { AIRPORT_LANDING_PATH, BUSINESS, SITE_URL, absoluteUrl } from '../constants/site'
import { INSTAGRAM_URL } from '../constants/social'

const orgId = `${SITE_URL}/#organization`
const rentalId = `${SITE_URL}/#autorental`

export const buildPostalAddress = () => ({
  '@type': 'PostalAddress',
  streetAddress: BUSINESS.streetAddress,
  addressLocality: BUSINESS.addressLocality,
  addressRegion: BUSINESS.addressRegion,
  addressCountry: BUSINESS.addressCountry,
})

export const buildOrganization = () => {
  const sameAs = [INSTAGRAM_URL].filter(Boolean)
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': orgId,
    name: BUSINESS.name,
    url: SITE_URL,
    email: BUSINESS.email,
    telephone: BUSINESS.telephone,
    logo: absoluteUrl('/og-image.webp'),
    image: absoluteUrl('/og-image.webp'),
    description: BUSINESS.description,
    address: buildPostalAddress(),
    areaServed: { '@type': 'Country', name: BUSINESS.areaServed },
    ...(sameAs.length ? { sameAs } : {}),
  }
}

export const buildAutoRental = ({ url = SITE_URL, description = BUSINESS.description } = {}) => ({
  '@context': 'https://schema.org',
  '@type': 'AutoRental',
  '@id': rentalId,
  name: BUSINESS.name,
  url,
  email: BUSINESS.email,
  telephone: BUSINESS.telephone,
  image: absoluteUrl('/og-image.webp'),
  description,
  address: buildPostalAddress(),
  areaServed: [
    { '@type': 'Country', name: BUSINESS.areaServed },
    { '@type': 'City', name: BUSINESS.addressLocality },
    {
      '@type': 'Airport',
      name: 'Aéroport international Mohammed V',
      iataCode: 'CMN',
      address: buildPostalAddress(),
    },
  ],
  parentOrganization: { '@id': orgId },
})

export const buildBreadcrumbList = (items = []) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
})

export const buildVehicleProductOffer = (car, { currency = 'MAD' } = {}) => {
  if (!car?._id) return null
  const name = `${car.brand} ${car.model}`.trim()
  const url = absoluteUrl(`/car-details/${car._id}`)
  const image = car.image || car.images?.[0] || absoluteUrl('/og-image.webp')
  const price = Number(car.pricePerDay)
  const description =
    car.description ||
    `Rent ${name}${car.category ? ` (${car.category})` : ''} with Americonfort in Morocco.`

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image,
    brand: { '@type': 'Brand', name: car.brand },
    category: car.category || undefined,
    url,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: String(currency || 'MAD').replace(/\s/g, '') || 'MAD',
      ...(Number.isFinite(price) ? { price: String(price) } : {}),
      priceSpecification: Number.isFinite(price)
        ? {
            '@type': 'UnitPriceSpecification',
            price: String(price),
            priceCurrency: String(currency || 'MAD').replace(/\s/g, '') || 'MAD',
            unitText: 'DAY',
          }
        : undefined,
      availability: car.isAvaliable
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@id': orgId },
    },
  }
}

export const buildFaqPage = (faqs = []) => {
  if (!faqs.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  }
}

export const airportBreadcrumbs = [
  { name: 'Accueil', path: '/' },
  { name: 'Location voiture Casablanca aéroport', path: AIRPORT_LANDING_PATH },
]

export { orgId, rentalId }
