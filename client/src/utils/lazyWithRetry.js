import { lazy } from 'react'

const LAZY_RETRY_KEY = 'americonfort:lazy-retry'
const CHUNK_RELOAD_KEY = 'americonfort:chunk-reload'
const CHUNK_RELOAD_COUNT_KEY = 'americonfort:chunk-reload-count'

export const isChunkLoadError = (error) => {
  const msg = String(error?.message || error || '')
  if (
    /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\d]+ failed|Unable to preload CSS/i.test(
      msg,
    )
  ) {
    return true
  }
  // React.lazy often surfaces a 404 chunk as: Cannot read properties of undefined (reading 'default')
  if (/Cannot read propert(?:y|ies) of undefined \(reading ['"]default['"]\)/i.test(msg)) {
    return true
  }
  return false
}

/** Full navigation that bypasses stale HTML/module graphs after a deploy. */
export const hardRecoverFromStaleChunks = (path = '/') => {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    sessionStorage.removeItem(CHUNK_RELOAD_COUNT_KEY)
    sessionStorage.removeItem(LAZY_RETRY_KEY)
  } catch {
    /* private mode */
  }

  const go = () => {
    if (typeof window.__acHardRecover === 'function' && (path === '/' || !path)) {
      window.__acHardRecover()
      return
    }
    const next = new URL(path || '/', window.location.origin)
    next.searchParams.set('_recover', String(Date.now()))
    window.location.replace(next.toString())
  }

  const jobs = []
  try {
    if (navigator.serviceWorker?.getRegistrations) {
      jobs.push(
        navigator.serviceWorker.getRegistrations().then((regs) =>
          Promise.all(regs.map((r) => r.unregister())),
        ),
      )
    }
  } catch {
    /* ignore */
  }
  try {
    if (window.caches) {
      jobs.push(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))))
    }
  } catch {
    /* ignore */
  }

  Promise.all(jobs).finally(go)
}

/**
 * React.lazy wrapper that recovers once from missing hashed chunks after a deploy.
 * Use for every route-level dynamic import.
 */
export const lazyWithRetry = (importer) =>
  lazy(async () => {
    try {
      return await importer()
    } catch (err) {
      if (!isChunkLoadError(err)) throw err
      try {
        if (!sessionStorage.getItem(LAZY_RETRY_KEY)) {
          sessionStorage.setItem(LAZY_RETRY_KEY, '1')
          sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
          const next = new URL(window.location.href)
          next.searchParams.set('_', String(Date.now()))
          window.location.replace(next.toString())
          return new Promise(() => {})
        }
        sessionStorage.removeItem(LAZY_RETRY_KEY)
      } catch {
        /* private mode */
      }
      throw err
    }
  })

export default lazyWithRetry
