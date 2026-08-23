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
  const bodyRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

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

  // Keep focused fields visible when the mobile keyboard opens.
  useEffect(() => {
    if (!open) return undefined
    const body = bodyRef.current
    if (!body) return undefined

    const onFocusIn = (e) => {
      const target = e.target
      if (!(target instanceof HTMLElement) || !body.contains(target)) return
      window.requestAnimationFrame(() => {
        target.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      })
    }

    body.addEventListener('focusin', onFocusIn)
    return () => body.removeEventListener('focusin', onFocusIn)
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
          <div className="min-w-0 pe-10">
            <h2 id={titleId} className="admin-modal-title">
              {title}
            </h2>
            {description ? <p className="admin-modal-description">{description}</p> : null}
          </div>
          <button
            type="button"
            className="admin-modal-close admin-icon-btn"
            onClick={() => onCloseRef.current?.()}
            aria-label={t('admin.commonUi.close')}
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
        <div ref={bodyRef} className="admin-modal-body">
          {children}
        </div>
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
        <button type="button" className="admin-btn admin-btn--secondary admin-modal-action" onClick={onCancel} disabled={loading}>
          {cancelText || t('admin.common.cancel')}
        </button>
        <button
          type="button"
          className={`admin-btn admin-modal-action ${variant === 'danger' ? 'admin-btn--danger' : 'admin-btn--primary'}`}
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
