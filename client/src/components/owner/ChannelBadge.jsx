import React from 'react'

/** Online / Walk-in / WhatsApp badge — used across bookings, calendar, CRM */
const ChannelBadge = ({ channel, className = '' }) => {
  const c = channel || 'online'
  const normalized = c === 'whatsapp' ? 'online' : c
  const styles =
    normalized === 'walk_in'
      ? 'bg-amber-100 text-amber-800 border border-amber-200'
      : 'bg-sky-100 text-sky-800 border border-sky-200'
  const label = normalized === 'walk_in' ? 'Walk-in' : 'Online'

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded ${styles} ${className}`}
    >
      {label}
    </span>
  )
}

export default ChannelBadge
