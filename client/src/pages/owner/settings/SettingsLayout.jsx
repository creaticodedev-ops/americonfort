import React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import Title from '../../../components/owner/Title'
import { SettingsIcon } from './SettingsIcons'
import { getSettingsCategory } from './settingsCategories'
import { useSettingsLabel } from './settingsShared'

const SettingsLayout = () => {
  const label = useSettingsLabel()
  const { pathname } = useLocation()
  const categoryId =
    pathname.replace(/^\/owner\/settings\/?/, '').split('/').filter(Boolean)[0] || ''
  const category = categoryId ? getSettingsCategory(categoryId) : null
  const isHub = !categoryId

  const categoryTitle = category
    ? label(category.titleKey, category.title)
    : ''

  return (
    <div className="px-4 pt-8 md:px-8 lg:px-10 xl:px-12 md:pt-10 flex-1 pb-12 min-w-0">
      <div className="mb-6 space-y-3">
        {!isHub && (
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <Link to="/owner/settings" className="hover:text-ink transition">
              {label('admin.settings.title', 'Settings')}
            </Link>
            {categoryTitle ? (
              <>
                <span aria-hidden>/</span>
                <span className="text-ink font-medium">{categoryTitle}</span>
              </>
            ) : null}
          </nav>
        )}

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <Title
            title={
              isHub
                ? label('admin.settings.title', 'Settings')
                : categoryTitle || label('admin.settings.title', 'Settings')
            }
            subTitle={
              isHub
                ? label(
                    'admin.settings.hubSubtitle',
                    'Choose a category to configure your agency. Settings stay scoped to your account.',
                  )
                : label(category?.descriptionKey || '', category?.description || '')
            }
          />
          {!isHub && (
            <Link
              to="/owner/settings"
              className="inline-flex items-center gap-2 self-start rounded-xl border border-borderColor bg-white px-3.5 py-2 text-sm text-ink hover:border-primary/30 hover:text-primary transition"
            >
              <SettingsIcon name="back" className="h-4 w-4" />
              {label('admin.settings.backToSettings', 'Back to Settings')}
            </Link>
          )}
        </div>
      </div>

      <div key={categoryId || 'hub'} className="motion-safe:animate-fade-up">
        <Outlet />
      </div>
    </div>
  )
}

export default SettingsLayout
