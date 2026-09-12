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
import '../../styles/analytics-dashboard.css'

const money = (value, currency) =>
  `${currency}${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

const Delta = ({ value, label }) => {
  if (typeof value !== 'number') return null
  const flat = value === 0
  const up = value > 0
  return (
    <span className={`ax-kpi__delta ${flat ? 'is-flat' : up ? 'is-up' : 'is-down'}`}>
      {flat ? '→' : up ? '↑' : '↓'} {Math.abs(value).toFixed(1)}%
      {label ? <span style={{ fontWeight: 500, opacity: 0.85 }}> {label}</span> : null}
    </span>
  )
}

const Analytics = () => {
  const { axios, currency, hasPermission } = useAppContext()
  const { t } = useI18n()
  const [analytics, setAnalytics] = useState(null)
  const [fleet, setFleet] = useState(null)
  const [tab, setTab] = useState('monthly')
  const [loading, setLoading] = useState(true)
  const [fleetLoading, setFleetLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const initialRange = rangeForPeriod('month')
  const [period, setPeriod] = useState('month')
  const [from, setFrom] = useState(initialRange.from)
  const [to, setTo] = useState(initialRange.to)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get('/api/owner/analytics')
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
  }, [axios])

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
    return analytics.monthlyTrend || []
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
  }

  const avgPerDay =
    fleet?.kpis?.rentalDays > 0
      ? Math.round((fleet.kpis.totalRevenue / fleet.kpis.rentalDays) * 100) / 100
      : null

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
        <p className="text-xs text-[var(--admin-fg-muted)] max-w-sm leading-snug">
          {t('admin.analytics.periodHint')}
        </p>
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
          <div className="ax-kpis">
            <div className="ax-kpi ax-kpi--accent">
              <span className="ax-kpi__label">{t('admin.analytics.today')}</span>
              <p className="ax-kpi__value">{money(analytics.todayRevenue, currency)}</p>
              <Delta value={analytics.comparisons?.todayVsYesterday} label={t('admin.analytics.vsYesterday')} />
            </div>
            <div className="ax-kpi">
              <span className="ax-kpi__label">{t('admin.analytics.thisWeek')}</span>
              <p className="ax-kpi__value">{money(analytics.weeklyRevenue, currency)}</p>
              <Delta value={analytics.comparisons?.weekVsPrev} label={t('admin.analytics.vsPrevWeek')} />
            </div>
            <div className="ax-kpi">
              <span className="ax-kpi__label">{t('admin.analytics.thisMonth')}</span>
              <p className="ax-kpi__value">{money(analytics.monthlyRevenue, currency)}</p>
              <Delta value={analytics.comparisons?.monthVsPrev} label={t('admin.analytics.vsPrevMonth')} />
              <p className="ax-kpi__hint">
                {t('admin.analytics.monthBookings', { count: analytics.monthBookingCount || 0 })}
              </p>
            </div>
            <div className="ax-kpi">
              <span className="ax-kpi__label">{t('admin.analytics.thisYear')}</span>
              <p className="ax-kpi__value">{money(analytics.yearlyRevenue, currency)}</p>
              <Delta value={analytics.comparisons?.yearVsPrev} label={t('admin.analytics.vsPrevYear')} />
            </div>
            <div className="ax-kpi">
              <span className="ax-kpi__label">{t('admin.analytics.avgPerRental')}</span>
              <p className="ax-kpi__value">{money(analytics.averageRevenuePerRental, currency)}</p>
              <p className="ax-kpi__hint">
                {t('admin.analytics.bookingsAllTime', { count: analytics.bookingCount || 0 })}
              </p>
            </div>
            <div className={`ax-kpi${(analytics.outstanding?.count || 0) > 0 ? ' ax-kpi--warn' : ''}`}>
              <span className="ax-kpi__label">{t('admin.analytics.outstanding')}</span>
              <p className="ax-kpi__value">
                {money(analytics.outstanding?.balanceDue || 0, currency)}
              </p>
              <p className="ax-kpi__hint">
                {t('admin.analytics.outstandingCount', { count: analytics.outstanding?.count || 0 })}
              </p>
            </div>
          </div>

          <div className="ax-kpis">
            <div className="ax-kpi">
              <span className="ax-kpi__label">{t('admin.analytics.allTime')}</span>
              <p className="ax-kpi__value">{money(analytics.totalRevenue, currency)}</p>
              <p className="ax-kpi__hint">
                {t('admin.analytics.paidOfTotal', {
                  paid: analytics.paidBookingCount || 0,
                  total: analytics.bookingCount || 0,
                })}
              </p>
            </div>
            <div className="ax-kpi">
              <span className="ax-kpi__label">{t('admin.analytics.onlineRevenue')}</span>
              <p className="ax-kpi__value">{money(analytics.onlineRevenue, currency)}</p>
              <p className="ax-kpi__hint">
                {t('admin.analytics.channelBookings', { count: analytics.onlineBookingCount || 0 })}
              </p>
            </div>
            <div className="ax-kpi">
              <span className="ax-kpi__label">{t('admin.analytics.walkInRevenue')}</span>
              <p className="ax-kpi__value">{money(analytics.walkInRevenue, currency)}</p>
              <p className="ax-kpi__hint">
                {t('admin.analytics.channelBookings', { count: analytics.walkInBookingCount || 0 })}
              </p>
            </div>
            {!fleetLoading && fleet?.kpis ? (
              <>
                <div className="ax-kpi">
                  <span className="ax-kpi__label">{t('admin.analytics.fleetUtilization')}</span>
                  <p className="ax-kpi__value">{Number(fleet.kpis.fleetUtilization || 0).toFixed(1)}%</p>
                  <p className="ax-kpi__hint">
                    {t('admin.analytics.rentalDaysHint', { days: fleet.kpis.rentalDays || 0 })}
                  </p>
                </div>
                <div className="ax-kpi">
                  <span className="ax-kpi__label">{t('admin.analytics.periodRevenue')}</span>
                  <p className="ax-kpi__value">{money(fleet.kpis.totalRevenue, currency)}</p>
                  <p className="ax-kpi__hint">
                    {t('admin.analytics.periodRentals', { count: fleet.kpis.revenueRentals || 0 })}
                  </p>
                </div>
                <div className="ax-kpi">
                  <span className="ax-kpi__label">{t('admin.analytics.avgPerDay')}</span>
                  <p className="ax-kpi__value">
                    {avgPerDay != null ? money(avgPerDay, currency) : '—'}
                  </p>
                  <p className="ax-kpi__hint">{t('admin.analytics.avgPerDayHint')}</p>
                </div>
              </>
            ) : null}
          </div>

          <div className="ax-grid ax-grid--main">
            <section className="ax-panel">
              <div className="ax-panel__head">
                <div>
                  <h2 className="ax-panel__title">{t('admin.analytics.incomeTrends')}</h2>
                  <p className="ax-panel__sub">{t('admin.analytics.trendHint')}</p>
                </div>
                <SegmentedControl
                  options={['weekly', 'monthly', 'yearly'].map((periodId) => ({
                    id: periodId,
                    label: t(`admin.analytics.${periodId}`),
                  }))}
                  value={tab}
                  onChange={setTab}
                  ariaLabel={t('admin.analytics.incomeTrends')}
                />
              </div>
              <div className="ax-panel__body">
                <RevenueChart data={chartData} currency={currency} height={260} />
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
                  <p className="ax-muted">{t('admin.analytics.insightsEmpty')}</p>
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
                <RankBars
                  rows={analytics.topVehicles || []}
                  currency={currency}
                  labelFn={(row) => `${row.brand || ''} ${row.model || ''}`.trim() || '—'}
                />
              </div>
            </section>

            <section className="ax-panel">
              <div className="ax-panel__head">
                <h2 className="ax-panel__title">{t('admin.analytics.byCategory')}</h2>
              </div>
              <div className="ax-panel__body">
                <RankBars
                  rows={analytics.byCategory || []}
                  currency={currency}
                  labelFn={(row) => row.category || '—'}
                />
              </div>
            </section>

            <section className="ax-panel">
              <div className="ax-panel__head">
                <h2 className="ax-panel__title">{t('admin.analytics.byChannel')}</h2>
              </div>
              <div className="ax-panel__body">
                <ShareBars
                  rows={(analytics.byChannel || []).map((row) => ({
                    ...row,
                    revenue: row.revenue || 0,
                  }))}
                  currency={currency}
                  labelFn={(row) => channelLabel(row._id)}
                />
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
                  <div key={row._id} className="ax-status">
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
                <p className="ax-muted">{t('admin.analytics.fleetEmpty')}</p>
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
                                    className="admin-badge--compact"
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
                    <div style={{ marginTop: '1rem' }}>
                      <h3 className="ax-panel__title" style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                        {t('admin.analytics.needsAttention')}
                      </h3>
                      <RankBars
                        rows={attentionRows.map((r) => ({
                          ...r,
                          rentals: r.totalRentals,
                        }))}
                        currency={currency}
                        labelFn={(row) => `${row.brand || ''} ${row.model || ''}`.trim()}
                        maxRows={5}
                      />
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
