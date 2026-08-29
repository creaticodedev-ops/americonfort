import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

const iconClass = 'h-4 w-4 shrink-0'

const Icons = {
  eye: (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  ),
  pencil: (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.1 2.1 0 013 3L8.25 18.1 4.5 19.5l1.4-3.75L16.862 3.487z" />
    </svg>
  ),
  id: (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="12" r="2" />
      <path strokeLinecap="round" d="M14 10.5h4M14 13.5h3" />
    </svg>
  ),
  license: (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path strokeLinecap="round" d="M7 10h4M7 13h2.5M14 10h3M14 13h3" />
    </svg>
  ),
  passport: (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <circle cx="12" cy="10" r="2.25" />
      <path strokeLinecap="round" d="M8.5 16.5h7" />
    </svg>
  ),
  print: (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8V4h10v4M7 17H5a2 2 0 01-2-2v-5a2 2 0 012-2h14a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
      <rect x="7" y="14" width="10" height="6" rx="1" />
    </svg>
  ),
  whatsapp: (
    <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.95.52 3.76 1.43 5.33L2 22l4.99-1.53a9.86 9.86 0 004.99 1.28h.01c5.46 0 9.89-4.4 9.89-9.83C21.88 6.4 17.5 2 12.04 2zm5.74 13.96c-.24.67-1.39 1.23-1.92 1.31-.49.07-1.11.1-1.79-.11-.41-.13-.94-.3-1.62-.59-2.85-1.23-4.7-4.1-4.84-4.29-.14-.19-1.15-1.53-1.15-2.92 0-1.39.73-2.07.99-2.36.26-.29.57-.36.76-.36h.55c.17 0 .4-.07.63.48.24.56.81 1.96.88 2.1.07.14.12.31.02.5-.1.19-.14.31-.28.48-.14.17-.3.38-.42.51-.14.14-.28.29-.12.57.17.28.74 1.22 1.59 1.98 1.1.97 2.02 1.28 2.3 1.42.29.14.45.12.62-.07.17-.19.72-.84.91-1.13.19-.29.38-.24.64-.14.26.1 1.67.79 1.96.93.29.14.48.21.55.33.07.12.07.69-.17 1.36z" />
    </svg>
  ),
  more: (
    <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  ),
  trash: (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7h14M9 7V5h6v2m-8 0l.8 12h8.4L17 7" />
    </svg>
  ),
}

const baseBtn =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 ' +
  'disabled:opacity-40 disabled:pointer-events-none cursor-pointer'

/**
 * Compact reservation row actions — View + More menu + Delete.
 * Preserves all existing callbacks; UI only.
 */
const BookingRowActions = ({
  t,
  onView,
  onEdit,
  onDownloadLicense,
  onDownloadId,
  onDownloadPassport,
  onDownloadCombined,
  isWalkIn = false,
  onWhatsApp,
  onPrint,
  onDelete,
}) => {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, maxHeight: 320 })
  const rootRef = useRef(null)
  const moreBtnRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()

  useLayoutEffect(() => {
    if (!open || !moreBtnRef.current) return undefined
    const place = () => {
      const rect = moreBtnRef.current.getBoundingClientRect()
      const menuWidth = 208
      const menuHeight = menuRef.current?.offsetHeight || 300
      const gap = 6
      const spaceBelow = window.innerHeight - rect.bottom - gap
      const spaceAbove = rect.top - gap
      const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow
      const maxHeight = Math.max(160, openUp ? spaceAbove : spaceBelow)
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
    // Re-measure once menu is painted so height is accurate
    const raf = requestAnimationFrame(place)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)
        && !menuRef.current?.contains(event.target)) {
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

  const documentItems = isWalkIn
    ? [{ key: 'combined', label: t('admin.walkIn.uploadCombined'), icon: Icons.id, onClick: onDownloadCombined }]
    : [
        { key: 'license', label: t('admin.bookings.downloadLicense'), icon: Icons.license, onClick: onDownloadLicense },
        { key: 'id', label: t('admin.bookings.downloadId'), icon: Icons.id, onClick: onDownloadId },
        { key: 'passport', label: t('admin.bookings.downloadPassport'), icon: Icons.passport, onClick: onDownloadPassport },
      ]
  const menuItems = [
    { key: 'edit', label: t('admin.bookings.edit'), icon: Icons.pencil, onClick: onEdit },
    { key: 'sep-docs', separator: true, label: t('admin.bookings.docs') },
    ...documentItems,
    { key: 'sep-comm', separator: true },
    { key: 'print', label: t('admin.bookings.print'), icon: Icons.print, onClick: onPrint },
    {
      key: 'whatsapp',
      label: t('admin.bookings.whatsapp'),
      icon: Icons.whatsapp,
      onClick: onWhatsApp,
      tone: 'whatsapp',
    },
  ]

  return (
    <div ref={rootRef} className="relative flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={run(onView)}
        title={t('admin.bookings.view')}
        aria-label={t('admin.bookings.view')}
        className={`${baseBtn} border-primary/20 bg-primary text-white shadow-sm hover:bg-primary-dull`}
      >
        {Icons.eye}
      </button>

      <button
        ref={moreBtnRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        title={t('admin.bookings.moreActions')}
        aria-label={t('admin.bookings.moreActions')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={`${baseBtn} border-borderColor bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900`}
      >
        {Icons.more}
      </button>

      {open && (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          style={{ top: menuPos.top, left: menuPos.left, maxHeight: menuPos.maxHeight }}
          className="fixed z-50 w-52 overflow-y-auto rounded-xl border border-borderColor bg-white py-1 shadow-lg ring-1 ring-black/5"
        >
          {menuItems.map((item) => {
            if (item.separator) {
              return (
                <div key={item.key} className="my-1 border-t border-borderColor px-3 pt-1.5" role="separator">
                  {item.label ? (
                    <p className="pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      {item.label}
                    </p>
                  ) : null}
                </div>
              )
            }
            const toneClass = item.tone === 'whatsapp'
              ? 'text-[#128C7E] hover:bg-emerald-50'
              : 'text-gray-700 hover:bg-gray-50'
            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                onClick={run(item.onClick)}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm ${toneClass} cursor-pointer`}
              >
                <span className="opacity-90">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>
      )}

      <button
        type="button"
        onClick={run(onDelete)}
        title={t('admin.bookings.delete')}
        aria-label={t('admin.bookings.delete')}
        className={`${baseBtn} border-red-200/80 bg-white text-red-600 hover:bg-red-50 hover:border-red-300`}
      >
        {Icons.trash}
      </button>
    </div>
  )
}

export default BookingRowActions
