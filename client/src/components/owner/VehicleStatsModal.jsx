import React from 'react'
import VehicleStatsDrawer from './VehicleStatsDrawer'
import { rangeForPeriod } from './ui/PeriodRangeFilter'

const VehicleStatsModal = ({ car, isOpen, onClose }) => {
  const range = rangeForPeriod('month')
  return (
    <VehicleStatsDrawer
      vehicle={car}
      open={isOpen}
      onClose={onClose}
      period="month"
      from={range.from}
      to={range.to}
    />
  )
}

export default VehicleStatsModal
