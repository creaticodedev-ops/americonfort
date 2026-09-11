/**
 * Public SPA route SEO hints for crawlers hitting the HTML shell before JS runs.
 * Keep copy aligned with client Seo components / content modules.
 */
export const PUBLIC_SPA_SEO = {
  '/': {
    title: 'Americonfort — Premium Car Rental in Morocco',
    description:
      'Rent a car in Morocco with Americonfort. Browse the fleet, reserve online without an account, and arrange pickup around Casablanca Mohammed V Airport.',
    canonical: 'https://www.americonfort.com/',
  },
  '/cars': {
    title: 'Car Rental Fleet in Morocco | Americonfort',
    description:
      'Browse Americonfort’s car rental fleet in Morocco. Compare categories, daily rates, and reserve online with clear pickup options.',
    canonical: 'https://www.americonfort.com/cars',
  },
  '/about': {
    title: 'About Americonfort | Car Rental in Morocco',
    description:
      'Learn about Americonfort — premium car rental in Morocco with pickup anchored at Casablanca Mohammed V Airport.',
    canonical: 'https://www.americonfort.com/about',
  },
  '/contact': {
    title: 'Contact Americonfort | Car Rental Morocco',
    description:
      'Contact Americonfort for car rental in Morocco. Phone, email, and pickup information for Casablanca Mohammed V Airport.',
    canonical: 'https://www.americonfort.com/contact',
  },
  '/faq': {
    title: 'FAQ | Americonfort Car Rental Morocco',
    description:
      'Frequently asked questions about Americonfort car rental in Morocco: booking, pickup, documents, and payments.',
    canonical: 'https://www.americonfort.com/faq',
  },
  '/location-voiture-casablanca': {
    title: 'Location voiture Casablanca | Americonfort',
    description:
      'Location de voiture à Casablanca avec Americonfort. Réservez en ligne, consultez la flotte et organisez la prise en charge dans la région de Casablanca.',
    canonical: 'https://www.americonfort.com/location-voiture-casablanca',
    lang: 'fr',
  },
}

export const PRIVATE_PATH_PREFIXES = [
  '/owner',
  '/superadmin',
  '/admin',
  '/booking-confirmation',
  '/complete-booking',
]

export const isPrivatePath = (pathname = '') =>
  PRIVATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

export const resolveSpaSeo = (pathname = '/') => {
  const clean = String(pathname || '/').split('?')[0].replace(/\/+$/, '') || '/'
  return PUBLIC_SPA_SEO[clean] || PUBLIC_SPA_SEO[pathname] || null
}

/**
 * Inject title / description / canonical / robots into the SPA shell HTML.
 */
export const applySpaSeoToHtml = (html, { pathname = '/', hasQuery = false } = {}) => {
  let out = String(html || '')
  const privatePath = isPrivatePath(pathname)
  const seo = resolveSpaSeo(pathname)

  if (privatePath) {
    out = out.replace(
      /<meta\s+name="robots"[^>]*>/i,
      '<meta name="robots" content="noindex, nofollow" />',
    )
    if (!/name="robots"/i.test(out)) {
      out = out.replace(/<head[^>]*>/i, (m) => `${m}\n    <meta name="robots" content="noindex, nofollow" />`)
    }
    return out
  }

  // Filter / search query URLs on /cars should not compete with the canonical fleet page.
  if (pathname.startsWith('/cars') && hasQuery) {
    out = out.replace(
      /<meta\s+name="robots"[^>]*>/i,
      '<meta name="robots" content="noindex, follow" />',
    )
  }

  if (!seo) return out

  const escapeAttr = (value) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')

  if (seo.title) {
    out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttr(seo.title)}</title>`)
    out = out.replace(
      /property="og:title"\s+content="[^"]*"/i,
      `property="og:title" content="${escapeAttr(seo.title)}"`,
    )
  }
  if (seo.description) {
    out = out.replace(
      /name="description"\s+content="[^"]*"/i,
      `name="description" content="${escapeAttr(seo.description)}"`,
    )
    out = out.replace(
      /property="og:description"\s+content="[^"]*"/i,
      `property="og:description" content="${escapeAttr(seo.description)}"`,
    )
  }
  if (seo.canonical) {
    out = out.replace(
      /rel="canonical"\s+href="[^"]*"/i,
      `rel="canonical" href="${escapeAttr(seo.canonical)}"`,
    )
    out = out.replace(
      /property="og:url"\s+content="[^"]*"/i,
      `property="og:url" content="${escapeAttr(seo.canonical)}"`,
    )
  }
  if (seo.lang) {
    out = out.replace(/<html\s+lang="[^"]*"/i, `<html lang="${escapeAttr(seo.lang)}"`)
  }

  return out
}

export default {
  PUBLIC_SPA_SEO,
  applySpaSeoToHtml,
  isPrivatePath,
}
