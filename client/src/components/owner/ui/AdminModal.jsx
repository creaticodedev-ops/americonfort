import React, { useEffect, useId, useRef } from 'react'
import { Icon } from './adminIcons'
import { useI18n } from '../../../i18n/I18nContext'

export const AdminModal = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
}) => {
  const { t } = useI18n()
  const titleId = useId()
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const prev = document.activeElement
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('nav-open')
    panelRef.current?.focus?.()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('nav-open')
      if (prev && typeof prev.focus === 'function') prev.focus()
    }
  }, [open, onClose])

  if (!open) return null

  const width =
    size === 'lg' ? 'max-w-2xl' : size === 'xl' ? 'max-w-4xl' : size === 'sm' ? 'max-w-sm' : 'max-w-lg'

  return (
    <div className="admin-modal-root" role="presentation">
      <button
        type="button"
        className="admin-modal-backdrop"
        aria-label={t('admin.commonUi.closeDialog')}
        onClick={() => closeOnBackdrop && onClose?.()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`admin-modal-panel ${width}`}
      >
        <div className="admin-modal-header">
          <div className="min-w-0 pe-8">
            <h2 id={titleId} className="text-base font-semibold text-[var(--admin-fg)]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-[var(--admin-fg-secondary)]">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="admin-icon-btn absolute end-3 top-3"
            onClick={onClose}
            aria-label={t('admin.commonUi.close')}
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
        {footer ? <div className="admin-modal-footer">{footer}</div> : null}
      </div>
    </div>
  )
}

export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  variant = 'danger',
  loading = false,
}) => {
  const { t } = useI18n()
  return (
  <AdminModal
    open={isOpen}
    onClose={onCancel}
    title={title}
    description={message}
    size="sm"
    footer={
      <>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={onCancel} disabled={loading}>
          {cancelText || t('admin.common.cancel')}
        </button>
        <button
          type="button"
          className={`admin-btn ${variant === 'danger' ? 'admin-btn--danger' : 'admin-btn--primary'}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? t('admin.commonUi.working') : (confirmText || t('admin.commonUi.confirm'))}
        </button>
      </>
    }
  />
  )
}

export default AdminModal
