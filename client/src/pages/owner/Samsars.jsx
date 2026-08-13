import React from 'react'
import OwnerDirectoryPage, { StatusBadge } from '../../components/owner/OwnerDirectoryPage'
import { useI18n } from '../../i18n/I18nContext'

const field =
  'w-full h-10 px-3 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] text-sm text-[var(--admin-fg)]'

const Samsars = () => {
  const { t } = useI18n()

  return (
    <OwnerDirectoryPage
      title={t('admin.samsars.title')}
      subtitle={t('admin.samsars.subtitle')}
      endpoint="/api/owner/samsars"
      emptyLabel={t('admin.samsars.empty')}
      emptyDescription={t('admin.samsars.emptyHint')}
      initialForm={{
        fullName: '',
        phone: '',
        email: '',
        address: '',
        commissionType: 'percent',
        commissionValue: 10,
        notes: '',
        status: 'active',
      }}
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
      buildForm={(form, setForm) => (
        <>
          <input
            className={field}
            placeholder={`${t('admin.samsars.fullName')} *`}
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
          <input
            className={field}
            placeholder={t('admin.samsars.phone')}
            value={form.phone || ''}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            className={field}
            placeholder={t('admin.samsars.email')}
            value={form.email || ''}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className={field}
            placeholder={t('admin.samsars.address')}
            value={form.address || ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className={field}
              value={form.commissionType}
              onChange={(e) => setForm({ ...form, commissionType: e.target.value })}
            >
              <option value="percent">{t('admin.samsars.commissionPercent')}</option>
              <option value="fixed">{t('admin.samsars.commissionFixed')}</option>
              <option value="none">{t('admin.samsars.commissionNone')}</option>
            </select>
            <input
              className={field}
              type="number"
              min="0"
              placeholder={t('admin.samsars.commissionValue')}
              value={form.commissionValue ?? 0}
              onChange={(e) => setForm({ ...form, commissionValue: e.target.value })}
            />
          </div>
          <textarea
            className="w-full min-h-[80px] px-3 py-2 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] text-sm"
            placeholder={t('admin.samsars.notes')}
            value={form.notes || ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </>
      )}
    />
  )
}

export default Samsars
