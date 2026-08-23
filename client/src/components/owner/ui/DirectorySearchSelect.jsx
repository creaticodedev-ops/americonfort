import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const normalize = (v) => String(v || '').trim().toLowerCase()

/**
 * Searchable select for existing directory records (Samsars, partners, chauffeurs).
 * Stores an id (+ optional type meta) — never free text.
 */
export const DirectorySearchSelect = ({
  value = '',
  valueType = '',
  onChange,
  options = [],
  placeholder,
  emptyLabel,
  emptyHint,
  manageLinks = [],
  disabled = false,
  className = '',
}) => {
  const listId = useId()
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = useMemo(
    () => options.find((o) => o.id === value && (!valueType || o.type === valueType)) || null,
    [options, value, valueType],
  )

  const filtered = useMemo(() => {
    const q = normalize(query)
    if (!q) return options
    return options.filter((o) => {
      const hay = normalize([o.label, o.sublabel, o.group].filter(Boolean).join(' '))
      return hay.includes(q)
    })
  }, [options, query])

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const pick = (option) => {
    onChange?.({ id: option.id, type: option.type || '' })
    setOpen(false)
  }

  const clear = (e) => {
    e?.stopPropagation?.()
    onChange?.({ id: '', type: '' })
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={listId}
        className="admin-input w-full text-left flex items-center justify-between gap-2 disabled:opacity-60"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={selected ? 'text-[var(--admin-fg)]' : 'text-[var(--admin-fg-muted)]'}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0 text-[var(--admin-fg-muted)]">
          {selected && !disabled ? (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear"
              className="px-1 hover:text-[var(--admin-fg)]"
              onClick={clear}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') clear(e) }}
            >
              ×
            </span>
          ) : null}
          <span aria-hidden>▾</span>
        </span>
      </button>

      {open && (
        <div
          id={listId}
          className="absolute z-40 mt-1 w-full rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-lg overflow-hidden"
        >
          <div className="p-2 border-b border-[var(--admin-border)]">
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="admin-input admin-input--sm w-full"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-[var(--admin-fg-muted)]">
                <p className="font-medium text-[var(--admin-fg)]">{emptyLabel}</p>
                {emptyHint ? <p className="mt-1">{emptyHint}</p> : null}
                {manageLinks.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {manageLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="admin-btn admin-btn--ghost admin-btn--sm"
                        onClick={() => setOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            ) : (
              filtered.map((option) => (
                <li key={`${option.type || 'x'}-${option.id}`}>
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--admin-bg-subtle)] ${
                      option.id === value && (!valueType || option.type === valueType)
                        ? 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]'
                        : ''
                    }`}
                    onClick={() => pick(option)}
                  >
                    <span className="font-medium">{option.label}</span>
                    {(option.group || option.sublabel) && (
                      <span className="block text-[11px] text-[var(--admin-fg-muted)]">
                        {[option.group, option.sublabel].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export default DirectorySearchSelect
