import React, { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'
import { Icon, navIconForPath } from './ui/adminIcons'
import {
  OWNER_NAV_GROUP_EXPANDED_KEY,
  getGroupedOwnerNav,
  findActiveOwnerNavGroupId,
  isOwnerNavPathActive,
} from './ownerNavConfig'

const readExpandedMap = () => {
  try {
    const raw = localStorage.getItem(OWNER_NAV_GROUP_EXPANDED_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const SidebarNav = ({
  groups,
  collapsed,
  onNavigate,
  interactive = true,
  t,
}) => {
  const location = useLocation()
  const activeGroupId = findActiveOwnerNavGroupId(location.pathname, groups)
  const [expanded, setExpanded] = useState(() => {
    const stored = readExpandedMap()
    if (activeGroupId && stored[activeGroupId] === undefined) {
      return { ...stored, [activeGroupId]: true }
    }
    return Object.keys(stored).length ? stored : { main: true, operations: true }
  })

  useEffect(() => {
    if (!activeGroupId) return
    setExpanded((prev) => {
      if (prev[activeGroupId]) return prev
      const next = { ...prev, [activeGroupId]: true }
      try {
        localStorage.setItem(OWNER_NAV_GROUP_EXPANDED_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [activeGroupId])

  const toggleGroup = (id) => {
    setExpanded((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      try {
        localStorage.setItem(OWNER_NAV_GROUP_EXPANDED_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  return (
    <nav className="flex-1 overflow-y-auto overscroll-contain py-2" aria-label={t('admin.menu.navigation')}>
      {groups.map((group) => {
        const isOpen = collapsed ? true : expanded[group.id] !== false
        return (
          <div key={group.id} className="mb-1">
            {!collapsed ? (
              <button
                type="button"
                className="admin-nav-group-label w-full flex items-center justify-between gap-2 text-start cursor-pointer hover:text-[var(--admin-fg)]"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
              >
                <span>{t(group.labelKey)}</span>
                <Icon
                  name="chevron"
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                />
              </button>
            ) : (
              <p className="sr-only">{t(group.labelKey)}</p>
            )}
            {isOpen && (
              <ul className="space-y-0.5">
                {group.items.map((link) => {
                  const active = isOwnerNavPathActive(location.pathname, link.path)
                  const label = t(link.nameKey)
                  return (
                    <li key={link.path}>
                      <NavLink
                        to={link.path}
                        end={link.path === '/owner'}
                        title={collapsed ? label : undefined}
                        aria-current={active ? 'page' : undefined}
                        tabIndex={interactive ? 0 : -1}
                        onClick={onNavigate}
                        className={`admin-nav-link ${active ? 'is-active' : ''}`}
                      >
                        <Icon name={navIconForPath(link.path)} className="h-[18px] w-[18px] shrink-0" />
                        <span className="admin-nav-label truncate">{label}</span>
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}

const Sidebar = ({ mobileOpen = false, onMobileClose, collapsed, onToggleCollapsed }) => {
  const { user, axios, fetchUser, hasPermission, hasFeature } = useAppContext()
  const { t } = useI18n()
  const location = useLocation()
  const [image, setImage] = useState('')

  const previewUrl = useMemo(() => (image ? URL.createObjectURL(image) : ''), [image])

  const groups = useMemo(
    () => getGroupedOwnerNav(hasPermission, hasFeature),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasPermission, hasFeature, user],
  )

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    onMobileClose?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return undefined
    document.body.classList.add('nav-open')
    const onKey = (event) => {
      if (event.key === 'Escape') onMobileClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('nav-open')
      document.removeEventListener('keydown', onKey)
    }
  }, [mobileOpen, onMobileClose])

  const updateImage = async () => {
    try {
      const formData = new FormData()
      formData.append('image', image)
      const { data } = await axios.post('/api/owner/update-image', formData)
      if (data.success) {
        fetchUser()
        toast.success(data.message)
        setImage('')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const brandBlock = (
    <div className={`shrink-0 border-b border-[var(--admin-sidebar-border)] ${collapsed ? 'px-2 py-3' : 'px-3 py-3.5'}`}>
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
        <label htmlFor="admin-avatar" className="group relative shrink-0 cursor-pointer">
          <img
            src={previewUrl || user?.image || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=300'}
            alt=""
            className="h-9 w-9 rounded-full object-cover ring-1 ring-[var(--admin-border)]"
          />
          <input
            type="file"
            id="admin-avatar"
            accept="image/*"
            hidden
            onChange={(e) => setImage(e.target.files?.[0] || '')}
          />
        </label>
        {!collapsed && (
          <div className="admin-sidebar-brand-text min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--admin-fg)]">{user?.name || t('admin.staff.fallbackName')}</p>
            <p className="truncate text-[11px] text-[var(--admin-fg-muted)]">
              {user?.agencyName || user?.businessName || t('admin.staff.agencyFallback')}
            </p>
          </div>
        )}
      </div>
      {image ? (
        <button type="button" onClick={updateImage} className="admin-btn admin-btn--primary w-full mt-2 h-8 text-xs">
          {t('admin.shell.save')}
        </button>
      ) : null}
    </div>
  )

  return (
    <>
      <aside
        className={`admin-sidebar ${collapsed ? 'is-collapsed' : ''}`}
        aria-label={t('admin.menu.navigation')}
      >
        {brandBlock}
        <SidebarNav groups={groups} collapsed={collapsed} t={t} />
        <div className="shrink-0 border-t border-[var(--admin-sidebar-border)] p-2">
          <button
            type="button"
            className="admin-nav-link w-[calc(100%-0.8rem)]"
            onClick={onToggleCollapsed}
            aria-pressed={collapsed}
            title={collapsed ? t('admin.shell.expandSidebar') : t('admin.shell.collapseSidebar')}
          >
            <Icon name="panel" className="h-[18px] w-[18px]" />
            <span className="admin-nav-label">
              {collapsed ? t('admin.shell.expand') : t('admin.shell.collapse')}
            </span>
          </button>
        </div>
      </aside>

      <div
        className={`md:hidden fixed inset-0 z-40 ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          tabIndex={mobileOpen ? 0 : -1}
          aria-label={t('admin.shell.closeMenu')}
          onClick={onMobileClose}
          className={`absolute inset-0 bg-slate-950/50 transition-opacity duration-200 cursor-pointer ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={t('admin.menu.navigation')}
          className={`admin-sidebar-drawer absolute inset-y-0 start-0 flex w-[min(18.5rem,88vw)] flex-col bg-[var(--admin-sidebar-bg)] shadow-[var(--admin-shadow-lg)] border-e border-[var(--admin-sidebar-border)] transition-transform duration-200 ease-out ${
            mobileOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--admin-border)] px-3 py-3 shrink-0">
            <p className="text-sm font-semibold text-[var(--admin-fg)]">{t('admin.menu.navigation')}</p>
            <button
              type="button"
              onClick={onMobileClose}
              className="admin-icon-btn"
              aria-label={t('admin.shell.closeMenu')}
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="px-3 py-3 border-b border-[var(--admin-border)]">
              <p className="text-sm font-semibold truncate">{user?.name || 'Admin'}</p>
              <p className="text-[11px] text-[var(--admin-fg-muted)] truncate">
                {user?.agencyName || 'Americonfort'}
              </p>
            </div>
            <SidebarNav
              groups={groups}
              collapsed={false}
              t={t}
              interactive={mobileOpen}
              onNavigate={onMobileClose}
            />
          </div>
        </aside>
      </div>
    </>
  )
}

export default Sidebar
