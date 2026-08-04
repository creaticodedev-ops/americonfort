/**
 * Axios base URL must be the API origin only — never include `/api`.
 * Paths in the app already start with `/api/...`.
 */
export const normalizeApiBaseUrl = (raw) => {
  let base = String(raw ?? '').trim()
  if (!base) return ''
  base = base.replace(/\/+$/, '')
  if (base.endsWith('/api')) {
    base = base.slice(0, -4).replace(/\/+$/, '')
  }
  return base
}

/** Dev: empty base + Vite `/api` proxy. Prod: explicit VITE_BASE_URL or same origin. */
export const resolveApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_BASE_URL
  if (import.meta.env.DEV && !envUrl) return ''
  if (envUrl) return normalizeApiBaseUrl(envUrl)
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}
