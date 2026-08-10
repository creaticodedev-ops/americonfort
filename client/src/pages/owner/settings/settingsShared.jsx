import React from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../../i18n/I18nContext'
import { SettingsIcon } from './SettingsIcons'

export const useSettingsLabel = () => {
  const { t } = useI18n()
  return (key, fallback) => {
    const value = t(key)
    return !value || value === key ? fallback : value
  }
}

export const Field = ({ label, hint, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-medium text-gray-600">{label}</label>
    {children}
    {hint ? <p className="text-xs text-muted">{hint}</p> : null}
  </div>
)

export const Check = ({ checked, onChange, label }) => (
  <label className="flex items-start gap-2.5 text-sm text-ink cursor-pointer">
    <input
      type="checkbox"
      className="mt-0.5 h-4 w-4 rounded border-borderColor text-primary focus:ring-primary/30"
      checked={Boolean(checked)}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span>{label}</span>
  </label>
)

export const SectionTitle = ({ title, hint }) => (
  <div className="mb-4">
    <h3 className="text-sm font-semibold text-ink">{title}</h3>
    {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
  </div>
)

export const settingsInputClass =
  'w-full rounded-xl border border-borderColor bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/40'

export const settingsNumClass = `${settingsInputClass} max-w-[12rem]`

export const SettingsPanel = ({ children, className = '' }) => (
  <div
    className={`rounded-2xl border border-borderColor bg-white p-5 sm:p-6 space-y-6 ${className}`}
  >
    {children}
  </div>
)

export const RelatedLink = ({ to, title, description }) => (
  <Link
    to={to}
    className="group flex items-center gap-3 rounded-xl border border-borderColor bg-light/30 px-4 py-3 transition hover:border-primary/30 hover:bg-white"
  >
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-ink group-hover:text-primary transition">{title}</p>
      {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
    </div>
    <SettingsIcon name="chevron" className="h-4 w-4 text-muted shrink-0" />
  </Link>
)

export const GuidePage = ({ title, description, children }) => {
  const label = useSettingsLabel()
  return (
    <SettingsPanel>
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
      <p className="text-xs text-muted">
        {label(
          'admin.settings.nav.guideNote',
          'Additional options for this area will appear here as the product grows. Related tools remain available from the links above.',
        )}
      </p>
    </SettingsPanel>
  )
}

/** Collapsible subsection for dense category pages (e.g. Booking Settings). */
export const AccordionSection = ({ id, title, hint, open, onToggle, children }) => (
  <div className="rounded-xl border border-borderColor overflow-hidden">
    <button
      type="button"
      id={`${id}-header`}
      aria-expanded={open}
      aria-controls={`${id}-panel`}
      onClick={onToggle}
      className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-light/50 transition"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        {hint ? <span className="mt-0.5 block text-xs text-muted">{hint}</span> : null}
      </span>
      <SettingsIcon
        name="chevron"
        className={`mt-0.5 h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-90' : ''}`}
      />
    </button>
    <div
      id={`${id}-panel`}
      role="region"
      aria-labelledby={`${id}-header`}
      className={`grid transition-[grid-template-rows] duration-200 ease-out ${
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="border-t border-borderColor px-4 py-4 space-y-3 bg-white">{children}</div>
      </div>
    </div>
  </div>
)
