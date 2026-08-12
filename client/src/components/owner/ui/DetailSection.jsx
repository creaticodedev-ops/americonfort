import React from 'react'

/** Section block for reservation / vehicle detail panels */
export const DetailSection = ({ title, children, className = '', actions }) => (
  <section className={`admin-detail-section ${className}`}>
    <div className="admin-detail-section-head">
      <h3 className="admin-detail-section-title">{title}</h3>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
    <div className="admin-detail-section-body">{children}</div>
  </section>
)

export const DetailRow = ({ label, children }) => (
  <div className="admin-detail-row">
    <dt>{label}</dt>
    <dd>{children ?? '—'}</dd>
  </div>
)

export default DetailSection
