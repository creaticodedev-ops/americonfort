import React from 'react'
import OwnerDirectoryPage, { StatusBadge } from '../../components/owner/OwnerDirectoryPage'
import {
  AdminFormSection,
  AdminFormField,
  AdminFormInput,
  AdminFormTextarea,
  AdminFormSelect,
  AdminFormGrid,
} from '../../components/owner/ui'
import { useI18n } from '../../i18n/I18nContext'

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  photo: '',
  position: '',
  phone: '',
  email: '',
  hireDate: '',
  notes: '',
  status: 'active',
}

function EmployeeForm({ form, patchForm }) {
  const { t } = useI18n()

  return (
    <>
      <AdminFormSection title={t('admin.employees.personalSection')}>
        <AdminFormGrid columns={2}>
          <AdminFormField label={t('admin.employees.firstName')} required>
            <AdminFormInput
              value={form.firstName || ''}
              onChange={(e) => patchForm({ firstName: e.target.value })}
              autoComplete="given-name"
            />
          </AdminFormField>
          <AdminFormField label={t('admin.employees.lastName')} required>
            <AdminFormInput
              value={form.lastName || ''}
              onChange={(e) => patchForm({ lastName: e.target.value })}
              autoComplete="family-name"
            />
          </AdminFormField>
        </AdminFormGrid>
        <AdminFormField label={t('admin.employees.phone')}>
          <AdminFormInput
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone || ''}
            onChange={(e) => patchForm({ phone: e.target.value })}
          />
        </AdminFormField>
        <AdminFormField label={t('admin.employees.email')}>
          <AdminFormInput
            type="email"
            inputMode="email"
            autoComplete="email"
            value={form.email || ''}
            onChange={(e) => patchForm({ email: e.target.value })}
          />
        </AdminFormField>
        <AdminFormField label={t('admin.employees.photoUrl')} hint={t('admin.employees.photoUrl')}>
          <AdminFormInput
            type="url"
            inputMode="url"
            value={form.photo || ''}
            onChange={(e) => patchForm({ photo: e.target.value })}
          />
        </AdminFormField>
      </AdminFormSection>

      <AdminFormSection title={t('admin.employees.professionalSection')}>
        <AdminFormField label={t('admin.employees.position')}>
          <AdminFormInput
            value={form.position || ''}
            onChange={(e) => patchForm({ position: e.target.value })}
          />
        </AdminFormField>
        <AdminFormField label={t('admin.employees.hireDate')}>
          <AdminFormInput
            type="date"
            value={form.hireDate ? String(form.hireDate).slice(0, 10) : ''}
            onChange={(e) => patchForm({ hireDate: e.target.value })}
          />
        </AdminFormField>
        <AdminFormField label={t('admin.common.status')}>
          <AdminFormSelect
            value={form.status || 'active'}
            onChange={(e) => patchForm({ status: e.target.value })}
          >
            <option value="active">{t('admin.common.active')}</option>
            <option value="inactive">{t('admin.common.inactive')}</option>
          </AdminFormSelect>
        </AdminFormField>
      </AdminFormSection>

      <AdminFormField label={t('admin.employees.notes')}>
        <AdminFormTextarea
          value={form.notes || ''}
          onChange={(e) => patchForm({ notes: e.target.value })}
        />
      </AdminFormField>
    </>
  )
}

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
      initialForm={INITIAL_FORM}
      FormComponent={EmployeeForm}
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
    />
  )
}

export default Employees
