import { createRoot } from 'react-dom/client'
import { preloadCriticalFonts, loadExtendedLatinFonts } from './fonts'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from './context/AppContext.jsx'
import { SuperAdminProvider } from './context/SuperAdminContext.jsx'
import { I18nProvider } from './i18n/I18nContext.jsx'

preloadCriticalFonts()
loadExtendedLatinFonts()

const CHUNK_RELOAD_KEY = 'americonfort:chunk-reload'

const isChunkLoadError = (error) => {
  const msg = String(error?.message || error || '')
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\d]+ failed/i.test(
    msg,
  )
}

const reloadOnceForStaleChunks = (reason) => {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return false
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
  } catch {
    if (window.location.search.includes('chunk_reload=1')) return false
    const url = new URL(window.location.href)
    url.searchParams.set('chunk_reload', '1')
    window.location.replace(url.toString())
    return true
  }
  console.warn('[boot] Reloading once after stale/missing JS chunk:', reason)
  window.location.reload()
  return true
}

// After a new deploy, cached HTML can reference deleted hashed chunks.
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
  } catch {
    /* ignore */
  }
}, 10_000)

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
