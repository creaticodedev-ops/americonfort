import React, { useId, useRef, useState } from 'react'
import { AdminActionsMenuPanel } from '../ui/AdminActionsMenu'

const baseBtn =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--admin-radius)] border transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-1 ' +
  'disabled:opacity-40 disabled:pointer-events-none cursor-pointer'

const IconMore = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="1.75" />
    <circle cx="12" cy="12" r="1.75" />
    <circle cx="19" cy="12" r="1.75" />
  </svg>
)

const IconEye = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12z" />
    <circle cx="12" cy="12" r="2.75" />
  </svg>
)

/**
 * View + More (⋯) row actions for reservations. Menu uses AdminActionsMenuPanel (opaque, portaled).
 */
const BookingActionsMenu = ({
  t,
  onView,
  items = [],
  showView = true,
  size = 'md',
  className = '',
}) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const moreBtnRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()

  const btnSize = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  const visibleItems = items.filter((item) => !item.hidden)

  const close = () => setOpen(false)

  const run = (fn) => (event) => {
    event.stopPropagation()
    close()
    fn?.()
  }

  return (
    <div ref={rootRef} className={`admin-booking-row-actions ${className}`.trim()} onClick={(e) => e.stopPropagation()}>
      {showView && (
        <button
          type="button"
          onClick={run(onView)}
          title={t('admin.bookings.view')}
          aria-label={t('admin.bookings.view')}
          className={`${baseBtn} ${btnSize} admin-booking-row-actions-view`}
        >
          <IconEye />
        </button>
      )}

      {visibleItems.length > 0 && (
        <button
          ref={moreBtnRef}
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setOpen((v) => !v)
          }}
          title={t('admin.bookings.moreActions')}
          aria-label={t('admin.bookings.moreActions')}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          className={`${baseBtn} ${btnSize} admin-booking-row-actions-more`}
        >
          <IconMore />
        </button>
      )}

      <AdminActionsMenuPanel
        open={open}
        onClose={close}
        anchorRef={moreBtnRef}
        menuRef={menuRef}
        menuId={menuId}
        items={items}
      />
    </div>
  )
}

export default BookingActionsMenu
