import { useEffect } from 'react'
import { BRAND_NAME } from '../constants/brand'

const SITE_URL = 'https://www.americonfort.com'
const DEFAULT_DESCRIPTION =
  'Americonfort — premium car rental in Morocco. Browse vehicles and reserve online with ease.'

function upsertMeta(attr, key, content) {
  if (!content) return
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
}) => {
  useEffect(() => {
    const fullTitle = title.includes(BRAND_NAME) ? title : `${title} | ${BRAND_NAME}`
    const url = `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
    const ogImage = image || `${SITE_URL}/og-image.webp`

    document.title = fullTitle
    upsertMeta('name', 'description', description)
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:type', type)
    upsertMeta('property', 'og:image', ogImage)
    upsertMeta('property', 'og:locale', 'en_US')
    upsertMeta('property', 'og:site_name', BRAND_NAME)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', ogImage)
    upsertLink('canonical', url)
  }, [title, description, path, image, type, noindex])

  return null
}

export default Seo
export { SITE_URL, DEFAULT_DESCRIPTION }
