import React from 'react'
import OwnerDirectoryPage, { StatusBadge } from '../../components/owner/OwnerDirectoryPage'
import {
  AdminFormSection,
  AdminFormField,
  AdminFormInput,
  AdminFormTextarea,
  AdminFormSelect,
  AdminFormGrid,
  AdminFormCheckbox,
} from '../../components/owner/ui'
import { useI18n } from '../../i18n/I18nContext'

const INITIAL_FORM = {
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
}

const discountLabel = (item, t) => {
  const d = item.discount
  if (!d?.enabled || !(Number(d.value) > 0)) return t('admin.partners.discountNone')
  if (d.type === 'percentage') return `${d.value}%`
  if (d.type === 'fixed_per_day') return `${d.value} / ${t('admin.partners.perDay')}`
  return String(d.value)
}

function PartnerCompanyForm({ form, patchForm }) {
  const { t } = useI18n()
  const discount = form.discount || INITIAL_FORM.discount

  const patchDiscount = (patch) =>
    patchForm((prev) => ({
      ...prev,
      discount: { ...(prev.discount || INITIAL_FORM.discount), ...patch },
    }))

  return (
    <>
      <AdminFormSection>
        <AdminFormField label={t('admin.partners.companyName')} required>
          <AdminFormInput
            value={form.companyName || ''}
            onChange={(e) => patchForm({ companyName: e.target.value })}
          />
        </AdminFormField>
        <AdminFormField label={t('admin.partners.legalName')}>
          <AdminFormInput
            value={form.legalName || ''}
            onChange={(e) => patchForm({ legalName: e.target.value })}
          />
        </AdminFormField>
        <AdminFormField label={t('admin.partners.contactPerson')}>
          <AdminFormInput
            value={form.contactPerson || ''}
            onChange={(e) => patchForm({ contactPerson: e.target.value })}
            autoComplete="name"
          />
        </AdminFormField>
        <AdminFormField label={t('admin.partners.phone')}>
          <AdminFormInput
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone || ''}
            onChange={(e) => patchForm({ phone: e.target.value })}
          />
        </AdminFormField>
        <AdminFormField label={t('admin.partners.email')}>
          <AdminFormInput
            type="email"
            inputMode="email"
            autoComplete="email"
            value={form.email || ''}
            onChange={(e) => patchForm({ email: e.target.value })}
          />
        </AdminFormField>
        <AdminFormField label={t('admin.partners.address')}>
          <AdminFormInput
            value={form.address || ''}
            onChange={(e) => patchForm({ address: e.target.value })}
            autoComplete="street-address"
          />
        </AdminFormField>
        <AdminFormGrid columns={2}>
          <AdminFormField label={t('admin.partners.city')}>
            <AdminFormInput
              value={form.city || ''}
              onChange={(e) => patchForm({ city: e.target.value })}
              autoComplete="address-level2"
            />
          </AdminFormField>
          <AdminFormField label={t('admin.partners.country')}>
            <AdminFormInput
              value={form.country || ''}
              onChange={(e) => patchForm({ country: e.target.value })}
              autoComplete="country-name"
            />
          </AdminFormField>
        </AdminFormGrid>
        <AdminFormGrid columns={2}>
          <AdminFormField label={t('admin.partners.taxId')}>
            <AdminFormInput
              value={form.taxId || ''}
              onChange={(e) => patchForm({ taxId: e.target.value })}
            />
          </AdminFormField>
          <AdminFormField label={t('admin.partners.registration')}>
            <AdminFormInput
              value={form.registrationNumber || ''}
              onChange={(e) => patchForm({ registrationNumber: e.target.value })}
            />
          </AdminFormField>
        </AdminFormGrid>
      </AdminFormSection>

      <AdminFormSection
        title={t('admin.partners.discountSection')}
        description={t('admin.partners.discountHint')}
        panel
      >
        <AdminFormCheckbox
          label={t('admin.partners.discountEnabled')}
          checked={Boolean(discount.enabled)}
          onChange={(e) => patchDiscount({ enabled: e.target.checked })}
        />
        <AdminFormGrid columns={2}>
          <AdminFormField label={t('admin.partners.colDiscount')}>
            <AdminFormSelect
              value={discount.type || 'percentage'}
              onChange={(e) => patchDiscount({ type: e.target.value })}
              disabled={!discount.enabled}
            >
              <option value="percentage">{t('admin.partners.discountPercentage')}</option>
              <option value="fixed_per_day">{t('admin.partners.discountFixedPerDay')}</option>
              <option value="fixed">{t('admin.partners.discountFixed')}</option>
            </AdminFormSelect>
          </AdminFormField>
          <AdminFormField label={t('admin.partners.discountValue')}>
            <AdminFormInput
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={discount.value ?? 0}
              onChange={(e) => patchDiscount({ value: e.target.value })}
              disabled={!discount.enabled}
            />
          </AdminFormField>
        </AdminFormGrid>
        <AdminFormGrid columns={2}>
          <AdminFormField label={t('admin.partners.discountStart')}>
            <AdminFormInput
              type="date"
              value={discount.startDate ? String(discount.startDate).slice(0, 10) : ''}
              onChange={(e) => patchDiscount({ startDate: e.target.value })}
              disabled={!discount.enabled}
            />
          </AdminFormField>
          <AdminFormField label={t('admin.partners.discountEnd')}>
            <AdminFormInput
              type="date"
              value={discount.endDate ? String(discount.endDate).slice(0, 10) : ''}
              onChange={(e) => patchDiscount({ endDate: e.target.value })}
              disabled={!discount.enabled}
            />
          </AdminFormField>
        </AdminFormGrid>
        <AdminFormField label={t('admin.partners.discountNotes')}>
          <AdminFormTextarea
            rows={2}
            value={discount.notes || ''}
            onChange={(e) => patchDiscount({ notes: e.target.value })}
            disabled={!discount.enabled}
          />
        </AdminFormField>
      </AdminFormSection>

      <AdminFormField label={t('admin.partners.notes')}>
        <AdminFormTextarea
          value={form.notes || ''}
          onChange={(e) => patchForm({ notes: e.target.value })}
        />
      </AdminFormField>
    </>
  )
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
      initialForm={INITIAL_FORM}
      FormComponent={PartnerCompanyForm}
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
    />
  )
}

export default PartnerCompanies
