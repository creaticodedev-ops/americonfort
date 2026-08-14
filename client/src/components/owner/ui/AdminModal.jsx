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
  variant = 'drawer',
}) => {
  const { t } = useI18n()
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Body lock + Escape only. Must depend on `open` — never on `onClose`.
  // Inline onClose from parents changes every render; including it re-ran cleanup,
  // restored focus behind the drawer, and made inputs lose focus after one character.
  useEffect(() => {
    if (!open) return undefined

    const previouslyFocused = document.activeElement
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.()
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('nav-open')

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('nav-open')
      if (
        previouslyFocused &&
        typeof previouslyFocused.focus === 'function' &&
        document.body.contains(previouslyFocused)
      ) {
        previouslyFocused.focus({ preventScroll: true })
      }
    }
  }, [open])

  if (!open) return null

  const widthClass =
    size === 'lg'
      ? 'admin-modal-panel--lg'
      : size === 'xl'
        ? 'admin-modal-panel--xl'
        : size === 'sm'
          ? 'admin-modal-panel--sm'
          : 'admin-modal-panel--md'

  const variantClass = variant === 'center' ? 'admin-modal-root--center' : 'admin-modal-root--drawer'

  return (
    <div className={`admin-modal-root ${variantClass}`} role="presentation">
      <button
        type="button"
        className="admin-modal-backdrop"
        aria-label={t('admin.commonUi.closeDialog')}
        onClick={() => closeOnBackdrop && onCloseRef.current?.()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`admin-modal-panel ${widthClass}`}
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
            onClick={() => onCloseRef.current?.()}
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
    variant="center"
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
