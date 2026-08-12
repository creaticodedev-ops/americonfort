import React from 'react'
import { Icon } from './adminIcons'

export const SegmentedControl = ({ options, value, onChange, className = '', ariaLabel }) => (
  <div
    className={`admin-segment ${className}`}
    role="tablist"
    aria-label={ariaLabel || 'Period'}
  >
    {options.map((opt) => {
      const active = value === opt.id
      return (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={active}
          className={`admin-segment-item ${active ? 'is-active' : ''}`}
          onClick={() => onChange?.(opt.id)}
        >
          {opt.label}
        </button>
      )
    })}
  </div>
)

export const FilterBar = ({ children, className = '' }) => (
  <div className={`admin-filter-bar ${className}`}>{children}</div>
)

export const SearchInput = ({ value, onChange, placeholder = 'Search…', className = '' }) => (
  <label className={`admin-search ${className}`}>
    <Icon name="search" className="h-4 w-4 text-[var(--admin-fg-muted)] shrink-0" />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className="admin-search-input"
    />
  </label>
)

export const ChartCard = ({ title, action, children, className = '' }) => (
  <section className={`admin-panel ${className}`}>
    <div className="admin-panel-header">
      <h2 className="admin-panel-title">{title}</h2>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
    <div className="admin-panel-body">{children}</div>
  </section>
)

export default SegmentedControl
