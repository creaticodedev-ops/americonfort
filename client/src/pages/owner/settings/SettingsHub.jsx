import React from 'react'
import { Link } from 'react-router-dom'
import { SETTINGS_CATEGORIES } from './settingsCategories'
import { SettingsIcon } from './SettingsIcons'
import { useSettingsLabel } from './settingsShared'

const SettingsHub = () => {
  const label = useSettingsLabel()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 max-w-5xl">
      {SETTINGS_CATEGORIES.map((category) => {
        const to =
          category.kind === 'link'
            ? category.to
            : `/owner/settings/${category.id}`
        const externalModule = category.kind === 'link'

        return (
          <Link
            key={category.id}
            to={to}
            className="group flex items-start gap-3.5 rounded-2xl border border-borderColor bg-white p-4 sm:p-5 shadow-[0_1px_0_rgba(22,18,16,0.03)] transition hover:border-primary/35 hover:shadow-[0_10px_30px_-20px_rgba(22,18,16,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary transition group-hover:bg-primary/12">
              <SettingsIcon name={category.icon} className="h-[1.35rem] w-[1.35rem]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-ink leading-snug">
                  {label(category.titleKey, category.title)}
                </span>
                <SettingsIcon
                  name="chevron"
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted transition group-hover:text-primary group-hover:translate-x-0.5"
                />
              </span>
              <span className="mt-1 block text-xs sm:text-[13px] text-muted leading-relaxed">
                {label(category.descriptionKey, category.description)}
              </span>
              {externalModule ? (
                <span className="mt-2 inline-flex text-[10px] uppercase tracking-[0.14em] text-primary/70">
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
