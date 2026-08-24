import React, { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import {
  AdminPage,
  PageHeader,
  StatCard,
  SegmentedControl,
  Skeleton,
} from '../../../components/owner/ui'
import { useAppContext } from '../../../context/AppContext'
import { useI18n } from '../../../i18n/I18nContext'
import { getErrorMessage } from '../../../utils/apiError'
import { downloadXlsxFromApi } from '../../../utils/downloadXlsx'

const AccountingOverview = () => {
  const { axios, currency } = useAppContext()
  const { t } = useI18n()
  const cur = `${String(currency || 'MAD').trim()} `
  const [period, setPeriod] = useState('month')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const periods = useMemo(
    () => [
      { id: 'today', label: t('admin.accounting.today') },
      { id: 'week', label: t('admin.accounting.thisWeek') },
      { id: 'month', label: t('admin.accounting.thisMonth') },
      { id: 'year', label: t('admin.accounting.thisYear') },
      { id: 'custom', label: t('admin.accounting.custom') },
    ],
    [t],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ period })
      if (period === 'custom') {
        if (from) params.set('from', from)
        if (to) params.set('to', to)
      }
      const { data } = await axios.get(`/api/owner/accounting/overview?${params}`)
      if (data.success) setOverview(data.overview)
      else toast.error(data.message || t('admin.accounting.loadFailed'))
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [axios, period, from, to, t])

  useEffect(() => {
    load()
  }, [load])

  const k = overview?.kpis || {}
  const money = (n) =>
    `${cur}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  const rangeLabel =
    overview?.from && overview?.to
      ? `${new Date(overview.from).toLocaleDateString()} – ${new Date(overview.to).toLocaleDateString()}`
      : ''

  const exportExcel = async () => {
    setExporting(true)
    try {
      const params = { kind: 'overview', period }
      if (period === 'custom') {
        if (from) params.from = from
        if (to) params.to = to
      }
      await downloadXlsxFromApi(axios, '/api/owner/accounting/export', {
        params,
        fallbackName: 'accounting-overview.xlsx',
      })
      toast.success(t('admin.exportUi.success'))
    } catch (e) {
      toast.error(getErrorMessage(e) || t('admin.exportUi.failed'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <AdminPage>
      <PageHeader
        title={t('admin.accounting.title')}
        description={t('admin.accounting.subtitle')}
        breadcrumbs={[
          { label: t('admin.accounting.finance'), to: '/owner/accounting' },
          { label: t('admin.accounting.overview') },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={exporting || loading} onClick={exportExcel} className="admin-btn admin-btn--secondary">
              {exporting ? t('admin.exportUi.exporting') : t('admin.exportUi.excel')}
            </button>
            <SegmentedControl options={periods} value={period} onChange={setPeriod} />
          </div>
        }
      />

      {period === 'custom' && (
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <input
            type="date"
            className="h-9 px-3 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span className="text-xs text-[var(--admin-fg-muted)]">{t('admin.accounting.to')}</span>
          <input
            type="date"
            className="h-9 px-3 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      )}

      {rangeLabel && (
        <p className="text-xs text-[var(--admin-fg-muted)] mb-4">
          {t('admin.accounting.periodLabel', {
            range: rangeLabel,
            count: overview?.breakdown?.revenue?.bookingCount || 0,
          })}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-[var(--admin-radius-lg)]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
            <StatCard label={t('admin.accounting.grossRevenue')} value={money(k.grossRevenue)} tone="success" />
            <StatCard
              label={t('admin.accounting.samsarPayments')}
              value={money(k.samsarPayments)}
              hint={t('admin.accounting.commissionsPaid')}
            />
            <StatCard label={t('admin.accounting.agencyExpenses')} value={money(k.agencyExpenses)} />
            <StatCard label={t('admin.accounting.vehicleExpenses')} value={money(k.vehicleExpenses)} />
            <StatCard
              label={t('admin.accounting.netResult')}
              value={money(k.netResult)}
              tone={Number(k.netResult) >= 0 ? 'success' : 'danger'}
              hint={t('admin.accounting.bottomLine')}
            />
          </div>

          {Number(k.partnerDiscountApplied) > 0 && (
            <div className="mb-4 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-4 py-3 text-sm">
              <p className="font-medium text-[var(--admin-fg)]">
                {t('admin.accounting.partnerDiscountApplied')}:{' '}
                <span className="tabular-nums">{money(k.partnerDiscountApplied)}</span>
              </p>
              <p className="text-xs text-[var(--admin-fg-muted)] mt-1">
                {t('admin.accounting.partnerDiscountHint')}
              </p>
            </div>
          )}

          <div className="admin-formula mb-6">
            <div className="admin-formula-row">
              <span>{t('admin.accounting.grossRevenue')}</span>
              <span className="tabular-nums text-[var(--admin-fg)]">{money(k.grossRevenue)}</span>
            </div>
            <div className="admin-formula-row">
              <span>
                <span className="admin-formula-op">−</span>
                {t('admin.accounting.samsarPayments')}
              </span>
              <span className="tabular-nums">{money(k.samsarPayments)}</span>
            </div>
            <div className="admin-formula-row">
              <span>
                <span className="admin-formula-op">−</span>
                {t('admin.accounting.agencyExpenses')}
              </span>
              <span className="tabular-nums">{money(k.agencyExpenses)}</span>
            </div>
            <div className="admin-formula-row">
              <span>
                <span className="admin-formula-op">−</span>
                {t('admin.accounting.vehicleExpenses')}
              </span>
              <span className="tabular-nums">{money(k.vehicleExpenses)}</span>
            </div>
            <div className="admin-formula-row admin-formula-total">
              <span>{t('admin.accounting.netResult')}</span>
              <span className="tabular-nums font-semibold">{money(k.netResult)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/owner/accounting/revenues" className="admin-btn admin-btn--secondary">
              {t('admin.menu.revenues')}
            </Link>
            <Link to="/owner/accounting/samsar-payments" className="admin-btn admin-btn--secondary">
              {t('admin.menu.samsarPayments')}
            </Link>
            <Link to="/owner/accounting/agency-expenses" className="admin-btn admin-btn--secondary">
              {t('admin.menu.agencyExpenses')}
            </Link>
            <Link to="/owner/accounting/vehicle-expenses" className="admin-btn admin-btn--secondary">
              {t('admin.menu.vehicleExpenses')}
            </Link>
          </div>
        </>
      )}
    </AdminPage>
  )
}

export default AccountingOverview
