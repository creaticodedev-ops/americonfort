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
    <label className="block text-xs font-medium text-[var(--admin-fg-secondary)]">{label}</label>
    {children}
    {hint ? <p className="text-xs text-[var(--admin-fg-muted)]">{hint}</p> : null}
  </div>
)

export const Check = ({ checked, onChange, label }) => (
  <label className="flex items-start gap-2.5 text-sm text-[var(--admin-fg)] cursor-pointer">
    <input
      type="checkbox"
      className="mt-0.5 h-4 w-4 rounded border-[var(--admin-border)] text-[var(--admin-accent)] focus:ring-[color-mix(in_srgb,var(--admin-accent)_30%,transparent)]"
      checked={Boolean(checked)}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span>{label}</span>
  </label>
)

export const SectionTitle = ({ title, hint }) => (
  <div className="mb-4">
    <h3 className="text-sm font-semibold text-[var(--admin-fg)]">{title}</h3>
    {hint ? <p className="mt-0.5 text-xs text-[var(--admin-fg-muted)]">{hint}</p> : null}
  </div>
)

export const settingsInputClass =
  'w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2.5 text-sm text-[var(--admin-fg)] outline-none focus:border-[color-mix(in_srgb,var(--admin-accent)_40%,var(--admin-border))]'

export const settingsNumClass = `${settingsInputClass} max-w-[12rem]`

export const SettingsPanel = ({ children, className = '' }) => (
  <div className={`admin-panel p-5 sm:p-6 space-y-6 ${className}`}>
    {children}
  </div>
)

export const RelatedLink = ({ to, title, description }) => (
  <Link
    to={to}
    className="group flex items-center gap-3 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-4 py-3 transition hover:border-[color-mix(in_srgb,var(--admin-accent)_30%,var(--admin-border))] hover:bg-[var(--admin-surface)]"
  >
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-[var(--admin-fg)] group-hover:text-[var(--admin-accent)] transition">{title}</p>
      {description ? <p className="mt-0.5 text-xs text-[var(--admin-fg-muted)]">{description}</p> : null}
    </div>
    <SettingsIcon
      name="chevron"
      className="h-4 w-4 text-[var(--admin-fg-muted)] shrink-0 ltr:group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
    />
  </Link>
)

export const GuidePage = ({ title, description, children }) => {
  const label = useSettingsLabel()
  return (
    <SettingsPanel>
      <div>
        <h2 className="text-base font-semibold text-[var(--admin-fg)]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[var(--admin-fg-secondary)]">{description}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
      <p className="text-xs text-[var(--admin-fg-muted)]">
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
  <div className="rounded-xl border border-[var(--admin-border)] overflow-hidden">
    <button
      type="button"
      id={`${id}-header`}
      aria-expanded={open}
      aria-controls={`${id}-panel`}
      onClick={onToggle}
      className="flex w-full items-start gap-3 px-4 py-3.5 text-start hover:bg-[var(--admin-surface-2)] transition"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[var(--admin-fg)]">{title}</span>
        {hint ? <span className="mt-0.5 block text-xs text-[var(--admin-fg-muted)]">{hint}</span> : null}
      </span>
      <SettingsIcon
        name="chevron"
        className={`mt-0.5 h-4 w-4 shrink-0 text-[var(--admin-fg-muted)] transition-transform rtl-flip ${open ? 'rotate-90' : ''}`}
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
        <div className="border-t border-[var(--admin-border)] px-4 py-4 space-y-3 bg-[var(--admin-surface)]">{children}</div>
      </div>
    </div>
  </div>
)
