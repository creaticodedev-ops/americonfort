import React from 'react'
import {
  hardRecoverFromStaleChunks,
  isChunkLoadError,
} from '../utils/lazyWithRetry'

const CHUNK_RELOAD_KEY = 'americonfort:chunk-reload'
const CHUNK_RELOAD_COUNT_KEY = 'americonfort:chunk-reload-count'

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

    let count = 0
    try {
      count = parseInt(sessionStorage.getItem(CHUNK_RELOAD_COUNT_KEY) || '0', 10) || 0
    } catch {
      /* private mode */
    }

    // Auto-recover up to 2 times with a full cache-bust navigation.
    if (count < 2) {
      try {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
        sessionStorage.setItem(CHUNK_RELOAD_COUNT_KEY, String(count + 1))
      } catch {
        /* private mode */
      }
      hardRecoverFromStaleChunks(window.location.pathname || '/')
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
              onClick={() => hardRecoverFromStaleChunks('/')}
              className="px-5 py-2 rounded-lg bg-primary text-white hover:bg-primary-dull"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => hardRecoverFromStaleChunks('/')}
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
