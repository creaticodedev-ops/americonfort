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
