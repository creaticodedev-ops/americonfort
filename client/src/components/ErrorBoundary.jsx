import React from 'react'
import { Link } from 'react-router-dom'

const CHUNK_RELOAD_KEY = 'americonfort:chunk-reload'
const CHUNK_RELOAD_COUNT_KEY = 'americonfort:chunk-reload-count'
const LAZY_RETRY_KEY = 'americonfort:lazy-retry'

const isChunkLoadError = (error) => {
  const msg = String(error?.message || error || '')
  const stack = String(error?.stack || '')
  if (
    /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\d]+ failed|Unable to preload CSS/i.test(
      msg,
    )
  ) {
    return true
  }
  // React.lazy often wraps a missing chunk as undefined.default
  if (/Cannot read propert(?:y|ies) of undefined \(reading ['"]default['"]\)/i.test(msg)) {
    return true
  }
  return false
}

const hardRecover = (path = '/') => {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    sessionStorage.removeItem(CHUNK_RELOAD_COUNT_KEY)
    sessionStorage.removeItem(LAZY_RETRY_KEY)
  } catch {
    /* private mode */
  }
  try {
    if (window.caches) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
    }
  } catch {
    /* ignore */
  }
  const next = new URL(path, window.location.origin)
  next.searchParams.set('_', String(Date.now()))
  window.location.replace(next.toString())
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, chunkError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, chunkError: isChunkLoadError(error) }
  }

  componentDidCatch(error, info) {
    console.error('Application error:', error, info)
    if (!isChunkLoadError(error)) return
    try {
      if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
        const next = new URL(window.location.href)
        next.searchParams.set('_', String(Date.now()))
        window.location.replace(next.toString())
      }
    } catch {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
          <h1 className="text-2xl font-semibold text-gray-800">
            {this.state.chunkError ? 'Updating the app…' : 'Something went wrong'}
          </h1>
          <p className="mt-2 text-gray-500 max-w-md">
            {this.state.chunkError
              ? 'A new version was deployed. Please refresh to load the latest page.'
              : 'An unexpected error occurred. Please refresh the page or return home.'}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => hardRecover(window.location.pathname || '/')}
              className="px-5 py-2 rounded-lg bg-primary text-white hover:bg-primary-dull"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => hardRecover('/')}
              className="px-5 py-2 rounded-lg border border-borderColor text-gray-700 hover:bg-gray-50"
            >
              Go Home
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
