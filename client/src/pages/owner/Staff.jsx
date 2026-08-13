import React from 'react'
import { Link } from 'react-router-dom'
import { AdminPage, PageHeader, EmptyState } from '../../components/owner/ui'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { OWNER_PERMISSIONS } from '../../utils/ownerPermissions'

const Staff = () => {
  const { user } = useAppContext()
  const { t } = useI18n()
  const perms = Array.isArray(user?.permissions) ? user.permissions : []
  const fullAccess = perms.length === 0
  const shown = fullAccess ? OWNER_PERMISSIONS : OWNER_PERMISSIONS.filter((p) => perms.includes(p))

  return (
    <AdminPage>
      <PageHeader
        title={t('admin.staff.title')}
        description={t('admin.staff.subtitle')}
        breadcrumbs={[
          { label: t('admin.menu.dashboard'), to: '/owner' },
          { label: t('admin.staff.title') },
        ]}
      />

      <div className="space-y-4 max-w-3xl">
        <section className="admin-panel">
          <div className="admin-panel-header">
            <h2 className="admin-panel-title">{t('admin.staff.currentAccount')}</h2>
          </div>
          <div className="admin-panel-body space-y-3 text-sm">
            <p>
              <span className="text-[var(--admin-fg-muted)]">{t('admin.staff.name')} · </span>
              <span className="text-[var(--admin-fg)] font-medium">{user?.name || '—'}</span>
            </p>
            <p>
              <span className="text-[var(--admin-fg-muted)]">{t('admin.staff.email')} · </span>
              <span className="text-[var(--admin-fg)]">{user?.email || '—'}</span>
            </p>
            <p>
              <span className="text-[var(--admin-fg-muted)]">{t('admin.staff.agency')} · </span>
              <span className="text-[var(--admin-fg)]">
                {user?.agencyName || user?.agencyProfile?.legalName || '—'}
              </span>
            </p>
            <p className="text-[var(--admin-fg-secondary)] leading-relaxed">{t('admin.staff.vsEmployees')}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link to="/owner/employees" className="admin-btn admin-btn--secondary">
                {t('admin.menu.employees')}
              </Link>
              <Link to="/owner/audit" className="admin-btn admin-btn--secondary">
                {t('admin.menu.audit')}
              </Link>
            </div>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <h2 className="admin-panel-title">{t('admin.staff.permissionsTitle')}</h2>
          </div>
          <div className="admin-panel-body">
            <p className="text-sm text-[var(--admin-fg-secondary)] mb-4">
              {fullAccess ? t('admin.staff.fullAccess') : t('admin.staff.limitedAccess')}
            </p>
            {shown.length === 0 ? (
              <EmptyState title={t('admin.staff.none')} />
            ) : (
              <ul className="grid sm:grid-cols-2 gap-2">
                {shown.map((key) => (
                  <li
                    key={key}
                    className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2 text-sm text-[var(--admin-fg)]"
                  >
                    {t(`admin.staff.perm.${key}`)}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-[var(--admin-fg-muted)] leading-relaxed">
              {t('admin.staff.managedHint')}
            </p>
          </div>
        </section>
      </div>
    </AdminPage>
  )
}

export default Staff
