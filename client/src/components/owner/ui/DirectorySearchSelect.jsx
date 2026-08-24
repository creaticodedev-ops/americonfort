import React, { useMemo } from 'react'
import { AdminSearchSelect } from './AdminSearchSelect'

const encode = (type, id) => `${type || '_'}::${id}`
const decode = (raw) => {
  const text = String(raw || '')
  const idx = text.indexOf('::')
  if (idx < 0) return { type: '', id: text }
  return { type: text.slice(0, idx) === '_' ? '' : text.slice(0, idx), id: text.slice(idx + 2) }
}

/**
 * Searchable select for directory records (Samsars, partners, chauffeurs).
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
  loading = false,
  className = '',
}) => {
  const mapped = useMemo(
    () =>
      options.map((o) => ({
        value: encode(o.type, o.id),
        label: o.label,
        description: [o.group, o.sublabel].filter(Boolean).join(' · '),
        searchText: [o.label, o.sublabel, o.group].filter(Boolean).join(' '),
      })),
    [options],
  )

  const encodedValue = useMemo(() => {
    if (!value) return ''
    const match = options.find((o) => o.id === value && (!valueType || o.type === valueType))
    if (match) return encode(match.type, match.id)
    return encode(valueType, value)
  }, [options, value, valueType])

  return (
    <AdminSearchSelect
      value={encodedValue}
      options={mapped}
      placeholder={placeholder}
      emptyLabel={emptyLabel}
      emptyHint={emptyHint}
      manageLinks={manageLinks}
      disabled={disabled}
      loading={loading}
      clearable
      searchable
      className={className}
      onChange={(next) => {
        if (!next) {
          onChange?.({ id: '', type: '' })
          return
        }
        const { id, type } = decode(next)
        onChange?.({ id, type })
      }}
    />
  )
}

export default DirectorySearchSelect
