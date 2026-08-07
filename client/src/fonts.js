/**
 * Critical self-hosted fonts (latin) load with the app CSS.
 * latin-ext (FR/ES accents) loads after first paint to cut render-blocking work.
 * fontsource already sets font-display: swap.
 */
import '@fontsource/outfit/latin-400.css'
import '@fontsource/outfit/latin-500.css'
import '@fontsource/outfit/latin-600.css'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/cormorant-garamond/latin-600.css'

import outfit400 from '@fontsource/outfit/files/outfit-latin-400-normal.woff2?url'
import cormorant500 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2?url'

const preloadFont = (href) => {
  if (typeof document === 'undefined' || !href) return
  if (document.querySelector(`link[rel="preload"][href="${href}"]`)) return
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'font'
  link.type = 'font/woff2'
  link.crossOrigin = 'anonymous'
  link.href = href
  document.head.appendChild(link)
}

/** Preload the two fonts that paint the LCP hero text. */
export const preloadCriticalFonts = () => {
  preloadFont(cormorant500)
  preloadFont(outfit400)
}

/** Load latin-ext subsets after idle so FR/ES glyphs work without blocking first paint. */
export const loadExtendedLatinFonts = () => {
  const load = () => {
    Promise.all([
      import('@fontsource/outfit/latin-ext-400.css'),
      import('@fontsource/outfit/latin-ext-500.css'),
      import('@fontsource/outfit/latin-ext-600.css'),
      import('@fontsource/cormorant-garamond/latin-ext-500.css'),
      import('@fontsource/cormorant-garamond/latin-ext-600.css'),
    ]).catch(() => {
      /* non-fatal — latin fallback remains */
    })
  }

  if (typeof window === 'undefined') return
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(load, { timeout: 1800 })
  } else {
    window.setTimeout(load, 200)
  }
}
