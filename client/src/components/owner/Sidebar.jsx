import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { assets } from '../../assets/ownerAssets'
import { NavLink, useLocation } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'
import {
  OWNER_NAV_STORAGE_KEY,
  findActiveOwnerNavGroupId,
  getGroupedOwnerNav,
  isOwnerNavPathActive,
} from './ownerNavConfig'

const readStoredExpanded = () => {
  try {
    const raw = localStorage.getItem(OWNER_NAV_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const Chevron = ({ open }) => (
  <svg
    className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
      clipRule="evenodd"
    />
  </svg>
)

const SidebarNav = ({
  idPrefix,
  groups,
  expanded,
  onToggleGroup,
  locationPathname,
  t,
  user,
  image,
  previewUrl,
  setImage,
  updateImage,
  onNavigate,
  interactive = true,
}) => (
  <>
    <div className="shrink-0 px-4 pt-5 pb-4 border-b border-borderColor/80">
      <div className="flex items-center gap-3">
        <label htmlFor={`${idPrefix}-avatar`} className="group relative shrink-0 cursor-pointer">
          <img
            src={previewUrl || user?.image || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=300'}
            alt=""
            className="h-10 w-10 rounded-full object-cover ring-1 ring-borderColor"
          />
          <input
            type="file"
            id={`${idPrefix}-avatar`}
            accept="image/*"
            hidden
            onChange={(e) => setImage(e.target.files?.[0] || '')}
          />
          <span className="absolute inset-0 hidden items-center justify-center rounded-full bg-black/25 group-hover:flex">
            <img src={assets.edit_icon} alt="" className="h-3.5 w-3.5 brightness-0 invert" />
          </span>
        </label>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{user?.name || 'Admin'}</p>
          <p className="truncate text-[11px] text-muted">Americonfort</p>
        </div>
        {image ? (
          <button
            type="button"
            onClick={updateImage}
            className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/15 cursor-pointer"
          >
            {t('admin.shell.save')}
          </button>
        ) : null}
      </div>
    </div>

    <nav
      className="flex-1 overflow-y-auto overscroll-contain px-2.5 py-3"
      aria-label={t('admin.menu.navigation')}
    >
      {groups.map((group, groupIndex) => {
        const open = expanded[group.id] !== false
        const panelId = `${idPrefix}-panel-${group.id}`
        const groupHasActive = group.items.some((item) =>
          isOwnerNavPathActive(locationPathname, item.path),
        )

        return (
          <div key={group.id} className={groupIndex > 0 ? 'pt-2' : ''}>
            {groupIndex > 0 ? (
              <div className="mb-2 mx-2 border-t border-borderColor/70" aria-hidden="true" />
            ) : null}

            <button
              type="button"
              onClick={() => onToggleGroup(group.id)}
              aria-expanded={open}
              aria-controls={panelId}
              tabIndex={interactive ? 0 : -1}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left cursor-pointer
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25
                ${groupHasActive ? 'text-primary' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
            >
              <Chevron open={open} />
              <span className="flex-1 text-[10px] font-semibold uppercase tracking-[0.08em]">
                {t(group.labelKey)}
              </span>
            </button>

            <div
              id={panelId}
              role="region"
              className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <ul className="min-h-0 overflow-hidden space-y-0.5 pb-1">
                {group.items.map((link) => {
                  const active = isOwnerNavPathActive(locationPathname, link.path)
                  return (
                    <li key={link.path}>
                      <NavLink
                        to={link.path}
                        end={link.path === '/owner'}
                        title={t(link.nameKey)}
                        aria-current={active ? 'page' : undefined}
                        tabIndex={interactive && open ? 0 : -1}
                        onClick={onNavigate}
                        className={`group relative flex items-center gap-2.5 rounded-lg py-2 pl-3 pr-2.5 ml-1
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25
                          ${active
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                      >
                        <span
                          className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full transition-colors ${
                            active ? 'bg-primary' : 'bg-transparent group-hover:bg-borderColor'
                          }`}
                          aria-hidden="true"
                        />
                        <img
                          src={active ? link.coloredIcon : link.icon}
                          alt=""
                          className="h-[18px] w-[18px] shrink-0 opacity-90"
                        />
                        <span className="truncate text-[13px] leading-none">{t(link.nameKey)}</span>
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )
      })}
    </nav>
  </>
)

const Sidebar = ({ mobileOpen = false, onMobileClose }) => {
  const { user, axios, fetchUser, hasPermission } = useAppContext()
  const { t } = useI18n()
  const location = useLocation()
  const [image, setImage] = useState('')
  const [expanded, setExpanded] = useState(() => readStoredExpanded() || {})

  const previewUrl = useMemo(() => (image ? URL.createObjectURL(image) : ''), [image])

  const groups = useMemo(
    () => getGroupedOwnerNav(hasPermission),
    // permissions live on user; recompute when the account changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasPermission, user],
  )

  const activeGroupId = useMemo(
    () => findActiveOwnerNavGroupId(location.pathname, groups),
    [location.pathname, groups],
  )

  useEffect(() => {
    try {
      localStorage.setItem(OWNER_NAV_STORAGE_KEY, JSON.stringify(expanded))
    } catch {
      /* ignore */
    }
  }, [expanded])

  useEffect(() => {
    if (!activeGroupId) return
    setExpanded((prev) => {
      if (prev[activeGroupId]) return prev
      return { ...prev, [activeGroupId]: true }
    })
  }, [activeGroupId])

  useEffect(() => {
    if (readStoredExpanded()) return
    if (!groups.length) return
    const initial = {}
    groups.forEach((group) => {
      initial[group.id] = true
    })
    setExpanded(initial)
  }, [groups])

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

  const toggleGroup = useCallback((groupId) => {
    setExpanded((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }, [])

  const sharedNavProps = {
    groups,
    expanded,
    onToggleGroup: toggleGroup,
    locationPathname: location.pathname,
    t,
    user,
    image,
    previewUrl,
    setImage,
    updateImage,
  }

  return (
    <>
      <aside
        className="relative sticky top-0 self-start z-20 hidden md:flex h-[calc(100svh-57px)] w-56 xl:w-60 shrink-0 flex-col border-r border-borderColor bg-white"
        aria-label={t('admin.menu.navigation')}
      >
        <SidebarNav idPrefix="desktop" {...sharedNavProps} interactive />
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
          className={`absolute inset-0 bg-ink/40 transition-opacity duration-200 cursor-pointer ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={t('admin.menu.navigation')}
          className={`absolute inset-y-0 left-0 flex w-[min(18.5rem,88vw)] flex-col bg-white shadow-xl transition-transform duration-200 ease-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-borderColor px-4 py-3 shrink-0">
            <p className="text-sm font-semibold text-ink">{t('admin.menu.navigation')}</p>
            <button
              type="button"
              onClick={onMobileClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-borderColor text-gray-600 hover:bg-gray-50 cursor-pointer"
              aria-label={t('admin.shell.closeMenu')}
            >
              <img src={assets.close_icon} alt="" className="h-4 w-4" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <SidebarNav
              idPrefix="mobile"
              {...sharedNavProps}
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
