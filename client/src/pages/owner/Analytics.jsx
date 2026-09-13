import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import RevenueChart, { RankBars, ShareBars } from '../../components/owner/RevenueChart'
import StatusBadge from '../../components/owner/StatusBadge'
import {
  AdminPage,
  PageHeader,
  SegmentedControl,
  ErrorState,
  Skeleton,
  PeriodRangeFilter,
  rangeForPeriod,
} from '../../components/owner/ui'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'
import { downloadXlsxFromApi } from '../../utils/downloadXlsx'
import { buildAnalyticsInsights } from '../../utils/analyticsInsights'
import { formatAnalyticsDate } from '../../components/owner/ui/AnalyticsPeriodBar'
import '../../styles/analytics-dashboard.css'

const money = (value, currency) =>
  `${currency}${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

const Delta = ({ value, label, isNew, newLabel }) => {
  if (isNew) {
    return <span className="ax-kpi__delta is-new">{newLabel || 'New'}</span>
  }
  if (typeof value !== 'number') return null
  const flat = value === 0
  const up = value > 0
  return (
    <span className={`ax-kpi__delta ${flat ? 'is-flat' : up ? 'is-up' : 'is-down'}`}>
      {flat ? '→' : up ? '↑' : '↓'} {Math.abs(value).toFixed(1)}%
      {label ? <span className="ax-kpi__delta-label"> {label}</span> : null}
    </span>
  )
}

const KpiCard = ({
  label,
  value,
  currency,
  hint,
  emptyHint,
  delta,
  deltaLabel,
  prevValue,
  accent,
  warn,
  suffix = '',
  newLabel,
  className = '',
}) => {
  const numeric = Number(value) || 0
  const isZero = numeric === 0
  const prev = Number(prevValue)
  const isNew = isZero === false && prev === 0 && (delta === null || delta === undefined)
  const display = suffix
    ? `${Number(numeric).toLocaleString(undefined, { maximumFractionDigits: 1 })}${suffix}`
    : money(numeric, currency)
  return (
    <div
      className={`ax-kpi${accent ? ' ax-kpi--accent' : ''}${warn ? ' ax-kpi--warn' : ''}${
        isZero ? ' is-zero' : ''
      } ${className}`.trim()}
    >
      <span className="ax-kpi__label">{label}</span>
      <p className="ax-kpi__value">{display}</p>
      {delta !== undefined || isNew ? (
        <Delta value={delta} label={deltaLabel} isNew={isNew} newLabel={newLabel} />
      ) : null}
      {isZero && emptyHint ? (
        <p className="ax-kpi__empty">{emptyHint}</p>
      ) : hint ? (
        <p className="ax-kpi__hint">{hint}</p>
      ) : null}
    </div>
  )
}

const EmptyBlock = ({ title, hint }) => (
  <div className="ax-empty">
    <p className="ax-empty__title">{title}</p>
    {hint ? <p className="ax-empty__hint">{hint}</p> : null}
  </div>
)

const Analytics = () => {
  const { axios, currency, hasPermission } = useAppContext()
  const { t, language } = useI18n()
  const [analytics, setAnalytics] = useState(null)
  const [fleet, setFleet] = useState(null)
  const [tab, setTab] = useState('period')
  const [loading, setLoading] = useState(true)
  const [fleetLoading, setFleetLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const initialRange = rangeForPeriod('month')
  const [period, setPeriod] = useState('month')
  const [from, setFrom] = useState(initialRange.from)
  const [to, setTo] = useState(initialRange.to)

  useEffect(() => {
    if (!from || !to) return undefined
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get('/api/owner/analytics', {
          params: { period, from, to },
        })
        if (cancelled) return
        if (data.success) setAnalytics(data.analytics)
        else toast.error(data.message)
      } catch (error) {
        if (!cancelled) toast.error(getErrorMessage(error))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [axios, from, period, to])

  useEffect(() => {
    if (!from || !to) return undefined
    let cancelled = false
    const loadFleet = async () => {
      setFleetLoading(true)
      try {
        const { data } = await axios.get('/api/owner/vehicle-stats', {
          params: { period, from, to },
        })
        if (cancelled) return
        if (data.success) setFleet(data)
        else setFleet(null)
      } catch {
        if (!cancelled) setFleet(null)
      } finally {
        if (!cancelled) setFleetLoading(false)
      }
    }
    loadFleet()
    return () => {
      cancelled = true
    }
  }, [axios, from, period, to])

  const chartData = useMemo(() => {
    if (!analytics) return []
    if (tab === 'weekly') return analytics.weeklyTrend || []
    if (tab === 'yearly') return analytics.yearlyTrend || []
    if (tab === 'monthly') return analytics.monthlyTrend || []
    return analytics.periodTrend || analytics.monthlyTrend || []
  }, [analytics, tab])

  const insights = useMemo(
    () => buildAnalyticsInsights(analytics, fleet, t, currency),
    [analytics, fleet, t, currency],
  )

  const statusLabel = (id) => {
    const key = `admin.status.${id}`
    const translated = t(key)
    return !translated || translated === key ? String(id || '').replace(/_/g, ' ') : translated
  }

  const channelLabel = (id) => {
    if (id === 'walk_in') return t('admin.analytics.walkInRevenue')
    return t('admin.analytics.onlineRevenue')
  }

  const periodCaption = useMemo(() => {
    if (!from || !to) return ''
    return `${formatAnalyticsDate(from, language)} → ${formatAnalyticsDate(to, language)}`
  }, [from, to, language])

  const fleetRows = useMemo(() => {
    const rows = [...(fleet?.vehicles || [])]
    return rows
      .filter((r) => (r.revenue || 0) > 0 || (r.totalRentals || 0) > 0)
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, 12)
  }, [fleet])

  const attentionRows = useMemo(() => {
    const rows = (fleet?.vehicles || []).filter((r) => r.performance === 'under')
    return rows.slice(0, 5)
  }, [fleet])

  const exportExcel = async () => {
    setExporting(true)
    try {
      await downloadXlsxFromApi(axios, '/api/owner/analytics/export', {
        fallbackName: 'analytics.xlsx',
        params: { period, from, to },
      })
      toast.success(t('admin.exportUi.success'))
    } catch (error) {
      toast.error(getErrorMessage(error) || t('admin.exportUi.failed'))
    } finally {
      setExporting(false)
    }
  }

  const onPeriodChange = ({ period: nextPeriod, from: nextFrom, to: nextTo }) => {
    setPeriod(nextPeriod)
    setFrom(nextFrom)
    setTo(nextTo)
    setTab('period')
  }

  const periodRevenue = analytics?.periodRevenue ?? analytics?.period?.revenue ?? 0
  const periodRentals = analytics?.period?.rentals ?? analytics?.period?.bookingCount ?? 0
  const avgPerDay =
    fleet?.kpis?.rentalDays > 0
      ? Math.round((fleet.kpis.totalRevenue / fleet.kpis.rentalDays) * 100) / 100
      : null

  const zeroPeriodHint = t('admin.analytics.zeroPeriodHint', { range: periodCaption })
  const zeroWindowHint = t('admin.analytics.zeroWindowHint')

  return (
    <AdminPage className="ax-page">
      <PageHeader
        title={t('admin.analytics.title')}
        description={t('admin.analytics.subtitle')}
        actions={
          <button
            type="button"
            disabled={exporting || loading}
            onClick={exportExcel}
            className="admin-btn admin-btn--secondary"
          >
            {exporting ? t('admin.exportUi.exporting') : t('admin.exportUi.excel')}
          </button>
        }
      />

      <div className="ax-toolbar">
        <div className="ax-toolbar__grow">
          <PeriodRangeFilter
            period={period}
            from={from}
            to={to}
            onChange={onPeriodChange}
            compact
          />
        </div>
        <p className="ax-toolbar__hint">{t('admin.analytics.periodHint')}</p>
      </div>

      {loading ? (
        <div className="grid gap-3">
          <Skeleton className="ax-skel w-full" />
          <Skeleton className="ax-skel w-full" />
        </div>
      ) : !analytics ? (
        <ErrorState title={t('admin.shell.loadError')} onRetry={() => window.location.reload()} />
      ) : (
        <>
          <section className="ax-hero" aria-label={t('admin.analytics.periodRevenue')}>
            <div className="ax-hero__main">
              <p className="ax-hero__eyebrow">{t('admin.analytics.selectedPeriod')}</p>
              <h2 className="ax-hero__title">{periodCaption}</h2>
              <p className="ax-hero__value tabular-nums">{money(periodRevenue, currency)}</p>
              <div className="ax-hero__meta">
                <Delta
                  value={analytics.comparisons?.periodVsPrev}
                  label={t('admin.analytics.vsPrevPeriod')}
                  newLabel={t('admin.analytics.newVsPrior')}
                  isNew={
                    periodRevenue > 0 &&
                    (analytics.period?.prevRevenue || 0) === 0 &&
                    analytics.comparisons?.periodVsPrev == null
                  }
                />
                <span className="ax-hero__sep" aria-hidden>
                  ·
                </span>
                <span>
                  {t('admin.analytics.periodRentals', { count: periodRentals })}
                </span>
              </div>
              {periodRevenue === 0 ? (
                <p className="ax-hero__empty">{zeroPeriodHint}</p>
              ) : (
                <p className="ax-hero__sub">{t('admin.analytics.attributionHint')}</p>
              )}
            </div>

            <div className="ax-hero__side">
              <KpiCard
                label={t('admin.analytics.outstanding')}
                value={analytics.outstanding?.balanceDue || 0}
                currency={currency}
                warn={(analytics.outstanding?.count || 0) > 0}
                hint={t('admin.analytics.outstandingCount', {
                  count: analytics.outstanding?.count || 0,
                })}
                emptyHint={t('admin.analytics.zeroOutstanding')}
              />
              <KpiCard
                label={t('admin.analytics.fleetUtilization')}
                value={fleetLoading ? 0 : fleet?.kpis?.fleetUtilization || 0}
                currency=""
                suffix="%"
                hint={
                  fleetLoading
                    ? t('admin.analytics.loading')
                    : t('admin.analytics.rentalDaysHint', { days: fleet?.kpis?.rentalDays || 0 })
                }
                emptyHint={t('admin.analytics.zeroUtilization')}
              />
            </div>
          </section>

          <div className="ax-section-label">{t('admin.analytics.snapshotLabel')}</div>
          <div className="ax-kpis ax-kpis--snap">
            <KpiCard
              label={t('admin.analytics.today')}
              value={analytics.todayRevenue}
              currency={currency}
              accent
              delta={analytics.comparisons?.todayVsYesterday}
              deltaLabel={t('admin.analytics.vsYesterday')}
              newLabel={t('admin.analytics.newVsPrior')}
              prevValue={analytics.yesterdayRevenue}
              emptyHint={zeroWindowHint}
            />
            <KpiCard
              label={t('admin.analytics.thisWeek')}
              value={analytics.weeklyRevenue}
              currency={currency}
              delta={analytics.comparisons?.weekVsPrev}
              deltaLabel={t('admin.analytics.vsPrevWeek')}
              newLabel={t('admin.analytics.newVsPrior')}
              prevValue={analytics.prevWeeklyRevenue}
              emptyHint={zeroWindowHint}
            />
            <KpiCard
              label={t('admin.analytics.thisMonth')}
              value={analytics.monthlyRevenue}
              currency={currency}
              delta={analytics.comparisons?.monthVsPrev}
              deltaLabel={t('admin.analytics.vsPrevMonth')}
              newLabel={t('admin.analytics.newVsPrior')}
              prevValue={analytics.prevMonthlyRevenue}
              hint={t('admin.analytics.monthBookings', { count: analytics.monthBookingCount || 0 })}
              emptyHint={zeroWindowHint}
            />
            <KpiCard
              label={t('admin.analytics.thisYear')}
              value={analytics.yearlyRevenue}
              currency={currency}
              delta={analytics.comparisons?.yearVsPrev}
              deltaLabel={t('admin.analytics.vsPrevYear')}
              newLabel={t('admin.analytics.newVsPrior')}
              prevValue={analytics.prevYearlyRevenue}
              emptyHint={zeroWindowHint}
            />
          </div>

          <div className="ax-section-label">{t('admin.analytics.breakdownLabel')}</div>
          <div className="ax-kpis">
            <KpiCard
              label={t('admin.analytics.onlineRevenue')}
              value={analytics.onlineRevenue}
              currency={currency}
              hint={t('admin.analytics.channelBookings', {
                count: analytics.onlineBookingCount || 0,
              })}
              emptyHint={t('admin.analytics.zeroOnline')}
            />
            <KpiCard
              label={t('admin.analytics.walkInRevenue')}
              value={analytics.walkInRevenue}
              currency={currency}
              hint={t('admin.analytics.channelBookings', {
                count: analytics.walkInBookingCount || 0,
              })}
              emptyHint={t('admin.analytics.zeroWalkIn')}
            />
            <KpiCard
              label={t('admin.analytics.avgPerRental')}
              value={analytics.averageRevenuePerRental}
              currency={currency}
              hint={t('admin.analytics.periodRentals', { count: periodRentals })}
              emptyHint={zeroPeriodHint}
            />
            <KpiCard
              label={t('admin.analytics.avgPerDay')}
              value={avgPerDay || 0}
              currency={currency}
              hint={t('admin.analytics.avgPerDayHint')}
              emptyHint={zeroPeriodHint}
            />
            <KpiCard
              label={t('admin.analytics.allTime')}
              value={analytics.totalRevenue}
              currency={currency}
              hint={t('admin.analytics.paidOfTotal', {
                paid: analytics.paidBookingCount || 0,
                total: analytics.bookingCount || 0,
              })}
              emptyHint={t('admin.analytics.zeroLifetime')}
            />
            <KpiCard
              label={t('admin.analytics.amountCollected')}
              value={analytics.period?.amountPaid || 0}
              currency={currency}
              hint={t('admin.analytics.collectedHint')}
              emptyHint={t('admin.analytics.zeroCollected')}
            />
          </div>

          <div className="ax-grid ax-grid--main">
            <section className="ax-panel">
              <div className="ax-panel__head">
                <div>
                  <h2 className="ax-panel__title">{t('admin.analytics.incomeTrends')}</h2>
                  <p className="ax-panel__sub">{t('admin.analytics.trendHint')}</p>
                </div>
                <SegmentedControl
                  options={['period', 'weekly', 'monthly', 'yearly'].map((periodId) => ({
                    id: periodId,
                    label: t(`admin.analytics.${periodId === 'period' ? 'periodTab' : periodId}`),
                  }))}
                  value={tab}
                  onChange={setTab}
                  ariaLabel={t('admin.analytics.incomeTrends')}
                />
              </div>
              <div className="ax-panel__body">
                <RevenueChart
                  data={chartData}
                  currency={currency}
                  height={260}
                  emptyHint={
                    tab === 'period'
                      ? zeroPeriodHint
                      : t('admin.analytics.chartEmpty')
                  }
                />
              </div>
            </section>

            <section className="ax-panel">
              <div className="ax-panel__head">
                <div>
                  <h2 className="ax-panel__title">{t('admin.analytics.insights')}</h2>
                  <p className="ax-panel__sub">{t('admin.analytics.insightsHint')}</p>
                </div>
              </div>
              <div className="ax-panel__body">
                {insights.length === 0 ? (
                  <EmptyBlock
                    title={t('admin.analytics.insightsEmpty')}
                    hint={periodCaption}
                  />
                ) : (
                  <div className="ax-insights">
                    {insights.map((item) => (
                      <div key={item.id} className={`ax-insight ax-insight--${item.tone}`}>
                        <span className="ax-insight__dot" aria-hidden />
                        <p className="ax-insight__text">{item.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="ax-grid ax-grid--three">
            <section className="ax-panel">
              <div className="ax-panel__head">
                <h2 className="ax-panel__title">{t('admin.analytics.topVehicles')}</h2>
              </div>
              <div className="ax-panel__body">
                {(analytics.topVehicles || []).some((r) => r.revenue > 0) ? (
                  <RankBars
                    rows={analytics.topVehicles || []}
                    currency={currency}
                    labelFn={(row) => `${row.brand || ''} ${row.model || ''}`.trim() || '—'}
                  />
                ) : (
                  <EmptyBlock title={t('admin.analytics.noBreakdown')} hint={zeroPeriodHint} />
                )}
              </div>
            </section>

            <section className="ax-panel">
              <div className="ax-panel__head">
                <h2 className="ax-panel__title">{t('admin.analytics.byCategory')}</h2>
              </div>
              <div className="ax-panel__body">
                {(analytics.byCategory || []).some((r) => r.revenue > 0) ? (
                  <RankBars
                    rows={analytics.byCategory || []}
                    currency={currency}
                    labelFn={(row) => row.category || '—'}
                  />
                ) : (
                  <EmptyBlock title={t('admin.analytics.noBreakdown')} hint={zeroPeriodHint} />
                )}
              </div>
            </section>

            <section className="ax-panel">
              <div className="ax-panel__head">
                <h2 className="ax-panel__title">{t('admin.analytics.byChannel')}</h2>
              </div>
              <div className="ax-panel__body">
                {(analytics.byChannel || []).some((r) => (r.revenue || 0) > 0) ? (
                  <ShareBars
                    rows={(analytics.byChannel || []).map((row) => ({
                      ...row,
                      revenue: row.revenue || 0,
                    }))}
                    currency={currency}
                    labelFn={(row) => channelLabel(row._id)}
                  />
                ) : (
                  <EmptyBlock title={t('admin.analytics.noBreakdown')} hint={zeroPeriodHint} />
                )}
              </div>
            </section>
          </div>

          {(analytics.byLocation || []).length > 0 ? (
            <section className="ax-panel">
              <div className="ax-panel__head">
                <div>
                  <h2 className="ax-panel__title">{t('admin.analytics.byLocation')}</h2>
                  <p className="ax-panel__sub">{t('admin.analytics.byLocationHint')}</p>
                </div>
              </div>
              <div className="ax-panel__body">
                <RankBars
                  rows={analytics.byLocation}
                  currency={currency}
                  labelFn={(row) => row.location || '—'}
                  maxRows={8}
                />
              </div>
            </section>
          ) : null}

          <section className="ax-panel">
            <div className="ax-panel__head">
              <div>
                <h2 className="ax-panel__title">{t('admin.analytics.byStatus')}</h2>
                <p className="ax-panel__sub">{t('admin.analytics.byStatusHint')}</p>
              </div>
            </div>
            <div className="ax-panel__body">
              <div className="ax-status-grid">
                {(analytics.byStatus || []).map((row) => (
                  <div key={row._id} className={`ax-status${(row.revenue || 0) === 0 ? ' is-zero' : ''}`}>
                    <p className="ax-status__label">{statusLabel(row._id)}</p>
                    <p className="ax-status__count">{row.count}</p>
                    <p className="ax-status__rev">{money(row.revenue, currency)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="ax-panel">
            <div className="ax-panel__head">
              <div>
                <h2 className="ax-panel__title">{t('admin.analytics.fleetPerformance')}</h2>
                <p className="ax-panel__sub">{t('admin.analytics.fleetPerformanceHint')}</p>
              </div>
              {hasPermission?.('fleet') ? (
                <Link to="/owner/vehicle-stats" className="admin-btn admin-btn--secondary admin-btn--sm">
                  {t('admin.analytics.openVehicleStats')}
                </Link>
              ) : null}
            </div>
            <div className="ax-panel__body">
              {fleetLoading ? (
                <Skeleton className="h-40 w-full rounded-[var(--admin-radius-lg)]" />
              ) : fleetRows.length === 0 ? (
                <EmptyBlock title={t('admin.analytics.fleetEmpty')} hint={zeroPeriodHint} />
              ) : (
                <>
                  <div className="ax-table-wrap">
                    <table className="ax-table">
                      <thead>
                        <tr>
                          <th>{t('admin.analytics.colVehicle')}</th>
                          <th>{t('admin.analytics.colRentals')}</th>
                          <th>{t('admin.analytics.colDays')}</th>
                          <th>{t('admin.analytics.colRevenue')}</th>
                          <th>{t('admin.analytics.colUtil')}</th>
                          <th>{t('admin.analytics.colAvgDay')}</th>
                          <th>{t('admin.analytics.colStatus')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fleetRows.map((row) => {
                          const util = Number(row.utilization) || 0
                          const avgDay =
                            row.rentalDays > 0
                              ? Math.round((row.revenue / row.rentalDays) * 100) / 100
                              : 0
                          return (
                            <tr key={row._id}>
                              <td>
                                <div className="ax-table__vehicle">
                                  <span className="ax-table__name">
                                    {row.brand} {row.model}
                                  </span>
                                  <span className="ax-table__plate">
                                    {row.licensePlate || row.fleetId || row.category || ''}
                                  </span>
                                </div>
                              </td>
                              <td className="tabular-nums">{row.totalRentals || 0}</td>
                              <td className="tabular-nums">{row.rentalDays || 0}</td>
                              <td className="tabular-nums font-semibold text-[var(--admin-fg)]">
                                {money(row.revenue, currency)}
                              </td>
                              <td>
                                <div className="ax-util">
                                  <div className="ax-util__track">
                                    <div
                                      className="ax-util__fill"
                                      style={{ width: `${Math.min(100, util)}%` }}
                                    />
                                  </div>
                                  <span className="tabular-nums">{util.toFixed(0)}%</span>
                                </div>
                              </td>
                              <td className="tabular-nums">{money(avgDay, currency)}</td>
                              <td>
                                {row.performance === 'best' ? (
                                  <span className="ax-badge ax-badge--best">
                                    {t('admin.analytics.perfBest')}
                                  </span>
                                ) : row.performance === 'under' ? (
                                  <span className="ax-badge ax-badge--under">
                                    {t('admin.analytics.perfUnder')}
                                  </span>
                                ) : (
                                  <StatusBadge
                                    status={
                                      row.availability === 'rented'
                                        ? 'active'
                                        : row.availability === 'maintenance'
                                          ? 'maintenance'
                                          : row.availability === 'offline'
                                            ? 'inactive'
                                            : 'confirmed'
                                    }
                                  />
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {attentionRows.length > 0 ? (
                    <div className="ax-attention">
                      <p className="ax-attention__title">{t('admin.analytics.needsAttention')}</p>
                      <ul className="ax-attention__list">
                        {attentionRows.map((row) => (
                          <li key={row._id}>
                            {row.brand} {row.model}
                            <span className="ax-muted">
                              {' '}
                              · {money(row.revenue, currency)} · {Number(row.utilization || 0).toFixed(0)}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </section>
        </>
      )}
    </AdminPage>
  )
}

export default Analytics
