import React from 'react'
import { Icon } from './adminIcons'

export const EmptyState = ({
  icon = 'inbox',
  title,
  description,
  action,
  className = '',
}) => (
  <div className={`admin-empty ${className}`}>
    <div className="admin-empty-icon" aria-hidden="true">
      <Icon name={icon} className="h-5 w-5" />
    </div>
    <h3 className="admin-empty-title">{title}</h3>
    {description ? <p className="admin-empty-desc">{description}</p> : null}
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
)

export const ErrorState = ({
  title = 'Something went wrong',
  description,
  onRetry,
  className = '',
}) => (
  <div className={`admin-empty ${className}`}>
    <div className="admin-empty-icon admin-empty-icon--danger" aria-hidden="true">
      <Icon name="alert" className="h-5 w-5" />
    </div>
    <h3 className="admin-empty-title">{title}</h3>
    {description ? <p className="admin-empty-desc">{description}</p> : null}
    {onRetry ? (
      <button type="button" className="admin-btn admin-btn--secondary mt-4" onClick={onRetry}>
        Try again
      </button>
    ) : null}
  </div>
)

export const Skeleton = ({ className = '', style }) => (
  <div className={`admin-skeleton ${className}`} style={style} aria-hidden="true" />
)

export const SkeletonRows = ({ rows = 5, className = '' }) => (
  <div className={`space-y-2 ${className}`} aria-busy="true" aria-live="polite">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-10 w-full rounded-lg" />
    ))}
  </div>
)

export default EmptyState
