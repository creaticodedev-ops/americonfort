import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { en as baseEn, fr as baseFr, es as baseEs } from './translations'
import { ar as baseAr } from './ar.generated.js'

const RTL_LANGS = new Set(['ar'])

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
        en: { ...baseEn, admin: mod.adminEn },
        fr: { ...baseFr, admin: mod.adminFr },
        es: { ...baseEs, admin: mod.adminEs },
        ar: { ...baseAr, admin: arMod.adminAr },
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
