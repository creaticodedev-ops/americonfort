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
  fullName: '',
  phone: '',
  email: '',
  address: '',
  commissionType: 'percent',
  commissionValue: 10,
  notes: '',
  status: 'active',
}

function SamsarForm({ form, patchForm }) {
  const { t } = useI18n()

  return (
    <>
      <AdminFormSection>
        <AdminFormField label={t('admin.samsars.fullName')} required>
          <AdminFormInput
            value={form.fullName || ''}
            onChange={(e) => patchForm({ fullName: e.target.value })}
            autoComplete="name"
          />
        </AdminFormField>
        <AdminFormField label={t('admin.samsars.phone')}>
          <AdminFormInput
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone || ''}
            onChange={(e) => patchForm({ phone: e.target.value })}
          />
        </AdminFormField>
        <AdminFormField label={t('admin.samsars.email')}>
          <AdminFormInput
            type="email"
            inputMode="email"
            autoComplete="email"
            value={form.email || ''}
            onChange={(e) => patchForm({ email: e.target.value })}
          />
        </AdminFormField>
        <AdminFormField label={t('admin.samsars.address')}>
          <AdminFormInput
            value={form.address || ''}
            onChange={(e) => patchForm({ address: e.target.value })}
            autoComplete="street-address"
          />
        </AdminFormField>
      </AdminFormSection>

      <AdminFormSection title={t('admin.samsars.colCommission')}>
        <AdminFormGrid columns={2}>
          <AdminFormField label={t('admin.samsars.commissionType')}>
            <AdminFormSelect
              value={form.commissionType}
              onChange={(e) => patchForm({ commissionType: e.target.value })}
            >
              <option value="percent">{t('admin.samsars.commissionPercent')}</option>
              <option value="fixed">{t('admin.samsars.commissionFixed')}</option>
              <option value="none">{t('admin.samsars.commissionNone')}</option>
            </AdminFormSelect>
          </AdminFormField>
          <AdminFormField label={t('admin.samsars.commissionValue')}>
            <AdminFormInput
              type="number"
              min="0"
              inputMode="decimal"
              value={form.commissionValue ?? 0}
              onChange={(e) => patchForm({ commissionValue: e.target.value })}
            />
          </AdminFormField>
        </AdminFormGrid>
      </AdminFormSection>

      <AdminFormField label={t('admin.samsars.notes')}>
        <AdminFormTextarea
          value={form.notes || ''}
          onChange={(e) => patchForm({ notes: e.target.value })}
        />
      </AdminFormField>
    </>
  )
}

const Samsars = () => {
  const { t } = useI18n()

  return (
    <OwnerDirectoryPage
      title={t('admin.samsars.title')}
      subtitle={t('admin.samsars.subtitle')}
      endpoint="/api/owner/samsars"
      emptyLabel={t('admin.samsars.empty')}
      emptyDescription={t('admin.samsars.emptyHint')}
      initialForm={INITIAL_FORM}
      FormComponent={SamsarForm}
      columns={[
        { key: 'fullName', label: t('admin.samsars.colName') },
        { key: 'phone', label: t('admin.samsars.colPhone') },
        {
          key: 'commission',
          label: t('admin.samsars.colCommission'),
          render: (i) =>
            i.commissionType === 'none'
              ? '—'
              : i.commissionType === 'percent'
                ? `${i.commissionValue}%`
                : `${i.commissionValue}`,
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

export default Samsars
