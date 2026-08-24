import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './adminIcons'
import { useI18n } from '../../../i18n/I18nContext'

const normalize = (v) => String(v || '').trim().toLowerCase()

const optionSearchBlob = (option) =>
  normalize([option.label, option.description, option.meta, option.searchText].filter(Boolean).join(' '))

/**
 * Premium searchable select for admin forms.
 *
 * options: [{ value, label, description?, meta?, searchText?, disabled? }]
 */
export const AdminSearchSelect = ({
  value = '',
  onChange,
  options = [],
  placeholder,
  searchPlaceholder,
  emptyLabel,
  emptyHint,
  manageLinks = [],
  disabled = false,
  loading = false,
  clearable = true,
  searchable,
  className = '',
  name,
  id,
  'aria-label': ariaLabel,
}) => {
  const { t } = useI18n()
  const listId = useId()
  const rootRef = useRef(null)
  const searchRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)

  const enableSearch = searchable ?? options.length > 6

  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value)) || null,
    [options, value],
  )

  const filtered = useMemo(() => {
    const q = normalize(query)
    if (!q) return options
    return options.filter((o) => optionSearchBlob(o).includes(q))
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
    if (!open) {
      setQuery('')
      setHighlight(0)
      return undefined
    }
    setHighlight(0)
    const tmr = window.setTimeout(() => searchRef.current?.focus?.(), 10)
    return () => window.clearTimeout(tmr)
  }, [open])

  useEffect(() => {
    setHighlight((h) => {
      if (!filtered.length) return 0
      return Math.min(h, filtered.length - 1)
    })
  }, [filtered.length])

  const pick = (option) => {
    if (!option || option.disabled) return
    onChange?.(option.value)
    setOpen(false)
  }

  const clear = (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    onChange?.('')
    setOpen(false)
  }

  const onTriggerKeyDown = (e) => {
    if (disabled) return
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(true)
    }
  }

  const onListKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const opt = filtered[highlight]
      if (opt) pick(opt)
    }
  }

  const hasValue = Boolean(selected)
  const triggerLabel = placeholder || t('admin.common.search')

  return (
    <div ref={rootRef} className={`admin-ss ${className}`.trim()} data-open={open ? 'true' : 'false'}>
      {name ? <input type="hidden" name={name} value={value || ''} readOnly /> : null}

      <button
        type="button"
        id={id}
        disabled={disabled || loading}
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-label={ariaLabel || triggerLabel}
        className={`admin-ss__trigger${hasValue ? ' is-filled' : ''}${open ? ' is-open' : ''}`}
        onClick={() => !disabled && !loading && setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="admin-ss__value min-w-0 flex-1 text-start">
          {loading ? (
            <span className="admin-ss__placeholder">{t('admin.common.loading')}</span>
          ) : selected ? (
            <>
              <span className="admin-ss__title">{selected.label}</span>
              {selected.description ? (
                <span className="admin-ss__desc">{selected.description}</span>
              ) : selected.meta ? (
                <span className="admin-ss__meta">{selected.meta}</span>
              ) : null}
            </>
          ) : (
            <span className="admin-ss__placeholder">{triggerLabel}</span>
          )}
        </span>

        <span className="admin-ss__actions">
          {hasValue && clearable && !disabled && !loading ? (
            <span
              role="button"
              tabIndex={0}
              className="admin-ss__clear"
              aria-label={t('admin.fleet.clear')}
              title={t('admin.fleet.clear')}
              onClick={clear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') clear(e)
              }}
            >
              <Icon name="x" className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <span className={`admin-ss__chevron${open ? ' is-open' : ''}`} aria-hidden>
            <Icon name="chevron" className="h-4 w-4" />
          </span>
        </span>
      </button>

      {open && (
        <div className="admin-ss__panel" id={listId} role="listbox" onKeyDown={onListKeyDown}>
          {enableSearch && (
            <div className="admin-ss__search">
              <Icon name="search" className="admin-ss__search-icon" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder || t('admin.common.search')}
                className="admin-ss__search-input"
                autoComplete="off"
              />
            </div>
          )}

          <ul className="admin-ss__list">
            {filtered.length === 0 ? (
              <li className="admin-ss__empty">
                <p className="admin-ss__empty-title">
                  {emptyLabel || t('admin.shell.noResults')}
                </p>
                {emptyHint ? <p className="admin-ss__empty-hint">{emptyHint}</p> : null}
                {manageLinks.length > 0 && (
                  <div className="admin-ss__empty-links">
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
              filtered.map((option, index) => {
                const active = String(option.value) === String(value)
                const highlighted = index === highlight
                return (
                  <li key={String(option.value)}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      disabled={option.disabled}
                      className={`admin-ss__option${active ? ' is-selected' : ''}${highlighted ? ' is-highlight' : ''}`}
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => pick(option)}
                    >
                      <span className="admin-ss__option-main min-w-0">
                        <span className="admin-ss__option-title">{option.label}</span>
                        {option.description ? (
                          <span className="admin-ss__option-desc">{option.description}</span>
                        ) : null}
                        {option.meta ? (
                          <span className="admin-ss__option-meta">{option.meta}</span>
                        ) : null}
                      </span>
                      {active ? (
                        <span className="admin-ss__check" aria-hidden>✓</span>
                      ) : null}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export default AdminSearchSelect
