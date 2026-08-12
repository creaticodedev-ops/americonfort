import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'americonfort.admin.theme'
const AdminThemeContext = createContext(null)

const getSystemTheme = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'

const readStored = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* ignore */
  }
  return 'system'
}

export const AdminThemeProvider = ({ children }) => {
  const [preference, setPreference] = useState(readStored)
  const [systemTheme, setSystemTheme] = useState(getSystemTheme)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemTheme(mq.matches ? 'dark' : 'light')
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  const resolved = preference === 'system' ? systemTheme : preference

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      /* ignore */
    }
  }, [preference])

  const setTheme = useCallback((next) => {
    if (next === 'light' || next === 'dark' || next === 'system') setPreference(next)
  }, [])

  const toggle = useCallback(() => {
    setPreference((prev) => {
      const current = prev === 'system' ? systemTheme : prev
      return current === 'dark' ? 'light' : 'dark'
    })
  }, [systemTheme])

  const value = useMemo(
    () => ({ preference, resolved, setTheme, toggle, isDark: resolved === 'dark' }),
    [preference, resolved, setTheme, toggle],
  )

  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>
}

export const useAdminTheme = () => {
  const ctx = useContext(AdminThemeContext)
  if (!ctx) {
    return {
      preference: 'light',
      resolved: 'light',
      setTheme: () => {},
      toggle: () => {},
      isDark: false,
    }
  }
  return ctx
}

export default AdminThemeContext
