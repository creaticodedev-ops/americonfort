import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const MENU_WIDTH = 224
const MENU_GAP = 8
const VIEWPORT_PAD = 8

/** Read admin shell theme/dir so portaled menus inherit the active admin palette. */
function useAdminShell() {
  const [shell, setShell] = useState({ theme: 'light', dir: 'ltr' })

  useLayoutEffect(() => {
    const sync = () => {
      const root = document.querySelector('.admin-app')
      setShell({
        theme: root?.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
        dir: root?.getAttribute('dir') || document.documentElement.getAttribute('dir') || 'ltr',
      })
    }
    sync()
    const root = document.querySelector('.admin-app')
    if (!root) return undefined
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme', 'dir'] })
    return () => observer.disconnect()
  }, [])

  return shell
}

function groupMenuItems(items) {
  const visible = items.filter((item) => !item.hidden)
  const groups = []
  let current = { kind: 'default', items: [] }

  visible.forEach((item) => {
    if (item.separator) {
      if (current.items.length) groups.push(current)
      groups.push({ kind: 'separator', item })
      current = { kind: 'default', items: [] }
      return
    }
    const isDanger = item.tone === 'danger'
    if (isDanger && current.kind !== 'danger') {
      if (current.items.length) groups.push(current)
      current = { kind: 'danger', items: [] }
    } else if (!isDanger && current.kind === 'danger') {
      groups.push(current)
      current = { kind: 'default', items: [] }
    }
    current.items.push(item)
  })

  if (current.items.length) groups.push(current)
  return groups
}

/**
 * Opaque, portaled action menu for admin surfaces. Escapes overflow/stacking contexts
 * and carries its own theme tokens (menus render on document.body, outside .admin-app).
 */
export function AdminActionsMenuPanel({
  open,
  onClose,
  anchorRef,
  items = [],
  menuId,
  menuRef: menuRefProp,
}) {
  const shell = useAdminShell()
  const internalMenuRef = useRef(null)
  const menuRef = menuRefProp || internalMenuRef
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, maxHeight: 360 })

  useLayoutEffect(() => {
    if (!open || !anchorRef?.current) return undefined

    const place = () => {
      const rect = anchorRef.current.getBoundingClientRect()
      const menuEl = menuRef.current
      const menuHeight = menuEl?.offsetHeight || 280
      const menuWidth = menuEl?.offsetWidth || MENU_WIDTH

      const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP
      const spaceAbove = rect.top - MENU_GAP
      const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow
      const maxHeight = Math.max(180, openUp ? spaceAbove : spaceBelow)

      const top = openUp
        ? Math.max(VIEWPORT_PAD, rect.top - Math.min(menuHeight, maxHeight) - MENU_GAP)
        : rect.bottom + MENU_GAP

      const alignEnd = rect.right
      const left = Math.min(
        window.innerWidth - menuWidth - VIEWPORT_PAD,
        Math.max(VIEWPORT_PAD, alignEnd - menuWidth),
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
  }, [open, items.length, anchorRef, menuRef])

  useEffect(() => {
    if (!open) return undefined

    const onPointer = (event) => {
      const target = event.target
      if (
        anchorRef?.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return
      }
      onClose?.()
    }

    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    document.addEventListener('pointerdown', onPointer, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, anchorRef, menuRef])

  if (!open) return null

  const groups = groupMenuItems(items)

  const run = (fn) => (event) => {
    event.preventDefault()
    event.stopPropagation()
    onClose?.()
    fn?.()
  }

  return createPortal(
    <div
      id={menuId}
      ref={menuRef}
      role="menu"
      dir={shell.dir}
      data-theme={shell.theme}
      style={{ top: menuPos.top, left: menuPos.left, maxHeight: menuPos.maxHeight }}
      className="admin-actions-menu"
    >
      {groups.map((group, groupIndex) => {
        if (group.kind === 'separator') {
          const item = group.item
          return (
            <div key={item.key || `sep-${groupIndex}`} className="admin-actions-menu-sep" role="separator">
              {item.label ? <span className="admin-actions-menu-sep-label">{item.label}</span> : null}
            </div>
          )
        }

        const body = group.items.map((item) => {
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
              {item.icon ? <span className="admin-actions-menu-item-icon" aria-hidden="true">{item.icon}</span> : null}
              <span className="admin-actions-menu-item-label">{item.label}</span>
            </button>
          )
        })

        if (group.kind === 'danger') {
          return (
            <div key={`danger-${groupIndex}`} className="admin-actions-menu-danger-zone" role="group">
              {body}
            </div>
          )
        }

        return body
      })}
    </div>,
    document.body,
  )
}

export default AdminActionsMenuPanel
