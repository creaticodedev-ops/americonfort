import React, { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'

const LanguageSwitcher = ({ className = '', variant = 'default' }) => {
  const { language, setLanguage, t, languages, isRtl } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  const isLight = variant === 'light'
  const btnClass = isLight
    ? 'border-white/25 text-white/90 hover:bg-white/10'
    : 'border-borderColor text-ink hover:bg-sand/80'

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm transition-colors cursor-pointer ${btnClass}`}
        aria-label={t('languages.change') !== 'languages.change' ? t('languages.change') : 'Change language'}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="font-medium tracking-wide">{language.toUpperCase()}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="opacity-70"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute ${isRtl ? 'left-0' : 'right-0'} end-0 mt-2 z-50 min-w-44 rounded-xl border border-borderColor bg-white py-1 shadow-[0_16px_40px_-20px_rgba(22,18,16,0.35)]`}
        >
          {languages.map((code) => (
            <button
              key={code}
              type="button"
              role="option"
              aria-selected={language === code}
              onClick={() => {
                setLanguage(code)
                setOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-sand/70 cursor-pointer ${
                isRtl ? 'text-right flex-row-reverse' : 'text-left'
              } ${language === code ? 'text-primary font-medium' : 'text-muted'}`}
            >
              <span className="w-7 text-[11px] font-semibold tracking-wide">{code.toUpperCase()}</span>
              <span className="flex-1">{t(`languages.${code}`)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LanguageSwitcher
