import React, { useState } from 'react'

/** Section block for reservation / vehicle detail panels */
export const DetailSection = ({
  title,
  children,
  className = '',
  actions,
  collapsible = false,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
}) => {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const isControlled = typeof openProp === 'boolean'
  const open = isControlled ? openProp : uncontrolled
  const setOpen = (next) => {
    if (!isControlled) setUncontrolled(next)
    onOpenChange?.(next)
  }

  const heading = collapsible ? (
    <button
      type="button"
      className="admin-detail-section-toggle"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
    >
      <h3 className="admin-detail-section-title">{title}</h3>
      <svg className={`admin-detail-section-chevron${open ? ' is-open' : ''}`} viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  ) : (
    <h3 className="admin-detail-section-title">{title}</h3>
  )

  return (
    <section className={`admin-detail-section${collapsible ? ' is-collapsible' : ''}${open ? ' is-open' : ''} ${className}`.trim()}>
      <div className="admin-detail-section-head">
        {heading}
        {actions && open ? <div className="admin-detail-section-actions">{actions}</div> : null}
      </div>
      {(!collapsible || open) && <div className="admin-detail-section-body">{children}</div>}
    </section>
  )
}

export const DetailRow = ({ label, children }) => (
  <div className="admin-detail-row">
    <dt>{label}</dt>
    <dd>{children ?? '—'}</dd>
  </div>
)

export default DetailSection
