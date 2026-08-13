import React from 'react'
import { useI18n } from '../../i18n/I18nContext'

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
 * Status badge with translated label (never color-only).
 */
const StatusBadge = ({ status, label, className = '' }) => {
  const { t } = useI18n()
  const key = String(status || '').toLowerCase()
  const translated = key ? t(`admin.status.${key}`) : ''
  const text = label || (translated && translated !== `admin.status.${key}` ? translated : status) || '—'
  const tone = toneFromStatus(status)
  return (
    <span className={`admin-badge admin-badge--${tone} ${className}`}>
      {text}
    </span>
  )
}

export default StatusBadge
