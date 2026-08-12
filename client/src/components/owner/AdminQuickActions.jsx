import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { Icon } from './ui/adminIcons'
import { OWNER_QUICK_ACTIONS } from './ownerNavConfig'

/** Compact quick-create menu for daily Owner operations */
const AdminQuickActions = () => {
  const { hasPermission, hasFeature } = useAppContext()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const actions = useMemo(
    () =>
      OWNER_QUICK_ACTIONS.filter((a) => {
        if (a.permission != null && !hasPermission(a.permission)) return false
        if (a.feature != null && !hasFeature(a.feature)) return false
        return true
      }),
    [hasPermission, hasFeature],
  )

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!actions.length) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="admin-icon-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('admin.quick.title')}
        title={t('admin.quick.title')}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="plus" className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full mt-1 z-50 min-w-[12rem] rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-lg)] py-1"
        >
          <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-fg-muted)]">
            {t('admin.quick.title')}
          </p>
          {actions.map((action) => (
            <Link
              key={action.path}
              role="menuitem"
              to={action.path}
              className="block px-3 py-2 text-sm text-[var(--admin-fg)] hover:bg-[var(--admin-surface-2)]"
              onClick={() => setOpen(false)}
            >
              {t(action.labelKey)}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminQuickActions
