import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
 * View + More (⋯) row actions. Menu portals to body — opaque surface, no transparency bleed.
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
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, maxHeight: 360 })
  const rootRef = useRef(null)
  const moreBtnRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()

  const btnSize = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'

  useLayoutEffect(() => {
    if (!open || !moreBtnRef.current) return undefined
    const place = () => {
      const rect = moreBtnRef.current.getBoundingClientRect()
      const menuWidth = 224
      const menuHeight = menuRef.current?.offsetHeight || 280
      const gap = 8
      const spaceBelow = window.innerHeight - rect.bottom - gap
      const spaceAbove = rect.top - gap
      const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow
      const maxHeight = Math.max(180, openUp ? spaceAbove : spaceBelow)
      const top = openUp
        ? Math.max(8, rect.top - Math.min(menuHeight, maxHeight) - gap)
        : rect.bottom + gap
      const left = Math.min(
        window.innerWidth - menuWidth - 8,
        Math.max(8, rect.right - menuWidth),
      )
      setMenuPos({ top, left, maxHeight })
    }
    place()
    const raf = requestAnimationFrame(place)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, items.length])

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const run = (fn) => (event) => {
    event.stopPropagation()
    setOpen(false)
    fn?.()
  }

  const visibleItems = items.filter((item) => !item.hidden)

  const menu = open
    ? createPortal(
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          style={{ top: menuPos.top, left: menuPos.left, maxHeight: menuPos.maxHeight }}
          className="admin-actions-menu"
        >
          {visibleItems.map((item) => {
            if (item.separator) {
              return (
                <div key={item.key} className="admin-actions-menu-sep" role="separator">
                  {item.label ? <span className="admin-actions-menu-sep-label">{item.label}</span> : null}
                </div>
              )
            }
            const toneClass =
              item.tone === 'danger'
                ? 'admin-actions-menu-item--danger'
                : item.tone === 'whatsapp'
                  ? 'admin-actions-menu-item--whatsapp'
                  : ''
            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={run(item.onClick)}
                className={`admin-actions-menu-item ${toneClass}`.trim()}
              >
                {item.icon ? <span className="admin-actions-menu-item-icon">{item.icon}</span> : null}
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>,
        document.body,
      )
    : null

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

      {menu}
    </div>
  )
}

export default BookingActionsMenu
