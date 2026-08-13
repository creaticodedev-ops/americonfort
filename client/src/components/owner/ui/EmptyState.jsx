import React from 'react'
import { Icon } from './adminIcons'
import { useI18n } from '../../../i18n/I18nContext'

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
  title,
  description,
  onRetry,
  className = '',
}) => {
  const { t } = useI18n()
  return (
  <div className={`admin-empty ${className}`}>
    <div className="admin-empty-icon admin-empty-icon--danger" aria-hidden="true">
      <Icon name="alert" className="h-5 w-5" />
    </div>
    <h3 className="admin-empty-title">{title || t('admin.leftover.somethingWrong')}</h3>
    {description ? <p className="admin-empty-desc">{description}</p> : null}
    {onRetry ? (
      <button type="button" className="admin-btn admin-btn--secondary mt-4" onClick={onRetry}>
        {t('admin.leftover.tryAgain')}
      </button>
    ) : null}
  </div>
  )
}

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
