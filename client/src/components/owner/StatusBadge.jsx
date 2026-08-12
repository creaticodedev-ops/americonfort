import React from 'react'

const toneFromStatus = (status) => {
  const s = String(status || '').toLowerCase()
  if (['pending'].includes(s)) return 'pending'
  if (['confirmed', 'paid', 'active', 'signed', 'success'].includes(s)) return s === 'confirmed' || s === 'paid' || s === 'signed' ? s : 'active'
  if (['ready_for_pickup'].includes(s)) return 'ready_for_pickup'
  if (['completed'].includes(s)) return 'completed'
  if (['cancelled', 'failed', 'danger'].includes(s)) return s === 'cancelled' || s === 'failed' ? s : 'danger'
  if (['expired', 'inactive', 'none', 'refunded', 'maintenance'].includes(s)) return s === 'maintenance' ? 'pending' : s
  return 'none'
}

/**
 * Status badge with dot indicator — never color-only (includes text label).
 */
const StatusBadge = ({ status, label, className = '' }) => {
  const tone = toneFromStatus(status)
  const text = label || status || '—'
  return (
    <span className={`admin-badge admin-badge--${tone} ${className}`}>
      {text}
    </span>
  )
}

export default StatusBadge
