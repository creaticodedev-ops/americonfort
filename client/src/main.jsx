import { createRoot } from 'react-dom/client'
import '@fontsource/outfit/latin-400.css'
import '@fontsource/outfit/latin-500.css'
import '@fontsource/outfit/latin-600.css'
import '@fontsource/outfit/latin-ext-400.css'
import '@fontsource/outfit/latin-ext-500.css'
import '@fontsource/outfit/latin-ext-600.css'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/cormorant-garamond/latin-600.css'
import '@fontsource/cormorant-garamond/latin-ext-500.css'
import '@fontsource/cormorant-garamond/latin-ext-600.css'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from './context/AppContext.jsx'
import { SuperAdminProvider } from './context/SuperAdminContext.jsx'
import { MotionConfig } from 'motion/react'
import { I18nProvider } from './i18n/I18nContext.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <I18nProvider>
      <AppProvider>
        <SuperAdminProvider>
          <MotionConfig viewport={{ once: true }}>
            <App />
          </MotionConfig>
        </SuperAdminProvider>
      </AppProvider>
    </I18nProvider>
  </BrowserRouter>,
)
