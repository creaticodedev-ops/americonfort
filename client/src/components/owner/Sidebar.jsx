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
    <nav className="admin-sidebar-nav" aria-label={t('admin.menu.navigation')}>
      {groups.map((group) => {
        const isOpen = collapsed ? true : expanded[group.id] !== false
        const isActiveGroup = activeGroupId === group.id
        return (
          <section
            key={group.id}
            className={`admin-nav-group${isActiveGroup ? ' is-active-group' : ''}${isOpen ? ' is-open' : ''}`}
          >
            {!collapsed ? (
              <button
                type="button"
                className="admin-nav-group-label"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
              >
                <span className="admin-nav-group-label__text">{t(group.labelKey)}</span>
                <Icon
                  name="chevron-down"
                  className={`admin-nav-group-label__chevron h-3.5 w-3.5 shrink-0 ${isOpen ? 'is-open' : ''}`}
                />
              </button>
            ) : (
              <p className="sr-only">{t(group.labelKey)}</p>
            )}
            {isOpen && (
              <ul className="admin-nav-list">
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
                        <span className="admin-nav-link__icon" aria-hidden="true">
                          <Icon name={navIconForPath(link.path)} className="h-[17px] w-[17px]" />
                        </span>
                        <span className="admin-nav-label truncate">{label}</span>
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
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

  const agencyLabel = user?.agencyName || user?.businessName || t('admin.staff.agencyFallback')
  const userName = user?.name || t('admin.staff.fallbackName')

  const brandBlock = (
    <div className={`admin-sidebar-brand ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="admin-sidebar-brand__row">
        <label htmlFor="admin-avatar" className="admin-sidebar-avatar">
          <img
            src={previewUrl || user?.image || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=300'}
            alt=""
          />
          <span className="admin-sidebar-avatar__hint" aria-hidden="true">
            <Icon name="camera" className="h-3 w-3" />
          </span>
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
            <p className="admin-sidebar-brand__name truncate">{userName}</p>
            <p className="admin-sidebar-brand__agency truncate" title={agencyLabel}>
              {agencyLabel}
            </p>
          </div>
        )}
      </div>
      {image ? (
        <button type="button" onClick={updateImage} className="admin-btn admin-btn--primary w-full mt-2.5 h-8 text-xs">
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
        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="admin-nav-link admin-sidebar-collapse-btn"
            onClick={onToggleCollapsed}
            aria-pressed={collapsed}
            title={collapsed ? t('admin.shell.expandSidebar') : t('admin.shell.collapseSidebar')}
          >
            <span className="admin-nav-link__icon" aria-hidden="true">
              <Icon name={collapsed ? 'panel-left' : 'panel-right'} className="h-[17px] w-[17px]" />
            </span>
            <span className="admin-nav-label">
              {collapsed ? t('admin.shell.expand') : t('admin.shell.collapse')}
            </span>
          </button>
        </div>
      </aside>

      <div
        className={`admin-sidebar-overlay md:hidden ${mobileOpen ? 'is-open' : ''}`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          tabIndex={mobileOpen ? 0 : -1}
          aria-label={t('admin.shell.closeMenu')}
          onClick={onMobileClose}
          className="admin-sidebar-overlay__backdrop"
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={t('admin.menu.navigation')}
          className={`admin-sidebar-drawer ${mobileOpen ? 'is-open' : ''}`}
        >
          <div className="admin-sidebar-drawer__head">
            <div className="min-w-0">
              <p className="admin-sidebar-drawer__title">{t('admin.menu.navigation')}</p>
              <p className="admin-sidebar-drawer__sub truncate">{agencyLabel}</p>
            </div>
            <button
              type="button"
              onClick={onMobileClose}
              className="admin-icon-btn"
              aria-label={t('admin.shell.closeMenu')}
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
          <div className="admin-sidebar-drawer__body">
            <div className="admin-sidebar-drawer__user">
              <img
                src={user?.image || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=300'}
                alt=""
                className="admin-sidebar-drawer__avatar"
              />
              <div className="min-w-0">
                <p className="admin-sidebar-brand__name truncate">{userName}</p>
                <p className="admin-sidebar-brand__agency truncate">{user?.email || agencyLabel}</p>
              </div>
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
