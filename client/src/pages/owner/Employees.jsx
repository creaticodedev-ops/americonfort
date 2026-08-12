import React from 'react'
import OwnerDirectoryPage, { StatusBadge } from '../../components/owner/OwnerDirectoryPage'
import { useI18n } from '../../i18n/I18nContext'

const field =
  'w-full h-10 px-3 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] text-sm text-[var(--admin-fg)]'

/**
 * Employees = agency personnel records (no dashboard login).
 * Distinct from Staff (authenticated User permissions) and Chauffeurs/Samsars.
 */
const Employees = () => {
  const { t } = useI18n()

  return (
    <OwnerDirectoryPage
      title={t('admin.employees.title')}
      subtitle={t('admin.employees.subtitle')}
      endpoint="/api/owner/employees"
      nameField="fullName"
      emptyLabel={t('admin.employees.empty')}
      emptyDescription={t('admin.employees.emptyHint')}
      initialForm={{
        firstName: '',
        lastName: '',
        photo: '',
        position: '',
        phone: '',
        email: '',
        hireDate: '',
        notes: '',
        status: 'active',
      }}
      columns={[
        {
          key: 'fullName',
          label: t('admin.employees.colName'),
          render: (i) => (
            <div className="flex items-center gap-2 min-w-0">
              {i.photo ? (
                <img src={i.photo} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
              ) : (
                <span className="h-8 w-8 rounded-full bg-[var(--admin-surface-2)] text-[var(--admin-fg-muted)] text-xs flex items-center justify-center shrink-0">
                  {(i.firstName?.[0] || i.fullName?.[0] || '?').toUpperCase()}
                </span>
              )}
              <span className="truncate font-medium">{i.fullName}</span>
            </div>
          ),
        },
        { key: 'position', label: t('admin.employees.colPosition') },
        { key: 'phone', label: t('admin.employees.colPhone') },
        { key: 'email', label: t('admin.employees.colEmail') },
        {
          key: 'hireDate',
          label: t('admin.employees.colHireDate'),
          render: (i) => (i.hireDate ? new Date(i.hireDate).toLocaleDateString() : '—'),
        },
        {
          key: 'status',
          label: t('admin.common.status'),
          render: (i) => <StatusBadge status={i.status} />,
        },
        {
          key: 'createdAt',
          label: t('admin.employees.colCreated'),
          render: (i) => (i.createdAt ? new Date(i.createdAt).toLocaleDateString() : '—'),
        },
      ]}
      buildForm={(form, setForm) => (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]">
            {t('admin.employees.personalSection')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              className={field}
              placeholder={`${t('admin.employees.firstName')} *`}
              value={form.firstName || ''}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
            <input
              className={field}
              placeholder={`${t('admin.employees.lastName')} *`}
              value={form.lastName || ''}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
          <input
            className={field}
            placeholder={t('admin.employees.phone')}
            value={form.phone || ''}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            className={field}
            type="email"
            placeholder={t('admin.employees.email')}
            value={form.email || ''}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className={field}
            placeholder={t('admin.employees.photoUrl')}
            value={form.photo || ''}
            onChange={(e) => setForm({ ...form, photo: e.target.value })}
          />

          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)] pt-2">
            {t('admin.employees.professionalSection')}
          </p>
          <input
            className={field}
            placeholder={t('admin.employees.position')}
            value={form.position || ''}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
          />
          <label className="block text-xs text-[var(--admin-fg-muted)]">
            {t('admin.employees.hireDate')}
            <input
              className={`${field} mt-1`}
              type="date"
              value={form.hireDate ? String(form.hireDate).slice(0, 10) : ''}
              onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
            />
          </label>
          <select
            className={field}
            value={form.status || 'active'}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="active">{t('admin.common.active')}</option>
            <option value="inactive">{t('admin.common.inactive')}</option>
          </select>
          <textarea
            className="w-full min-h-[80px] px-3 py-2 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] text-sm text-[var(--admin-fg)]"
            placeholder={t('admin.employees.notes')}
            value={form.notes || ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </>
      )}
    />
  )
}

export default Employees
