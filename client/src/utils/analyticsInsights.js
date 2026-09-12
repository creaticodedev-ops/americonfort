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

  if (typeof c.monthVsPrev === 'number' && (analytics.monthlyRevenue > 0 || analytics.prevMonthlyRevenue > 0)) {
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
  if (topCat && topCat.revenue > 0 && (analytics.byCategory?.length || 0) > 1) {
    const share = analytics.totalRevenue > 0
      ? Math.round((topCat.revenue / analytics.totalRevenue) * 1000) / 10
      : null
    if (share != null && share > 0) {
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

  if (outstanding.count > 0 && outstanding.balanceDue > 0) {
    insights.push({
      id: 'outstanding',
      tone: 'warn',
      text: t('admin.analytics.insightOutstanding', {
        count: outstanding.count,
        amount: money(outstanding.balanceDue, currency),
      }),
    })
  }

  const util = fleet?.kpis?.fleetUtilization
  if (typeof util === 'number' && (fleet?.kpis?.vehicles || 0) > 0) {
    insights.push({
      id: 'utilization',
      tone: util < 25 ? 'warn' : util >= 55 ? 'positive' : 'neutral',
      text: t('admin.analytics.insightUtilization', {
        pct: Number(util).toFixed(1),
        period: fleet?.period?.label || 'month',
      }),
    })
  }

  const under = (fleet?.vehicles || []).filter((v) => v.performance === 'under').slice(0, 1)
  if (under[0]) {
    insights.push({
      id: 'underperform',
      tone: 'warn',
      text: t('admin.analytics.insightUnderperform', {
        vehicle: vehicleName(under[0]),
      }),
    })
  }

  return insights.slice(0, 6)
}

export default buildAnalyticsInsights
