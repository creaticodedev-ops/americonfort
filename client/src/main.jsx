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

const reloadOnceForStaleChunks = (reason) => {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return false
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
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
  if (isChunkLoadError(event.reason)) {
    if (reloadOnceForStaleChunks(event.reason)) {
      event.preventDefault()
    }
  }
})

window.setTimeout(() => {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    sessionStorage.removeItem('americonfort:chunk-reload-count')
    sessionStorage.removeItem('americonfort:lazy-retry')
  } catch {
    /* ignore */
  }
}, 15_000)

createRoot(document.getElementById('root')).render(
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
