import { useEffect } from 'react'
import { BRAND_NAME } from '../constants/brand'
import { SITE_URL, absoluteUrl } from '../constants/site'

const DEFAULT_DESCRIPTION =
  'Americonfort — premium car rental in Morocco. Browse vehicles and reserve online with ease. Pickup available around Casablanca Airport (Mohammed V).'

function upsertMeta(attr, key, content) {
  if (content == null || content === '') return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel, href) {
  if (!href) return
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function syncJsonLd(jsonLd) {
  document.querySelectorAll('script[data-seo-jsonld="true"]').forEach((el) => el.remove())
  if (!jsonLd) return
  const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd]
  items.filter(Boolean).forEach((data) => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute('data-seo-jsonld', 'true')
    script.textContent = JSON.stringify(data)
    document.head.appendChild(script)
  })
}

/**
 * Lightweight per-route SEO without adding a Helmet dependency.
 */
const Seo = ({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image,
  type = 'website',
  noindex = false,
  jsonLd,
  locale = 'en_US',
}) => {
  useEffect(() => {
    const fullTitle = title.includes(BRAND_NAME) ? title : `${title} | ${BRAND_NAME}`
    const url = absoluteUrl(path)
    const ogImage = image?.startsWith('http') ? image : image ? absoluteUrl(image) : `${SITE_URL}/og-image.webp`

    document.title = fullTitle
    upsertMeta('name', 'description', description)
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:type', type)
    upsertMeta('property', 'og:image', ogImage)
    upsertMeta('property', 'og:locale', locale)
    upsertMeta('property', 'og:site_name', BRAND_NAME)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', ogImage)
    upsertLink('canonical', url)

    const gsc = import.meta.env.VITE_GSC_VERIFICATION?.trim()
    if (gsc) upsertMeta('name', 'google-site-verification', gsc)

    syncJsonLd(jsonLd)

    return () => {
      document.querySelectorAll('script[data-seo-jsonld="true"]').forEach((el) => el.remove())
    }
  }, [title, description, path, image, type, noindex, jsonLd, locale])

  return null
}

export default Seo
