import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

const DOC_TYPES = [
  { id: 'combined', labelKey: 'admin.walkIn.docTypeCombined' },
  { id: 'national_id', labelKey: 'admin.walkIn.docTypeNationalId' },
  { id: 'driving_license', labelKey: 'admin.walkIn.docTypeLicense' },
  { id: 'passport', labelKey: 'admin.walkIn.docTypePassport' },
]

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.pdf,.jpg,.jpeg,.png,.webp'

const newId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`)

const formatBytes = (n) => {
  const size = Number(n) || 0
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const isAllowedFile = (file) => {
  if (!file) return false
  const type = String(file.type || '').toLowerCase()
  const name = String(file.name || '').toLowerCase()
  if (type.startsWith('image/')) return true
  if (type === 'application/pdf' || name.endsWith('.pdf')) return true
  return false
}

const FileGlyph = ({ mime, className = '' }) => {
  const isPdf = String(mime || '').includes('pdf')
  return (
    <svg
      className={className}
      viewBox="0 0 40 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M8 2h16l10 10v32a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z"
        fill="currentColor"
        fillOpacity="0.08"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M24 2v8a2 2 0 0 0 2 2h8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      {isPdf ? (
        <text x="20" y="32" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor">
          PDF
        </text>
      ) : (
        <>
          <rect x="10" y="20" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" fill="none" />
          <circle cx="15" cy="25" r="1.6" fill="currentColor" />
          <path d="M12 32l5-5 4 4 3-3 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  )
}

/**
 * Premium multi-file customer document uploader for Walk-in desk.
 */
const WalkInDocumentUploader = ({
  items = [],
  onChange,
  disabled = false,
  t,
}) => {
  const inputId = useId()
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [defaultType, setDefaultType] = useState('combined')
  const dragDepth = useRef(0)

  const typeLabel = useCallback(
    (id) => {
      const hit = DOC_TYPES.find((d) => d.id === id)
      return hit ? t(hit.labelKey) : id
    },
    [t],
  )

  // Revoke object URLs only on unmount — parent owns item lifecycle.
  const itemsRef = useRef(items)
  itemsRef.current = items
  useEffect(
    () => () => {
      itemsRef.current.forEach((item) => {
        if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
      })
    },
    [],
  )

  const addFiles = useCallback(
    (fileList) => {
      if (disabled) return
      const incoming = Array.from(fileList || []).filter(isAllowedFile)
      if (!incoming.length) return

      const next = incoming.map((file) => {
        const mime = file.type || (file.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '')
        const isImage = mime.startsWith('image/')
        return {
          id: newId(),
          file,
          name: file.name,
          size: file.size,
          mime,
          docType: defaultType,
          previewUrl: isImage ? URL.createObjectURL(file) : null,
          status: 'ready',
          error: null,
        }
      })
      onChange([...(items || []), ...next])
    },
    [disabled, defaultType, items, onChange],
  )

  const removeItem = useCallback(
    (id) => {
      if (disabled) return
      const target = items.find((i) => i.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      onChange(items.filter((i) => i.id !== id))
    },
    [disabled, items, onChange],
  )

  const updateItem = useCallback(
    (id, patch) => {
      onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))
    },
    [items, onChange],
  )

  const onDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current = 0
    setDragging(false)
    if (disabled) return
    addFiles(e.dataTransfer?.files)
  }

  const onDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current += 1
    if (!disabled) setDragging(true)
  }

  const onDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }

  const onDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const statusMeta = useMemo(
    () => ({
      ready: { label: t('admin.walkIn.docStatusReady'), className: 'text-[var(--admin-fg-muted)]' },
      uploading: { label: t('admin.walkIn.docStatusUploading'), className: 'text-[var(--admin-accent)]' },
      success: { label: t('admin.walkIn.docStatusSuccess'), className: 'text-[var(--admin-success)]' },
      error: { label: t('admin.walkIn.docStatusError'), className: 'text-[var(--admin-danger)]' },
    }),
    [t],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {DOC_TYPES.map((type) => {
          const active = defaultType === type.id
          return (
            <button
              key={type.id}
              type="button"
              disabled={disabled}
              onClick={() => setDefaultType(type.id)}
              className={[
                'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                active
                  ? 'border-[var(--admin-accent)] bg-[color-mix(in_srgb,var(--admin-accent)_10%,white)] text-[var(--admin-accent)] shadow-sm'
                  : 'border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-fg-secondary)] hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-surface-hover)]',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              {t(type.labelKey)}
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-[var(--admin-fg-muted)] leading-relaxed">
        {t('admin.walkIn.docTypePickerHint', { type: typeLabel(defaultType) })}
      </p>

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label={t('admin.walkIn.docDropAria')}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onClick={() => {
          if (!disabled) inputRef.current?.click()
        }}
        onDrop={onDrop}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        className={[
          'group relative overflow-hidden rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-all duration-200',
          dragging
            ? 'border-[var(--admin-accent)] bg-[color-mix(in_srgb,var(--admin-accent)_8%,white)] scale-[1.01] shadow-[var(--admin-shadow)]'
            : 'border-[var(--admin-border)] bg-[linear-gradient(180deg,var(--admin-surface)_0%,var(--admin-surface-2)_100%)] hover:border-[color-mix(in_srgb,var(--admin-accent)_45%,var(--admin-border))] hover:bg-[var(--admin-surface-hover)]',
          disabled ? 'opacity-55 pointer-events-none' : 'cursor-pointer',
        ].join(' ')}
      >
        <div
          className={[
            'mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl transition',
            dragging
              ? 'bg-[color-mix(in_srgb,var(--admin-accent)_18%,white)] text-[var(--admin-accent)]'
              : 'bg-[var(--admin-surface)] text-[var(--admin-fg-muted)] shadow-sm ring-1 ring-[var(--admin-border)] group-hover:text-[var(--admin-accent)]',
          ].join(' ')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 16V4m0 0l-4 4m4-4l4 4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 14.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold text-[var(--admin-fg)]">
          {dragging ? t('admin.walkIn.docDropActive') : t('admin.walkIn.docDropTitle')}
        </p>
        <p className="mt-1.5 text-xs text-[var(--admin-fg-muted)] max-w-md mx-auto leading-relaxed">
          {t('admin.walkIn.docDropHint')}
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-surface)] px-3 py-1 text-[11px] font-medium text-[var(--admin-fg-secondary)] ring-1 ring-[var(--admin-border)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--admin-accent)]" />
          {t('admin.walkIn.docMultiHint')}
        </p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
          multiple
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="space-y-2.5">
          {items.map((item) => {
            const meta = statusMeta[item.status] || statusMeta.ready
            return (
              <li
                key={item.id}
                className={[
                  'flex gap-3 rounded-xl border bg-[var(--admin-surface)] p-3 transition',
                  item.status === 'error'
                    ? 'border-[color-mix(in_srgb,var(--admin-danger)_40%,var(--admin-border))]'
                    : item.status === 'success'
                      ? 'border-[color-mix(in_srgb,var(--admin-success)_35%,var(--admin-border))]'
                      : 'border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]',
                ].join(' ')}
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--admin-surface-2)] ring-1 ring-[var(--admin-border)]">
                  {item.previewUrl ? (
                    <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--admin-fg-muted)]">
                      <FileGlyph mime={item.mime} className="h-8 w-7" />
                    </div>
                  )}
                  {item.status === 'uploading' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--admin-fg)]">{item.name}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--admin-fg-muted)]">
                        {formatBytes(item.size)}
                        <span className="mx-1.5 opacity-40">·</span>
                        <span className={meta.className}>{meta.label}</span>
                      </p>
                    </div>
                    {item.status !== 'uploading' && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => removeItem(item.id)}
                        className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--admin-fg-muted)] hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-danger)] disabled:opacity-40"
                      >
                        {t('admin.walkIn.docRemove')}
                      </button>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`doc-type-${item.id}`}>
                      {t('admin.walkIn.docTypeLabel')}
                    </label>
                    <select
                      id={`doc-type-${item.id}`}
                      disabled={disabled || item.status === 'uploading' || item.status === 'success'}
                      value={item.docType}
                      onChange={(e) => updateItem(item.id, { docType: e.target.value })}
                      className="h-8 max-w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2 text-[11px] font-medium text-[var(--admin-fg)] outline-none focus:shadow-[var(--admin-focus)] disabled:opacity-60"
                    >
                      {DOC_TYPES.map((type) => (
                        <option key={type.id} value={type.id}>
                          {t(type.labelKey)}
                        </option>
                      ))}
                    </select>
                    {item.error ? (
                      <span className="text-[11px] text-[var(--admin-danger)]">{item.error}</span>
                    ) : null}
                  </div>

                  {item.status === 'uploading' && (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--admin-surface-2)]">
                      <div className="h-full w-2/3 animate-pulse rounded-full bg-[var(--admin-accent)]" />
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default WalkInDocumentUploader
export { DOC_TYPES, isAllowedFile, newId as newDocId }
