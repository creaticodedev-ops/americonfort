import React, { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import StatusBadge from '../../../components/owner/StatusBadge'
import DataTable from '../../../components/owner/DataTable'
import Pagination from '../../../components/owner/Pagination'
import {
  AdminPage,
  PageHeader,
  FilterBar,
  AdminModal,
} from '../../../components/owner/ui'
import { useAppContext } from '../../../context/AppContext'
import { useI18n } from '../../../i18n/I18nContext'
import { getErrorMessage } from '../../../utils/apiError'

const field =
  'h-9 px-3 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] text-sm text-[var(--admin-fg)]'

const input = 'w-full h-10 px-3 rounded-lg border border-borderColor text-sm'

/** Shared accounting list shell */
const AccountingListPage = ({
  title,
  subtitle,
  listUrl,
  createUrl,
  columns,
  buildCreateForm,
  initialForm,
}) => {
  const { axios, currency } = useAppContext()
  const { t } = useI18n()
  const cur = (currency || 'MAD ').trim()
  const [items, setItems] = useState([])
  const [totals, setTotals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ pages: 1, total: 0 })
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', period: 'custom' })
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const { data } = await axios.get(`${listUrl}?${params}`)
      if (data.success) {
        setItems(data.items || [])
        setPagination(data.pagination || { pages: 1, total: 0 })
        setTotals(data.totals || null)
      } else toast.error(data.message || t('admin.lists.failed'))
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [axios, listUrl, page, from, to, t])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    setSaving(true)
    try {
      const { data } = await axios.post(createUrl, form)
      if (!data.success) throw new Error(data.message)
      toast.success(t('admin.lists.saved'))
      setModal(false)
      setForm(initialForm)
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const tableColumns = columns.map((c) => ({
    key: c.key,
    label: c.label,
    render: c.render ? (row) => c.render(row, cur) : undefined,
  }))

  return (
    <AdminPage>
      <PageHeader
        title={title}
        description={subtitle}
        breadcrumbs={[
          { label: t('admin.lists.finance'), to: '/owner/accounting' },
          { label: title },
        ]}
        actions={
          createUrl ? (
            <button type="button" className="admin-btn admin-btn--primary" onClick={() => setModal(true)}>
              {t('admin.lists.add')}
            </button>
          ) : null
        }
      />

      <FilterBar>
        <input
          type="date"
          className={field}
          value={from}
          onChange={(e) => {
            setPage(1)
            setFrom(e.target.value)
          }}
          title={t('admin.lists.fromDate')}
          aria-label={t('admin.lists.fromDate')}
        />
        <input
          type="date"
          className={field}
          value={to}
          onChange={(e) => {
            setPage(1)
            setTo(e.target.value)
          }}
          aria-label={t('admin.lists.toDate')}
        />
      </FilterBar>

      {totals && (
        <p className="text-sm text-[var(--admin-fg-secondary)] mb-3">
          {t('admin.lists.total')}:{' '}
          <strong className="text-[var(--admin-fg)] tabular-nums">
            {cur}
            {Number(totals.grossRevenue ?? totals.total ?? 0).toLocaleString()}
          </strong>
          {totals.paidRevenue != null && (
            <>
              {' '}
              · {t('admin.lists.paid')}: {cur}
              {Number(totals.paidRevenue).toLocaleString()}
            </>
          )}
          {totals.unpaidRevenue != null && (
            <>
              {' '}
              · {t('admin.lists.unpaid')}: {cur}
              {Number(totals.unpaidRevenue).toLocaleString()}
            </>
          )}
        </p>
      )}

      <DataTable
        columns={tableColumns}
        data={items}
        loading={loading}
        emptyMessage={t('admin.lists.empty')}
        emptyDescription={t('admin.lists.emptyHint')}
      />

      <Pagination
        page={page}
        totalPages={pagination.pages}
        total={pagination.total || items.length}
        limit={20}
        onPageChange={setPage}
      />

      <AdminModal
        open={Boolean(modal && buildCreateForm)}
        onClose={() => setModal(false)}
        title={t('admin.lists.addRecord')}
        footer={
          <>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setModal(false)}>
              {t('admin.common.cancel')}
            </button>
            <button type="button" disabled={saving} className="admin-btn admin-btn--primary" onClick={save}>
              {saving ? t('admin.common.saving') : t('admin.common.save')}
            </button>
          </>
        }
      >
        <div className="space-y-3">{buildCreateForm?.(form, setForm)}</div>
      </AdminModal>
    </AdminPage>
  )
}

export const RevenuesPage = () => {
  const { t } = useI18n()
  return (
    <AccountingListPage
      title={t('admin.lists.revenuesTitle')}
      subtitle={t('admin.lists.revenuesSubtitle')}
      listUrl="/api/owner/accounting/revenues"
      createUrl={null}
      initialForm={{}}
      columns={[
        { key: 'reservationId', label: t('admin.lists.reservation'), render: (i) => i.reservationId || '—' },
        { key: 'customerName', label: t('admin.lists.customer') },
        { key: 'car', label: t('admin.lists.vehicle'), render: (i) => (i.car ? `${i.car.brand} ${i.car.model}` : '—') },
        { key: 'price', label: t('admin.lists.amount'), render: (i, cur) => `${cur}${i.price}` },
        { key: 'paymentStatus', label: t('admin.lists.payment'), render: (i) => <StatusBadge status={i.paymentStatus} /> },
        { key: 'createdAt', label: t('admin.lists.date'), render: (i) => new Date(i.createdAt).toLocaleDateString() },
      ]}
    />
  )
}

export const SamsarPaymentsPage = () => {
  const { axios } = useAppContext()
  const { t } = useI18n()
  const [samsars, setSamsars] = useState([])
  useEffect(() => {
    axios.get('/api/owner/samsars?limit=100&status=active').then(({ data }) => {
      if (data.success) setSamsars(data.items || [])
    }).catch(() => {})
  }, [axios])

  return (
    <AccountingListPage
      title={t('admin.lists.samsarTitle')}
      subtitle={t('admin.lists.samsarSubtitle')}
      listUrl="/api/owner/accounting/samsar-payments"
      createUrl="/api/owner/accounting/samsar-payments"
      initialForm={{ samsarId: '', amount: '', paymentDate: new Date().toISOString().slice(0, 10), paymentStatus: 'paid', paymentMethod: 'cash', notes: '', bookingId: '' }}
      columns={[
        { key: 'samsar', label: t('admin.lists.samsar'), render: (i) => i.samsar?.fullName || '—' },
        { key: 'amount', label: t('admin.lists.amount'), render: (i, cur) => `${cur}${i.amount}` },
        { key: 'paymentDate', label: t('admin.lists.date'), render: (i) => new Date(i.paymentDate).toLocaleDateString() },
        { key: 'paymentStatus', label: t('admin.lists.status'), render: (i) => <StatusBadge status={i.paymentStatus} /> },
        { key: 'booking', label: t('admin.lists.reservation'), render: (i) => i.booking?.reservationId || '—' },
      ]}
      buildCreateForm={(form, setForm) => (
        <>
          <select className={input} value={form.samsarId} onChange={(e) => setForm({ ...form, samsarId: e.target.value })}>
            <option value="">{t('admin.lists.selectSamsar')}</option>
            {samsars.map((s) => <option key={s._id} value={s._id}>{s.fullName}</option>)}
          </select>
          <input className={input} type="number" min="0" step="0.01" placeholder={t('admin.lists.amountPh')} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input className={input} type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
          <select className={input} value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
            <option value="pending">{t('admin.status.pending')}</option>
            <option value="paid">{t('admin.status.paid')}</option>
            <option value="cancelled">{t('admin.status.cancelled')}</option>
          </select>
          <select className={input} value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
            <option value="cash">{t('admin.lists.cash')}</option>
            <option value="bank_transfer">{t('admin.lists.bankTransfer')}</option>
            <option value="check">{t('admin.lists.check')}</option>
            <option value="other">{t('admin.lists.other')}</option>
          </select>
          <input className={input} placeholder={t('admin.lists.bookingId')} value={form.bookingId} onChange={(e) => setForm({ ...form, bookingId: e.target.value })} />
          <textarea className="w-full min-h-[70px] px-3 py-2 rounded-lg border text-sm" placeholder={t('admin.lists.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </>
      )}
    />
  )
}

export const AgencyExpensesPage = () => {
  const { t } = useI18n()
  return (
    <AccountingListPage
      title={t('admin.lists.agencyTitle')}
      subtitle={t('admin.lists.agencySubtitle')}
      listUrl="/api/owner/accounting/agency-expenses"
      createUrl="/api/owner/accounting/agency-expenses"
      initialForm={{ category: 'other', amount: '', expenseDate: new Date().toISOString().slice(0, 10), description: '', paymentStatus: 'paid', paymentMethod: 'cash', notes: '' }}
      columns={[
        { key: 'category', label: t('admin.lists.category'), render: (i) => t(`admin.cats.${i.category}`) !== `admin.cats.${i.category}` ? t(`admin.cats.${i.category}`) : i.category },
        { key: 'description', label: t('admin.lists.description') },
        { key: 'amount', label: t('admin.lists.amount'), render: (i, cur) => `${cur}${i.amount}` },
        { key: 'expenseDate', label: t('admin.lists.date'), render: (i) => new Date(i.expenseDate).toLocaleDateString() },
        { key: 'paymentStatus', label: t('admin.lists.status'), render: (i) => <StatusBadge status={i.paymentStatus} /> },
      ]}
      buildCreateForm={(form, setForm) => (
        <>
          <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {['rent', 'utilities', 'salaries', 'marketing', 'insurance', 'taxes', 'supplies', 'software', 'other'].map((c) => (
              <option key={c} value={c}>{t(`admin.cats.${c}`)}</option>
            ))}
          </select>
          <input className={input} type="number" min="0" step="0.01" placeholder={t('admin.lists.amountPh')} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input className={input} type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
          <input className={input} placeholder={t('admin.lists.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className={input} value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
            <option value="pending">{t('admin.status.pending')}</option>
            <option value="paid">{t('admin.status.paid')}</option>
            <option value="cancelled">{t('admin.status.cancelled')}</option>
          </select>
          <textarea className="w-full min-h-[70px] px-3 py-2 rounded-lg border text-sm" placeholder={t('admin.lists.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </>
      )}
    />
  )
}

export const VehicleExpensesPage = () => {
  const { axios } = useAppContext()
  const { t } = useI18n()
  const [cars, setCars] = useState([])
  useEffect(() => {
    axios.get('/api/owner/cars').then(({ data }) => {
      const list = data.cars || data.items || []
      setCars(list)
    }).catch(() => {})
  }, [axios])

  return (
    <AccountingListPage
      title={t('admin.lists.vehicleTitle')}
      subtitle={t('admin.lists.vehicleSubtitle')}
      listUrl="/api/owner/accounting/vehicle-expenses"
      createUrl="/api/owner/accounting/vehicle-expenses"
      initialForm={{ carId: '', category: 'fuel', amount: '', expenseDate: new Date().toISOString().slice(0, 10), description: '', paymentStatus: 'paid', paymentMethod: 'cash', odometer: '', notes: '' }}
      columns={[
        { key: 'car', label: t('admin.lists.vehicle'), render: (i) => (i.car ? `${i.car.brand} ${i.car.model}` : '—') },
        { key: 'category', label: t('admin.lists.category'), render: (i) => t(`admin.cats.${i.category}`) !== `admin.cats.${i.category}` ? t(`admin.cats.${i.category}`) : i.category },
        { key: 'amount', label: t('admin.lists.amount'), render: (i, cur) => `${cur}${i.amount}` },
        { key: 'odometer', label: t('admin.lists.odometer'), render: (i) => (i.odometer != null ? `${i.odometer} km` : '—') },
        { key: 'expenseDate', label: t('admin.lists.date'), render: (i) => new Date(i.expenseDate).toLocaleDateString() },
        { key: 'paymentStatus', label: t('admin.lists.status'), render: (i) => <StatusBadge status={i.paymentStatus} /> },
      ]}
      buildCreateForm={(form, setForm) => (
        <>
          <select className={input} value={form.carId} onChange={(e) => setForm({ ...form, carId: e.target.value })}>
            <option value="">{t('admin.lists.selectVehicle')}</option>
            {cars.map((c) => (
              <option key={c._id} value={c._id}>{c.brand} {c.model} {c.licensePlate || ''}</option>
            ))}
          </select>
          <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {['fuel', 'maintenance', 'repair', 'insurance', 'registration', 'tires', 'cleaning', 'parking', 'tolls', 'other'].map((c) => (
              <option key={c} value={c}>{t(`admin.cats.${c}`)}</option>
            ))}
          </select>
          <input className={input} type="number" min="0" step="0.01" placeholder={t('admin.lists.amountPh')} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input className={input} type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
          <input className={input} type="number" min="0" placeholder={t('admin.lists.odometerPh')} value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} />
          <input className={input} placeholder={t('admin.lists.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className={input} value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
            <option value="pending">{t('admin.status.pending')}</option>
            <option value="paid">{t('admin.status.paid')}</option>
            <option value="cancelled">{t('admin.status.cancelled')}</option>
          </select>
          <textarea className="w-full min-h-[70px] px-3 py-2 rounded-lg border text-sm" placeholder={t('admin.lists.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </>
      )}
    />
  )
}

export default AccountingListPage
