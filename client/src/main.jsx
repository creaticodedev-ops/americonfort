import { createRoot } from 'react-dom/client'
import { preloadCriticalFonts, loadExtendedLatinFonts } from './fonts'
import './index.css'
import './styles/admin-dash.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from './context/AppContext.jsx'
import { SuperAdminProvider } from './context/SuperAdminContext.jsx'
import { I18nProvider } from './i18n/I18nContext.jsx'
import { isChunkLoadError } from './utils/lazyWithRetry'

preloadCriticalFonts()
loadExtendedLatinFonts()

const CHUNK_RELOAD_KEY = 'americonfort:chunk-reload'
const CHUNK_RELOAD_COUNT_KEY = 'americonfort:chunk-reload-count'
const LAZY_RETRY_KEY = 'americonfort:lazy-retry'

/**
 * At most ONE automatic full reload per tab session for stale hashed chunks.
 * Never clear this guard on a timer — that caused infinite reload loops when
 * the same missing chunk kept failing after each reload.
 */
const reloadOnceForStaleChunks = (reason) => {
  let count = 0
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === 'done') return false
    count = parseInt(sessionStorage.getItem(CHUNK_RELOAD_COUNT_KEY) || '0', 10) || 0
    if (count >= 1) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, 'done')
      return false
    }
    sessionStorage.setItem(CHUNK_RELOAD_COUNT_KEY, String(count + 1))
    sessionStorage.setItem(CHUNK_RELOAD_KEY, 'pending')
  } catch {
    if (window.location.search.includes('chunk_reload=1')) return false
    const url = new URL(window.location.href)
    url.searchParams.set('chunk_reload', '1')
    url.searchParams.set('_', String(Date.now()))
    window.location.replace(url.toString())
    return true
  }

  console.warn('[boot] Reloading once after stale/missing JS chunk:', reason)
  const next = new URL(window.location.href)
  next.searchParams.set('_', String(Date.now()))
  window.location.replace(next.toString())
  return true
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  reloadOnceForStaleChunks(event.payload || 'vite:preloadError')
})

window.addEventListener('unhandledrejection', (event) => {
  if (!isChunkLoadError(event.reason)) return
  if (reloadOnceForStaleChunks(event.reason)) {
    event.preventDefault()
  }
})

const rootEl = document.getElementById('root')

createRoot(rootEl).render(
  <BrowserRouter>
    <I18nProvider>
      <AppProvider>
        <SuperAdminProvider>
          <App />
        </SuperAdminProvider>
      </AppProvider>
    </I18nProvider>
  </BrowserRouter>,
)

/** Clear reload guards only after the app has actually painted. */
window.requestAnimationFrame(() => {
  window.setTimeout(() => {
    if (!rootEl || rootEl.childElementCount === 0) return
    try {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY)
      sessionStorage.removeItem(CHUNK_RELOAD_COUNT_KEY)
      sessionStorage.removeItem(LAZY_RETRY_KEY)
    } catch {
      /* ignore */
    }
  }, 2500)
})
