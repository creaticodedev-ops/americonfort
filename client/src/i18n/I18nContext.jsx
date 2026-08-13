import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { en as baseEn, fr as baseFr, es as baseEs } from './translations'
import { ar as baseAr } from './ar.generated.js'
import { extrasEn, extrasFr, extrasEs, extrasAr, polishArAdmin } from './adminExtras'

const RTL_LANGS = new Set(['ar'])

const deepMerge = (base, overlay) => {
  if (!overlay) return base
  const out = { ...(base || {}) }
  for (const [key, value] of Object.entries(overlay)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && out[key] && typeof out[key] === 'object') {
      out[key] = deepMerge(out[key], value)
    } else {
      out[key] = value
    }
  }
  return out
}

const baseDictionaries = {
  en: { ...baseEn },
  fr: { ...baseFr },
  es: { ...baseEs },
  ar: { ...baseAr },
}

const I18nContext = createContext(null)

const getNested = (obj, path) =>
  path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj)

const needsAdminDictionary = (pathname = '') =>
  pathname.startsWith('/owner') ||
  pathname.startsWith('/superadmin') ||
  pathname.startsWith('/admin')

const applyDocumentDirection = (lang) => {
  const dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr'
  document.documentElement.lang = lang
  document.documentElement.dir = dir
  document.documentElement.dataset.lang = lang
  document.body?.setAttribute?.('dir', dir)
  if (dir === 'rtl') {
    if (!document.getElementById('cairo-arabic-font')) {
      const link = document.createElement('link')
      link.id = 'cairo-arabic-font'
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap'
      document.head.appendChild(link)
    }
  }
}

export const I18nProvider = ({ children }) => {
  const { pathname } = useLocation()
  const [language, setLanguageState] = useState(() => {
    const stored = localStorage.getItem('language') || 'en'
    return baseDictionaries[stored] ? stored : 'en'
  })
  const [dictionaries, setDictionaries] = useState(baseDictionaries)
  const [adminLoaded, setAdminLoaded] = useState(false)

  const isRtl = RTL_LANGS.has(language)

  const setLanguage = (lang) => {
    if (!baseDictionaries[lang]) return
    setLanguageState(lang)
    localStorage.setItem('language', lang)
    applyDocumentDirection(lang)
  }

  useEffect(() => {
    applyDocumentDirection(language)
  }, [language])

  useEffect(() => {
    if (!needsAdminDictionary(pathname) || adminLoaded) return
    let cancelled = false
    import('./adminTranslations').then(async (mod) => {
      if (cancelled) return
      const arMod = await import('./adminAr.generated.js')
      if (cancelled) return
      setDictionaries({
        en: { ...baseEn, admin: deepMerge(mod.adminEn, extrasEn) },
        fr: { ...baseFr, admin: deepMerge(mod.adminFr, extrasFr) },
        es: { ...baseEs, admin: deepMerge(mod.adminEs, extrasEs) },
        ar: { ...baseAr, admin: deepMerge(deepMerge(arMod.adminAr, extrasAr), polishArAdmin) },
      })
      setAdminLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [pathname, adminLoaded])

  const t = useMemo(() => {
    const dict = dictionaries[language] || dictionaries.en
    const fallback = dictionaries.en
    return (key, vars = {}) => {
      let value = getNested(dict, key)
      if (value === undefined) value = getNested(fallback, key)
      if (typeof value !== 'string') return key
      return Object.keys(vars).reduce(
        (str, k) => str.replace(new RegExp(`{{${k}}}`, 'g'), String(vars[k])),
        value,
      )
    }
  }, [language, dictionaries])

  const getArray = (key) => {
    const dict = dictionaries[language] || dictionaries.en
    const value = getNested(dict, key)
    if (Array.isArray(value)) return value
    const fallback = getNested(dictionaries.en, key)
    return Array.isArray(fallback) ? fallback : []
  }

  const value = {
    language,
    setLanguage,
    t,
    getArray,
    languages: ['en', 'fr', 'es', 'ar'],
    adminLoaded,
    isRtl,
    dir: isRtl ? 'rtl' : 'ltr',
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
