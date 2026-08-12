import React from 'react'
import { Link } from 'react-router-dom'
import { SETTINGS_CATEGORIES } from './settingsCategories'
import { SettingsIcon } from './SettingsIcons'
import { useSettingsLabel } from './settingsShared'

const SettingsHub = () => {
  const label = useSettingsLabel()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-w-5xl">
      {SETTINGS_CATEGORIES.map((category) => {
        const to =
          category.kind === 'link' ? category.to : `/owner/settings/${category.id}`
        const externalModule = category.kind === 'link'

        return (
          <Link
            key={category.id}
            to={to}
            className="group flex items-start gap-3.5 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 sm:p-5 shadow-[var(--admin-shadow-sm)] transition hover:border-[color-mix(in_srgb,var(--admin-accent)_35%,var(--admin-border))] hover:shadow-[var(--admin-shadow)] focus:outline-none focus-visible:shadow-[var(--admin-focus)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--admin-radius)] bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]">
              <SettingsIcon name={category.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-[var(--admin-fg)] leading-snug">
                  {label(category.titleKey, category.title)}
                </span>
                <SettingsIcon
                  name="chevron"
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--admin-fg-muted)] transition group-hover:text-[var(--admin-accent)] group-hover:translate-x-0.5"
                />
              </span>
              <span className="mt-1 block text-xs sm:text-[13px] text-[var(--admin-fg-secondary)] leading-relaxed">
                {label(category.descriptionKey, category.description)}
              </span>
              {externalModule ? (
                <span className="mt-2 inline-flex text-[10px] uppercase tracking-[0.14em] text-[var(--admin-accent)]/80">
                  {label('admin.settings.nav.openModule', 'Open module')}
                </span>
              ) : null}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

export default SettingsHub
