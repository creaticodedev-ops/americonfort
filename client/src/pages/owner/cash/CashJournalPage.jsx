import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import StatusBadge from '../../../components/owner/StatusBadge'
import DataTable from '../../../components/owner/DataTable'
import Pagination from '../../../components/owner/Pagination'
import {
  AdminPage,
  PageHeader,
  FilterBar,
  AdminModal,
  AdminForm,
  AdminFormField,
  AdminFormInput,
  AdminFormSelect,
  AdminFormTextarea,
  AdminFormGrid,
  StatCard,
  PeriodRangeFilter,
  rangeForPeriod,
  Skeleton,
} from '../../../components/owner/ui'
import { useAppContext } from '../../../context/AppContext'
import { useI18n } from '../../../i18n/I18nContext'
import { getErrorMessage } from '../../../utils/apiError'
import { downloadXlsxFromApi } from '../../../utils/downloadXlsx'
import {
  CASH_METHODS,
  DECAISSEMENT_TYPES,
  ENCAISSEMENT_TYPES,
  cashTypeLabel,
  formatMoney,
  formatWhen,
  methodLabel,
  newIdempotencyKey,
} from '../../../components/owner/cash/cashLabels'

const inputClass =
  'h-9 w-full min-w-0 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 text-sm text-[var(--admin-fg)] outline-none focus:shadow-[var(--admin-focus)]'

/**
 * Shared Encaissements / Décaissements journal page.
 * @param {'in'|'out'} direction
 */
const CashJournalPage = ({ direction }) => {
  const isIn = direction === 'in'
  const { axios, currency } = useAppContext()
  const { t } = useI18n()
  const cur = `${String(currency || 'MAD').trim()} `
  const [searchParams, setSearchParams] = useSearchParams()

  const initial = rangeForPeriod('month')
  const [period, setPeriod] = useState('month')
  const [from, setFrom] = useState(searchParams.get('from') || initial.from)
  const [to, setTo] = useState(searchParams.get('to') || initial.to)
  const [method, setMethod] = useState(searchParams.get('method') || 'all')
  const [cashType, setCashType] = useState(searchParams.get('cashType') || 'all')
  const [q, setQ] = useState(searchParams.get('q') || '')
  const [reservationId, setReservationId] = useState(searchParams.get('reservationId') || '')
  const [page, setPage] = useState(1)
  const [limit] = useState(25)

  const [overview, setOverview] = useState(null)
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [totals, setTotals] = useState({ count: 0, amount: 0 })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const [detailId, setDetailId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [recordOpen, setRecordOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    type: isIn ? 'payment' : 'refund',
    bookingId: '',
    amount: '',
    method: 'cash',
    reference: '',
    notes: '',
    description: '',
    category: 'other',
    carId: '',
    samsarId: '',
    allowOverpayment: false,
  })

  const typeOptions = isIn
    ? [
        { value: 'payment', label: t('admin.cash.types.customer_payment') },
        { value: 'deposit_hold', label: t('admin.cash.types.deposit_hold') },
      ]
    : [
        { value: 'refund', label: t('admin.cash.types.customer_refund') },
        { value: 'deposit_release', label: t('admin.cash.types.deposit_release') },
        { value: 'agency_expense', label: t('admin.cash.types.agency_expense') },
        { value: 'vehicle_expense', label: t('admin.cash.types.vehicle_expense') },
        { value: 'samsar_payment', label: t('admin.cash.types.samsar_payment') },
      ]

  const filterTypeOptions = isIn ? ENCAISSEMENT_TYPES : DECAISSEMENT_TYPES

  const syncUrl = useCallback(
    (next) => {
      const params = new URLSearchParams()
      if (next.from) params.set('from', next.from)
      if (next.to) params.set('to', next.to)
      if (next.method && next.method !== 'all') params.set('method', next.method)
      if (next.cashType && next.cashType !== 'all') params.set('cashType', next.cashType)
      if (next.q) params.set('q', next.q)
      if (next.reservationId) params.set('reservationId', next.reservationId)
      setSearchParams(params, { replace: true })
    },
    [setSearchParams],
  )

  const loadOverview = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const { data } = await axios.get(`/api/owner/accounting/cash/overview?${params}`)
      if (data.success) setOverview(data.overview)
    } catch {
      /* non-blocking */
    }
  }, [axios, from, to])

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (method && method !== 'all') params.set('method', method)
      if (cashType && cashType !== 'all') params.set('cashType', cashType)
      if (q.trim()) params.set('q', q.trim())
      if (reservationId.trim()) params.set('reservationId', reservationId.trim())

      const endpoint = isIn
        ? '/api/owner/accounting/cash/encaissements'
        : '/api/owner/accounting/cash/decaissements'
      const { data } = await axios.get(`${endpoint}?${params}`)
      if (data.success) {
        setItems(data.items || [])
        setPagination(data.pagination || { page: 1, pages: 1, total: 0 })
        setTotals(data.totals || { count: 0, amount: 0 })
      } else {
        toast.error(data.message || t('admin.cash.loadFailed'))
      }
    } catch (e) {
      toast.error(getErrorMessage(e) || t('admin.cash.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [axios, cashType, from, isIn, limit, method, page, q, reservationId, t, to])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    syncUrl({ from, to, method, cashType, q, reservationId })
  }, [from, to, method, cashType, q, reservationId, syncUrl])

  const onPeriodChange = ({ period: nextPeriod, from: nextFrom, to: nextTo }) => {
    setPeriod(nextPeriod)
    if (nextPeriod !== 'custom') {
      const range = rangeForPeriod(nextPeriod)
      setFrom(range.from)
      setTo(range.to)
    } else {
      if (nextFrom) setFrom(nextFrom)
      if (nextTo) setTo(nextTo)
    }
    setPage(1)
  }

  const openDetail = async (row) => {
    setDetailId(row.id)
    setDetail(null)
    setDetailLoading(true)
    try {
      const { data } = await axios.get(
        `/api/owner/accounting/cash/transactions/${encodeURIComponent(row.id)}`,
      )
      if (data.success) setDetail(data)
      else toast.error(data.message || t('admin.cash.loadFailed'))
    } catch (e) {
      toast.error(getErrorMessage(e))
      setDetailId(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const voidTxn = async () => {
    if (!detailId || !String(detailId).startsWith('ledger:')) return
    if (!window.confirm(t('admin.cash.voidConfirm'))) return
    setBusy(true)
    try {
      const { data } = await axios.post(
        `/api/owner/accounting/cash/transactions/${encodeURIComponent(detailId)}/void`,
        { reason: 'void_from_cash_module' },
      )
      if (data.success) {
        toast.success(t('admin.cash.voidOk'))
        setDetailId(null)
        setDetail(null)
        loadList()
        loadOverview()
      } else toast.error(data.message || t('admin.cash.voidFail'))
    } catch (e) {
      toast.error(getErrorMessage(e) || t('admin.cash.voidFail'))
    } finally {
      setBusy(false)
    }
  }

  const submitRecord = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const endpoint = isIn
        ? '/api/owner/accounting/cash/encaissements'
        : '/api/owner/accounting/cash/decaissements'
      const body = {
        type: form.type,
        amount: Number(form.amount),
        method: form.method,
        reference: form.reference,
        notes: form.notes,
        description: form.description,
        category: form.category,
        bookingId: form.bookingId || undefined,
        carId: form.carId || undefined,
        samsarId: form.samsarId || undefined,
        allowOverpayment: form.allowOverpayment,
        idempotencyKey: newIdempotencyKey(),
      }
      const { data } = await axios.post(endpoint, body)
      if (data.success) {
        toast.success(t('admin.cash.recordOk'))
        setRecordOpen(false)
        setForm((f) => ({ ...f, amount: '', reference: '', notes: '', description: '', bookingId: '' }))
        loadList()
        loadOverview()
      } else toast.error(data.message || t('admin.cash.recordFail'))
    } catch (err) {
      toast.error(getErrorMessage(err) || t('admin.cash.recordFail'))
    } finally {
      setBusy(false)
    }
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      await downloadXlsxFromApi(axios, '/api/owner/accounting/export', {
        params: {
          kind: isIn ? 'encaissements' : 'decaissements',
          period: period === 'custom' ? 'custom' : period,
          from,
          to,
          method: method !== 'all' ? method : undefined,
          cashType: cashType !== 'all' ? cashType : undefined,
          q: q || undefined,
          reservationId: reservationId || undefined,
        },
        fallbackName: isIn ? 'encaissements.xlsx' : 'decaissements.xlsx',
      })
      toast.success(t('admin.exportUi.success'))
    } catch (e) {
      toast.error(getErrorMessage(e) || t('admin.exportUi.failed'))
    } finally {
      setExporting(false)
    }
  }

  const k = overview?.kpis || {}
  const money = (n) => formatMoney(cur, n)

  const columns = useMemo(
    () => [
      {
        key: 'occurredAt',
        label: t('admin.cash.colWhen'),
        render: (row) => formatWhen(row.occurredAt),
      },
      {
        key: 'cashType',
        label: t('admin.cash.colType'),
        render: (row) => cashTypeLabel(t, row.cashType),
      },
      {
        key: 'party',
        label: isIn ? t('admin.cash.colCustomer') : t('admin.cash.colBeneficiary'),
        render: (row) => row.customerName || row.beneficiary || '—',
      },
      {
        key: 'reservation',
        label: t('admin.cash.colReservation'),
        render: (row) => row.booking?.reservationId || '—',
      },
      {
        key: 'method',
        label: t('admin.cash.colMethod'),
        render: (row) => methodLabel(t, row.method),
      },
      {
        key: 'amount',
        label: t('admin.cash.colAmount'),
        className: 'text-end',
        render: (row) => (
          <span className="tabular-nums font-medium">{money(row.amount)}</span>
        ),
      },
      {
        key: 'status',
        label: t('admin.cash.colStatus'),
        render: (row) => <StatusBadge status={row.status || 'posted'} />,
      },
    ],
    [isIn, t, cur],
  )

  const needsBooking = ['payment', 'deposit_hold', 'refund', 'deposit_release'].includes(form.type)

  return (
    <AdminPage>
      <PageHeader
        title={isIn ? t('admin.cash.encaissementsTitle') : t('admin.cash.decaissementsTitle')}
        description={
          isIn ? t('admin.cash.encaissementsSubtitle') : t('admin.cash.decaissementsSubtitle')
        }
        breadcrumbs={[
          { label: t('admin.accounting.finance'), to: '/owner/accounting' },
          { label: isIn ? t('admin.menu.encaissements') : t('admin.menu.decaissements') },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              disabled={exporting || loading}
              onClick={exportExcel}
            >
              {exporting ? t('admin.exportUi.exporting') : t('admin.exportUi.excel')}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => setRecordOpen(true)}
            >
              {isIn ? t('admin.cash.recordIn') : t('admin.cash.recordOut')}
            </button>
          </div>
        }
      />

      <div className="mb-4">
        <PeriodRangeFilter
          period={period}
          from={from}
          to={to}
          onChange={onPeriodChange}
          compact
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {loading && !overview ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-[var(--admin-radius-lg)]" />
          ))
        ) : (
          <>
            <StatCard label={t('admin.cash.kpiTodayIn')} value={money(k.todayIn)} tone="success" />
            <StatCard label={t('admin.cash.kpiTodayOut')} value={money(k.todayOut)} />
            <StatCard
              label={t('admin.cash.kpiNet')}
              value={money(k.todayNet)}
              tone={Number(k.todayNet) >= 0 ? 'success' : 'danger'}
            />
            <StatCard
              label={t('admin.cash.kpiOutstanding')}
              value={money(k.outstandingBalance)}
              hint={t('admin.cash.kpiOutstandingHint', { count: k.outstandingCount || 0 })}
            />
            <StatCard
              label={t('admin.cash.kpiDeposits')}
              value={money(k.depositsHeld)}
              hint={t('admin.cash.kpiDepositsHint', { count: k.depositsHeldCount || 0 })}
            />
            <StatCard label={t('admin.cash.kpiRefunds')} value={money(k.refunds)} />
          </>
        )}
      </div>

      <FilterBar>
        <div className="flex min-w-[10rem] flex-col gap-1">
          <label className="text-[11px] font-medium text-[var(--admin-fg-muted)]">
            {t('admin.cash.colMethod')}
          </label>
          <select
            className={inputClass}
            value={method}
            onChange={(e) => {
              setMethod(e.target.value)
              setPage(1)
            }}
          >
            <option value="all">{t('admin.cash.allMethods')}</option>
            {CASH_METHODS.map((m) => (
              <option key={m} value={m}>
                {methodLabel(t, m)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[10rem] flex-col gap-1">
          <label className="text-[11px] font-medium text-[var(--admin-fg-muted)]">
            {t('admin.cash.colType')}
          </label>
          <select
            className={inputClass}
            value={cashType}
            onChange={(e) => {
              setCashType(e.target.value)
              setPage(1)
            }}
          >
            <option value="all">{t('admin.cash.allTypes')}</option>
            {filterTypeOptions.map((ct) => (
              <option key={ct} value={ct}>
                {cashTypeLabel(t, ct)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[10rem] flex-col gap-1">
          <label className="text-[11px] font-medium text-[var(--admin-fg-muted)]">
            {t('admin.cash.colReservation')}
          </label>
          <input
            className={inputClass}
            value={reservationId}
            placeholder={t('admin.cash.reservationPlaceholder')}
            onChange={(e) => {
              setReservationId(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
          <label className="text-[11px] font-medium text-[var(--admin-fg-muted)]">
            {t('admin.cash.search')}
          </label>
          <input
            className={inputClass}
            value={q}
            placeholder={t('admin.cash.searchPlaceholder')}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </FilterBar>

      <p className="mb-2 text-xs text-[var(--admin-fg-muted)]">
        {t('admin.cash.listSummary', {
          count: totals.count || 0,
          amount: money(totals.amount),
        })}
      </p>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        emptyMessage={t('admin.cash.emptyTitle')}
        emptyDescription={t('admin.cash.emptyHint')}
        onRowClick={openDetail}
      />

      <Pagination
        page={pagination.page || page}
        totalPages={pagination.pages || 1}
        total={pagination.total || 0}
        limit={limit}
        onPageChange={setPage}
      />

      <AdminModal
        open={Boolean(detailId)}
        onClose={() => {
          setDetailId(null)
          setDetail(null)
        }}
        title={t('admin.cash.detailTitle')}
        variant="drawer"
        footer={
          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {detail?.transaction?.booking?.reservationId ? (
                <>
                  <Link
                    className="admin-btn admin-btn--secondary admin-btn--sm"
                    to={`/owner/encaissements?reservationId=${encodeURIComponent(
                      detail.transaction.booking.reservationId,
                    )}`}
                  >
                    {t('admin.cash.viewInEncaissements')}
                  </Link>
                  <Link
                    className="admin-btn admin-btn--secondary admin-btn--sm"
                    to={`/owner/decaissements?reservationId=${encodeURIComponent(
                      detail.transaction.booking.reservationId,
                    )}`}
                  >
                    {t('admin.cash.viewInDecaissements')}
                  </Link>
                </>
              ) : null}
            </div>
            {detailId?.startsWith('ledger:') && detail?.transaction?.status === 'posted' ? (
              <button
                type="button"
                className="admin-btn admin-btn--danger admin-btn--sm"
                disabled={busy}
                onClick={voidTxn}
              >
                {t('admin.cash.void')}
              </button>
            ) : null}
          </div>
        }
      >
        {detailLoading || !detail?.transaction ? (
          <p className="text-sm text-[var(--admin-fg-muted)]">{t('admin.common.loading')}</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[11px] uppercase text-[var(--admin-fg-muted)]">
                  {t('admin.cash.colAmount')}
                </p>
                <p className="text-lg font-semibold tabular-nums">
                  {money(detail.transaction.amount)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-[var(--admin-fg-muted)]">
                  {t('admin.cash.colType')}
                </p>
                <p>{cashTypeLabel(t, detail.transaction.cashType)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-[var(--admin-fg-muted)]">
                  {t('admin.cash.colWhen')}
                </p>
                <p>{formatWhen(detail.transaction.occurredAt)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-[var(--admin-fg-muted)]">
                  {t('admin.cash.colMethod')}
                </p>
                <p>{methodLabel(t, detail.transaction.method)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-[var(--admin-fg-muted)]">
                  {t('admin.cash.colCustomer')}
                </p>
                <p>{detail.transaction.customerName || detail.transaction.beneficiary || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-[var(--admin-fg-muted)]">
                  {t('admin.cash.colReservation')}
                </p>
                <p>{detail.transaction.booking?.reservationId || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] uppercase text-[var(--admin-fg-muted)]">
                  {t('admin.cash.colReference')}
                </p>
                <p>{detail.transaction.reference || '—'}</p>
              </div>
              {detail.transaction.notes ? (
                <div className="col-span-2">
                  <p className="text-[11px] uppercase text-[var(--admin-fg-muted)]">
                    {t('admin.bookingMoney.notes')}
                  </p>
                  <p>{detail.transaction.notes}</p>
                </div>
              ) : null}
            </div>

            {Array.isArray(detail.related) && detail.related.length > 0 ? (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase text-[var(--admin-fg-muted)]">
                  {t('admin.cash.relatedEntries')}
                </p>
                <ul className="space-y-1.5">
                  {detail.related.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-2 rounded-[var(--admin-radius)] border border-[var(--admin-border)] px-2.5 py-1.5 text-xs"
                    >
                      <span>
                        {formatWhen(r.occurredAt)} · {cashTypeLabel(t, r.cashType)}
                      </span>
                      <span className="tabular-nums font-medium">{money(r.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        title={isIn ? t('admin.cash.recordIn') : t('admin.cash.recordOut')}
        variant="drawer"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setRecordOpen(false)}>
              {t('admin.common.cancel')}
            </button>
            <button type="submit" form="cash-record-form" className="admin-btn admin-btn--primary" disabled={busy}>
              {busy ? t('admin.common.saving') : t('admin.common.save')}
            </button>
          </div>
        }
      >
        <AdminForm id="cash-record-form" onSubmit={submitRecord}>
          <AdminFormGrid>
            <AdminFormField label={t('admin.cash.colType')}>
              <AdminFormSelect
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                {typeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </AdminFormSelect>
            </AdminFormField>
            <AdminFormField label={t('admin.bookingMoney.amount')} required>
              <AdminFormInput
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </AdminFormField>
            <AdminFormField label={t('admin.cash.colMethod')}>
              <AdminFormSelect
                value={form.method}
                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
              >
                {CASH_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {methodLabel(t, m)}
                  </option>
                ))}
              </AdminFormSelect>
            </AdminFormField>
            {needsBooking ? (
              <AdminFormField label={t('admin.cash.bookingId')} required>
                <AdminFormInput
                  required
                  value={form.bookingId}
                  placeholder={t('admin.cash.bookingIdPlaceholder')}
                  onChange={(e) => setForm((f) => ({ ...f, bookingId: e.target.value }))}
                />
              </AdminFormField>
            ) : null}
            {form.type === 'vehicle_expense' ? (
              <AdminFormField label={t('admin.cash.carId')} required>
                <AdminFormInput
                  required
                  value={form.carId}
                  onChange={(e) => setForm((f) => ({ ...f, carId: e.target.value }))}
                />
              </AdminFormField>
            ) : null}
            {form.type === 'samsar_payment' ? (
              <AdminFormField label={t('admin.cash.samsarId')} required>
                <AdminFormInput
                  required
                  value={form.samsarId}
                  onChange={(e) => setForm((f) => ({ ...f, samsarId: e.target.value }))}
                />
              </AdminFormField>
            ) : null}
            {['agency_expense', 'vehicle_expense'].includes(form.type) ? (
              <AdminFormField label={t('admin.cash.description')}>
                <AdminFormInput
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </AdminFormField>
            ) : null}
            <AdminFormField label={t('admin.bookingMoney.reference')}>
              <AdminFormInput
                value={form.reference}
                onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              />
            </AdminFormField>
            <AdminFormField label={t('admin.bookingMoney.notes')} className="sm:col-span-2">
              <AdminFormTextarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </AdminFormField>
            {form.type === 'payment' ? (
              <label className="sm:col-span-2 flex items-center gap-2 text-xs text-[var(--admin-fg-secondary)]">
                <input
                  type="checkbox"
                  checked={form.allowOverpayment}
                  onChange={(e) => setForm((f) => ({ ...f, allowOverpayment: e.target.checked }))}
                />
                {t('admin.bookingMoney.allowOverpayment')}
              </label>
            ) : null}
          </AdminFormGrid>
        </AdminForm>
      </AdminModal>
    </AdminPage>
  )
}

export default CashJournalPage
