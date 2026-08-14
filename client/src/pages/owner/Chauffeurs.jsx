import React from 'react'
import OwnerDirectoryPage, { StatusBadge } from '../../components/owner/OwnerDirectoryPage'
import {
  AdminFormSection,
  AdminFormField,
  AdminFormInput,
  AdminFormTextarea,
  AdminFormGrid,
} from '../../components/owner/ui'
import { useI18n } from '../../i18n/I18nContext'

const INITIAL_FORM = {
  fullName: '',
  phone: '',
  email: '',
  address: '',
  licenseNumber: '',
  licenseExpiry: '',
  licenseCategory: '',
  notes: '',
  status: 'active',
}

function ChauffeurForm({ form, patchForm }) {
  const { t } = useI18n()

  return (
    <>
      <AdminFormSection>
        <AdminFormField label={t('admin.chauffeurs.fullName')} required>
          <AdminFormInput
            value={form.fullName || ''}
            onChange={(e) => patchForm({ fullName: e.target.value })}
            autoComplete="name"
          />
        </AdminFormField>
        <AdminFormField label={t('admin.chauffeurs.phone')}>
          <AdminFormInput
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone || ''}
            onChange={(e) => patchForm({ phone: e.target.value })}
          />
        </AdminFormField>
        <AdminFormField label={t('admin.chauffeurs.email')}>
          <AdminFormInput
            type="email"
            inputMode="email"
            autoComplete="email"
            value={form.email || ''}
            onChange={(e) => patchForm({ email: e.target.value })}
          />
        </AdminFormField>
        <AdminFormField label={t('admin.chauffeurs.address')}>
          <AdminFormInput
            value={form.address || ''}
            onChange={(e) => patchForm({ address: e.target.value })}
            autoComplete="street-address"
          />
        </AdminFormField>
      </AdminFormSection>

      <AdminFormSection title={t('admin.chauffeurs.colLicense')}>
        <AdminFormField label={t('admin.chauffeurs.licenseNumber')}>
          <AdminFormInput
            value={form.licenseNumber || ''}
            onChange={(e) => patchForm({ licenseNumber: e.target.value })}
          />
        </AdminFormField>
        <AdminFormGrid columns={2}>
          <AdminFormField label={t('admin.chauffeurs.licenseExpiry')}>
            <AdminFormInput
              type="date"
              value={form.licenseExpiry ? String(form.licenseExpiry).slice(0, 10) : ''}
              onChange={(e) => patchForm({ licenseExpiry: e.target.value })}
            />
          </AdminFormField>
          <AdminFormField label={t('admin.chauffeurs.licenseCategory')}>
            <AdminFormInput
              value={form.licenseCategory || ''}
              onChange={(e) => patchForm({ licenseCategory: e.target.value })}
            />
          </AdminFormField>
        </AdminFormGrid>
      </AdminFormSection>

      <AdminFormField label={t('admin.chauffeurs.notes')}>
        <AdminFormTextarea
          value={form.notes || ''}
          onChange={(e) => patchForm({ notes: e.target.value })}
        />
      </AdminFormField>
    </>
  )
}

const Chauffeurs = () => {
  const { t } = useI18n()

  const licenceHint = (item) => {
    if (!item.licenseExpiry) return null
    const d = new Date(item.licenseExpiry)
    if (Number.isNaN(d.getTime())) return null
    const days = Math.ceil((d - Date.now()) / 86400000)
    if (days < 0) return <span className="text-xs text-[var(--admin-danger)]">{t('admin.chauffeurs.expired')}</span>
    if (days <= 30) {
      return <span className="text-xs text-[var(--admin-warning)]">{t('admin.chauffeurs.expiresSoon')}</span>
    }
    return null
  }

  return (
    <OwnerDirectoryPage
      title={t('admin.chauffeurs.title')}
      subtitle={t('admin.chauffeurs.subtitle')}
      endpoint="/api/owner/chauffeurs"
      emptyLabel={t('admin.chauffeurs.empty')}
      emptyDescription={t('admin.chauffeurs.emptyHint')}
      initialForm={INITIAL_FORM}
      FormComponent={ChauffeurForm}
      columns={[
        { key: 'fullName', label: t('admin.chauffeurs.colName') },
        { key: 'phone', label: t('admin.chauffeurs.colPhone') },
        {
          key: 'license',
          label: t('admin.chauffeurs.colLicense'),
          render: (i) => (
            <div>
              <div>{i.licenseNumber || '—'}</div>
              <div className="text-xs text-[var(--admin-fg-muted)]">
                {i.licenseExpiry ? new Date(i.licenseExpiry).toLocaleDateString() : ''}
              </div>
              {licenceHint(i)}
            </div>
          ),
        },
        {
          key: 'status',
          label: t('admin.common.status'),
          render: (i) => <StatusBadge status={i.status} />,
        },
      ]}
    />
  )
}

export default Chauffeurs
