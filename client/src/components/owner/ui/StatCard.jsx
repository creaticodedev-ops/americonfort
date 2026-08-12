import React from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './adminIcons'

const toneClass = {
  default: '',
  success: 'admin-stat--success',
  warning: 'admin-stat--warning',
  danger: 'admin-stat--danger',
  info: 'admin-stat--info',
}

export const StatCard = ({
  label,
  value,
  hint,
  delta,
  deltaLabel,
  tone = 'default',
  spark,
  onClick,
  to,
}) => {
  const deltaPositive = typeof delta === 'number' ? delta >= 0 : null
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="admin-stat-label">{label}</p>
        {Array.isArray(spark) && spark.length > 1 ? (
          <MiniSpark values={spark} tone={tone} />
        ) : null}
      </div>
      <p className="admin-stat-value tabular-nums">{value}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        {typeof delta === 'number' ? (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
              deltaPositive ? 'text-[var(--admin-success)]' : 'text-[var(--admin-danger)]'
            }`}
          >
            <Icon name={deltaPositive ? 'trend-up' : 'trend-down'} className="h-3 w-3" />
            {Math.abs(delta).toFixed(1)}%
            {deltaLabel ? <span className="text-[var(--admin-fg-muted)] font-normal"> {deltaLabel}</span> : null}
          </span>
        ) : null}
        {hint ? <p className="text-[11px] text-[var(--admin-fg-muted)] leading-snug">{hint}</p> : null}
      </div>
    </>
  )

  const cls = `admin-stat ${toneClass[tone] || ''} ${onClick || to ? 'admin-stat--interactive' : ''}`

  if (to) {
    return (
      <Link to={to} className={cls} onClick={onClick}>
        {inner}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick}>
        {inner}
      </button>
    )
  }

  return <div className={cls}>{inner}</div>
}

const MiniSpark = ({ values, tone }) => {
  const max = Math.max(1, ...values)
  const min = Math.min(...values)
  const range = Math.max(1, max - min)
  const w = 56
  const h = 22
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - ((v - min) / range) * (h - 2) - 1
      return `${x},${y}`
    })
    .join(' ')
  const stroke =
    tone === 'danger'
      ? 'var(--admin-danger)'
      : tone === 'success'
        ? 'var(--admin-success)'
        : 'var(--admin-accent)'

  return (
    <svg width={w} height={h} className="shrink-0 opacity-80" aria-hidden="true">
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" points={pts} />
    </svg>
  )
}

export default StatCard
