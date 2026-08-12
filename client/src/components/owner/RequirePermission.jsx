import React from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { AdminPage, PageHeader } from './ui'

/**
 * Route-level permission gate for owner pages.
 * Empty permissions[] on the user = full access.
 */
const RequirePermission = ({ permission, children }) => {
  const { hasPermission } = useAppContext()
  const { t } = useI18n()

  if (hasPermission(permission)) return children

  return (
    <AdminPage>
      <PageHeader title={t('admin.shell.noAccessTitle')} description={t('admin.shell.noAccessBody')} />
      <Link to="/owner" className="admin-btn admin-btn--secondary">
        {t('admin.shell.backDashboard')}
      </Link>
    </AdminPage>
  )
}

export default RequirePermission
