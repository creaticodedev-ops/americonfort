import React from 'react'
import OwnerDirectoryPage, { StatusBadge } from '../../components/owner/OwnerDirectoryPage'
import { useI18n } from '../../i18n/I18nContext'

const field =
  'w-full h-10 px-3 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] text-sm text-[var(--admin-fg)]'

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
      <input
        className={field}
        placeholder={`${t('admin.chauffeurs.fullName')} *`}
        value={form.fullName || ''}
        onChange={(e) => patchForm({ fullName: e.target.value })}
      />
      <input
        className={field}
        placeholder={t('admin.chauffeurs.phone')}
        value={form.phone || ''}
        onChange={(e) => patchForm({ phone: e.target.value })}
      />
      <input
        className={field}
        placeholder={t('admin.chauffeurs.email')}
        value={form.email || ''}
        onChange={(e) => patchForm({ email: e.target.value })}
      />
      <input
        className={field}
        placeholder={t('admin.chauffeurs.address')}
        value={form.address || ''}
        onChange={(e) => patchForm({ address: e.target.value })}
      />
      <input
        className={field}
        placeholder={t('admin.chauffeurs.licenseNumber')}
        value={form.licenseNumber || ''}
        onChange={(e) => patchForm({ licenseNumber: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          className={field}
          type="date"
          value={form.licenseExpiry ? String(form.licenseExpiry).slice(0, 10) : ''}
          onChange={(e) => patchForm({ licenseExpiry: e.target.value })}
        />
        <input
          className={field}
          placeholder={t('admin.chauffeurs.licenseCategory')}
          value={form.licenseCategory || ''}
          onChange={(e) => patchForm({ licenseCategory: e.target.value })}
        />
      </div>
      <textarea
        className="w-full min-h-[80px] px-3 py-2 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] text-sm"
        placeholder={t('admin.chauffeurs.notes')}
        value={form.notes || ''}
        onChange={(e) => patchForm({ notes: e.target.value })}
      />
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
