/** Canonical public site + verified business facts (codebase only). */
export const SITE_URL = 'https://www.americonfort.com'

export const BUSINESS = {
  name: 'Americonfort',
  legalName: 'Americonfort',
  email: 'americonfort@gmail.com',
  telephone: '+212670551055',
  telephoneDisplay: '+212 6 70 55 10 55',
  streetAddress: 'Aéroport international Mohamed V',
  addressLocality: 'Casablanca',
  addressRegion: 'Casablanca-Settat',
  addressCountry: 'MA',
  addressCountryName: 'Morocco',
  areaServed: 'Morocco',
  description:
    'Americonfort — premium car rental in Morocco. Browse vehicles and reserve online with clear pricing.',
}

export const AIRPORT_LANDING_PATH = '/location-voiture-casablanca-aeroport'

export const PUBLIC_INDEXABLE_PATHS = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/cars', changefreq: 'daily', priority: '0.9' },
  { path: AIRPORT_LANDING_PATH, changefreq: 'weekly', priority: '0.95' },
  { path: '/about', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.7' },
  { path: '/faq', changefreq: 'monthly', priority: '0.7' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/insurance', changefreq: 'yearly', priority: '0.4' },
  { path: '/cookies', changefreq: 'yearly', priority: '0.3' },
]

export const absoluteUrl = (path = '/') => {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalized === '/' ? '/' : normalized}`
}

export default BUSINESS
