import React from 'react'
import OwnerDirectoryPage, { StatusBadge } from '../../components/owner/OwnerDirectoryPage'
import { useI18n } from '../../i18n/I18nContext'

const field =
  'w-full h-10 px-3 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] text-sm text-[var(--admin-fg)]'

const discountLabel = (item, t) => {
  const d = item.discount
  if (!d?.enabled || !(Number(d.value) > 0)) return t('admin.partners.discountNone')
  if (d.type === 'percentage') return `${d.value}%`
  if (d.type === 'fixed_per_day') return `${d.value} / ${t('admin.partners.perDay')}`
  return String(d.value)
}

const PartnerCompanies = () => {
  const { t } = useI18n()

  return (
    <OwnerDirectoryPage
      title={t('admin.partners.title')}
      subtitle={t('admin.partners.subtitle')}
      endpoint="/api/owner/partner-companies"
      nameField="companyName"
      emptyLabel={t('admin.partners.empty')}
      emptyDescription={t('admin.partners.emptyHint')}
      initialForm={{
        companyName: '',
        legalName: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        country: 'Morocco',
        taxId: '',
        registrationNumber: '',
        notes: '',
        status: 'active',
        discount: {
          enabled: false,
          type: 'percentage',
          value: 0,
          startDate: '',
          endDate: '',
          notes: '',
        },
      }}
      columns={[
        { key: 'companyName', label: t('admin.partners.colCompany') },
        { key: 'contactPerson', label: t('admin.partners.colContact') },
        { key: 'phone', label: t('admin.partners.colPhone') },
        {
          key: 'discount',
          label: t('admin.partners.colDiscount'),
          render: (i) => (
            <span className={i.discount?.enabled ? 'text-[var(--admin-accent)] font-medium' : 'text-[var(--admin-fg-muted)]'}>
              {discountLabel(i, t)}
            </span>
          ),
        },
        {
          key: 'status',
          label: t('admin.common.status'),
          render: (i) => <StatusBadge status={i.status} />,
        },
      ]}
      buildForm={(form, setForm) => {
        const discount = form.discount || {
          enabled: false,
          type: 'percentage',
          value: 0,
          startDate: '',
          endDate: '',
          notes: '',
        }
        const setDiscount = (patch) => setForm({ ...form, discount: { ...discount, ...patch } })

        return (
          <>
            <input
              className={field}
              placeholder={`${t('admin.partners.companyName')} *`}
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            />
            <input
              className={field}
              placeholder={t('admin.partners.legalName')}
              value={form.legalName || ''}
              onChange={(e) => setForm({ ...form, legalName: e.target.value })}
            />
            <input
              className={field}
              placeholder={t('admin.partners.contactPerson')}
              value={form.contactPerson || ''}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            />
            <input
              className={field}
              placeholder={t('admin.partners.phone')}
              value={form.phone || ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <input
              className={field}
              placeholder={t('admin.partners.email')}
              value={form.email || ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className={field}
              placeholder={t('admin.partners.address')}
              value={form.address || ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className={field}
                placeholder={t('admin.partners.city')}
                value={form.city || ''}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <input
                className={field}
                placeholder={t('admin.partners.country')}
                value={form.country || ''}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className={field}
                placeholder={t('admin.partners.taxId')}
                value={form.taxId || ''}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
              />
              <input
                className={field}
                placeholder={t('admin.partners.registration')}
                value={form.registrationNumber || ''}
                onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
              />
            </div>

            <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] p-3 space-y-2 bg-[var(--admin-surface-2)]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]">
                {t('admin.partners.discountSection')}
              </p>
              <p className="text-xs text-[var(--admin-fg-muted)]">{t('admin.partners.discountHint')}</p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(discount.enabled)}
                  onChange={(e) => setDiscount({ enabled: e.target.checked })}
                />
                {t('admin.partners.discountEnabled')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  className={field}
                  value={discount.type || 'percentage'}
                  onChange={(e) => setDiscount({ type: e.target.value })}
                  disabled={!discount.enabled}
                >
                  <option value="percentage">{t('admin.partners.discountPercentage')}</option>
                  <option value="fixed_per_day">{t('admin.partners.discountFixedPerDay')}</option>
                  <option value="fixed">{t('admin.partners.discountFixed')}</option>
                </select>
                <input
                  className={field}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t('admin.partners.discountValue')}
                  value={discount.value ?? 0}
                  onChange={(e) => setDiscount({ value: e.target.value })}
                  disabled={!discount.enabled}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-[var(--admin-fg-muted)]">
                  {t('admin.partners.discountStart')}
                  <input
                    className={`${field} mt-1`}
                    type="date"
                    value={discount.startDate ? String(discount.startDate).slice(0, 10) : ''}
                    onChange={(e) => setDiscount({ startDate: e.target.value })}
                    disabled={!discount.enabled}
                  />
                </label>
                <label className="text-xs text-[var(--admin-fg-muted)]">
                  {t('admin.partners.discountEnd')}
                  <input
                    className={`${field} mt-1`}
                    type="date"
                    value={discount.endDate ? String(discount.endDate).slice(0, 10) : ''}
                    onChange={(e) => setDiscount({ endDate: e.target.value })}
                    disabled={!discount.enabled}
                  />
                </label>
              </div>
              <textarea
                className="w-full min-h-[60px] px-3 py-2 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] text-sm"
                placeholder={t('admin.partners.discountNotes')}
                value={discount.notes || ''}
                onChange={(e) => setDiscount({ notes: e.target.value })}
                disabled={!discount.enabled}
              />
            </div>

            <textarea
              className="w-full min-h-[80px] px-3 py-2 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] text-sm"
              placeholder={t('admin.partners.notes')}
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </>
        )
      }}
    />
  )
}

export default PartnerCompanies
