/**
 * Derive human-readable business insights from real analytics + fleet payloads.
 * Never invents metrics — only emits insights when numbers are meaningful.
 */

const money = (n, currency) =>
  `${currency}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

const vehicleName = (v) => `${v?.brand || ''} ${v?.model || ''}`.trim() || '—'

/**
 * @param {object} analytics - /api/owner/analytics payload
 * @param {object|null} fleet - /api/owner/vehicle-stats payload
 * @param {(key: string, vars?: object) => string} t
 * @param {string} currency
 * @returns {{ id: string, tone: 'positive'|'negative'|'neutral'|'warn', text: string }[]}
 */
export function buildAnalyticsInsights(analytics, fleet, t, currency = '') {
  if (!analytics) return []
  const insights = []
  const c = analytics.comparisons || {}
  const outstanding = analytics.outstanding || {}
  const periodRevenue = Number(analytics.periodRevenue ?? analytics.period?.revenue) || 0
  const prevPeriod = Number(analytics.period?.prevRevenue) || 0

  if (typeof c.periodVsPrev === 'number' && (periodRevenue > 0 || prevPeriod > 0)) {
    const delta = c.periodVsPrev
    if (delta > 0) {
      insights.push({
        id: 'period-up',
        tone: 'positive',
        text: t('admin.analytics.insightPeriodUp', { pct: Math.abs(delta).toFixed(1) }),
      })
    } else if (delta < 0) {
      insights.push({
        id: 'period-down',
        tone: 'negative',
        text: t('admin.analytics.insightPeriodDown', { pct: Math.abs(delta).toFixed(1) }),
      })
    }
  } else if (typeof c.monthVsPrev === 'number' && (analytics.monthlyRevenue > 0 || analytics.prevMonthlyRevenue > 0)) {
    const delta = c.monthVsPrev
    if (delta > 0) {
      insights.push({
        id: 'month-up',
        tone: 'positive',
        text: t('admin.analytics.insightMonthUp', { pct: Math.abs(delta).toFixed(1) }),
      })
    } else if (delta < 0) {
      insights.push({
        id: 'month-down',
        tone: 'negative',
        text: t('admin.analytics.insightMonthDown', { pct: Math.abs(delta).toFixed(1) }),
      })
    }
  }

  const top = analytics.topVehicles?.[0]
  if (top && top.revenue > 0) {
    insights.push({
      id: 'top-vehicle',
      tone: 'neutral',
      text: t('admin.analytics.insightTopVehicle', {
        vehicle: vehicleName(top),
        amount: money(top.revenue, currency),
        rentals: top.rentals || 0,
      }),
    })
  }

  const topCat = analytics.byCategory?.[0]
  const denom = periodRevenue > 0 ? periodRevenue : Number(analytics.totalRevenue) || 0
  if (topCat && topCat.revenue > 0 && (analytics.byCategory?.length || 0) > 1 && denom > 0) {
    const share = Math.round((topCat.revenue / denom) * 1000) / 10
    if (share > 0) {
      insights.push({
        id: 'top-category',
        tone: 'neutral',
        text: t('admin.analytics.insightTopCategory', {
          category: topCat.category,
          pct: share.toFixed(1),
        }),
      })
    }
  }

  const online = Number(analytics.onlineRevenue) || 0
  const walkIn = Number(analytics.walkInRevenue) || 0
  const channelTotal = online + walkIn
  if (channelTotal > 0 && walkIn > online) {
    insights.push({
      id: 'walkin-lead',
      tone: 'neutral',
      text: t('admin.analytics.insightWalkInLead', {
        pct: ((walkIn / channelTotal) * 100).toFixed(1),
      }),
    })
  } else if (channelTotal > 0 && online > walkIn) {
    insights.push({
      id: 'online-lead',
      tone: 'neutral',
      text: t('admin.analytics.insightOnlineLead', {
        pct: ((online / channelTotal) * 100).toFixed(1),
      }),
    })
  }

  if ((outstanding.count || 0) > 0 && (outstanding.balanceDue || 0) > 0) {
    insights.push({
      id: 'outstanding',
      tone: 'warn',
      text: t('admin.analytics.insightOutstanding', {
        count: outstanding.count,
        amount: money(outstanding.balanceDue, currency),
      }),
    })
  }

  const util = Number(fleet?.kpis?.fleetUtilization)
  if (Number.isFinite(util)) {
    insights.push({
      id: 'utilization',
      tone: util < 20 ? 'warn' : 'neutral',
      text: t('admin.analytics.insightUtilization', { pct: util.toFixed(1) }),
    })
  }

  const under = (fleet?.vehicles || []).find((v) => v.performance === 'under' && (v.totalRentals || 0) === 0)
  if (under) {
    insights.push({
      id: 'under',
      tone: 'warn',
      text: t('admin.analytics.insightUnderperform', {
        vehicle: vehicleName(under),
      }),
    })
  }

  if (periodRevenue === 0) {
    insights.push({
      id: 'zero-period',
      tone: 'neutral',
      text: t('admin.analytics.insightZeroPeriod'),
    })
  }

  return insights.slice(0, 8)
}

export default buildAnalyticsInsights
