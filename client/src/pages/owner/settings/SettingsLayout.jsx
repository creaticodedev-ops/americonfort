import React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { AdminPage, PageHeader } from '../../../components/owner/ui'
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

  const categoryTitle = category ? label(category.titleKey, category.title) : ''

  return (
    <AdminPage>
      <PageHeader
        title={
          isHub
            ? label('admin.settings.title', 'Settings')
            : categoryTitle || label('admin.settings.title', 'Settings')
        }
        description={
          isHub
            ? label(
                'admin.settings.hubSubtitle',
                'Choose a category to configure your agency. Settings stay scoped to your account.',
              )
            : label(category?.descriptionKey || '', category?.description || '')
        }
        breadcrumbs={
          isHub
            ? [{ label: label('admin.settings.title', 'Settings') }]
            : [
                { label: label('admin.settings.title', 'Settings'), to: '/owner/settings' },
                { label: categoryTitle },
              ]
        }
        actions={
          !isHub ? (
            <Link to="/owner/settings" className="admin-btn admin-btn--secondary">
              <SettingsIcon name="back" className="h-4 w-4" />
              {label('admin.settings.backToSettings', 'Back to Settings')}
            </Link>
          ) : null
        }
      />

      <div key={categoryId || 'hub'}>
        <Outlet />
      </div>
    </AdminPage>
  )
}

export default SettingsLayout
