import React from 'react'
import { AnalyticsPeriodBar } from './AnalyticsPeriodBar'

export { rangeForPeriod, isoDateFromValue } from './periodRangeUtils'
export { formatAnalyticsDate, AnalyticsPeriodBar } from './AnalyticsPeriodBar'

/**
 * Fleet / page-level period filter — premium analytics bar.
 * Presets apply immediately; custom unlocks From/To date faces.
 */
export const PeriodRangeFilter = ({
  period = 'month',
  from,
  to,
  onChange,
  className = '',
}) => (
  <AnalyticsPeriodBar
    period={period}
    from={from}
    to={to}
    onChange={onChange}
    className={className}
  />
)

export default PeriodRangeFilter
