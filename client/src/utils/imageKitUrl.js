/** Detect ImageKit CDN URLs (public car images). */
export const isImageKitUrl = (src) => {
  if (!src || typeof src !== 'string') return false
  try {
    const host = new URL(src).hostname
    return host === 'ik.imagekit.io' || host.endsWith('.imagekit.io')
  } catch {
    return false
  }
}

/**
 * Build an ImageKit URL with responsive transforms.
 * Uses f-auto so ImageKit can serve AVIF/WebP from Accept headers.
 */
export const buildImageKitUrl = (src, { width, quality = 'auto', format = 'auto' } = {}) => {
  if (!isImageKitUrl(src)) return src
  try {
    const url = new URL(src)
    const segments = url.pathname.split('/').filter(Boolean)
    if (segments.length < 2) return src

    const ikId = segments[0]
    let rest = segments.slice(1)
    if (rest[0]?.startsWith('tr:')) rest = rest.slice(1)

    const parts = []
    if (width) parts.push(`w-${Math.round(width)}`)
    if (quality != null && quality !== '') parts.push(`q-${quality}`)
    if (format) parts.push(`f-${format}`)

    url.pathname = `/${[ikId, `tr:${parts.join(',')}`, ...rest].join('/')}`
    return url.toString()
  } catch {
    return src
  }
}

/** srcset string for ImageKit widths, or undefined for non-ImageKit sources. */
export const imageKitSrcSet = (src, widths = [400, 640, 960, 1280]) => {
  if (!isImageKitUrl(src)) return undefined
  return widths
    .map((w) => `${buildImageKitUrl(src, { width: w })} ${w}w`)
    .join(', ')
}

export default { isImageKitUrl, buildImageKitUrl, imageKitSrcSet }
