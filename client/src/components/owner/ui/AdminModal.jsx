import React, { useEffect, useId, useRef } from 'react'
import { Icon } from './adminIcons'

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
        aria-label="Close dialog"
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
          <div className="min-w-0 pr-8">
            <h2 id={titleId} className="text-base font-semibold text-[var(--admin-fg)]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-[var(--admin-fg-secondary)]">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="admin-icon-btn absolute right-3 top-3"
            onClick={onClose}
            aria-label="Close"
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
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
  loading = false,
}) => (
  <AdminModal
    open={isOpen}
    onClose={onCancel}
    title={title}
    description={message}
    size="sm"
    footer={
      <>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={onCancel} disabled={loading}>
          {cancelText}
        </button>
        <button
          type="button"
          className={`admin-btn ${variant === 'danger' ? 'admin-btn--danger' : 'admin-btn--primary'}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Working…' : confirmText}
        </button>
      </>
    }
  />
)

export default AdminModal
