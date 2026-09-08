import React from 'react'

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
  download: (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
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
  trash: (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7h14M9 7V5h6v2m-8 0l.8 12h8.4L17 7" />
    </svg>
  ),
}

const baseBtn =
  'doc-row-action inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 ' +
  'disabled:opacity-40 disabled:pointer-events-none cursor-pointer'

/**
 * Compact document row actions for Contracts & Invoices.
 */
export default function DocumentRowActions({
  labels = {},
  onEdit,
  onPreview,
  onDownload,
  onPrint,
  onWhatsApp,
  onDelete,
  whatsappBusy = false,
  printBusy = false,
}) {
  const run = (fn) => (event) => {
    event.stopPropagation()
    fn?.()
  }

  return (
    <div className="doc-row-actions flex items-center justify-end gap-1" role="group" aria-label={labels.actions || 'Actions'}>
      {onEdit ? (
        <button
          type="button"
          onClick={run(onEdit)}
          title={labels.edit || 'Edit'}
          aria-label={labels.edit || 'Edit'}
          className={`${baseBtn} border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-fg-secondary)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-fg)]`}
        >
          {Icons.pencil}
        </button>
      ) : null}
      {onPreview ? (
        <button
          type="button"
          onClick={run(onPreview)}
          title={labels.preview || 'Preview'}
          aria-label={labels.preview || 'Preview'}
          className={`${baseBtn} border-primary/20 bg-primary text-white shadow-sm hover:bg-primary-dull`}
        >
          {Icons.eye}
        </button>
      ) : null}
      {onDownload ? (
        <button
          type="button"
          onClick={run(onDownload)}
          title={labels.download || 'Download'}
          aria-label={labels.download || 'Download'}
          className={`${baseBtn} border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-fg-secondary)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-fg)]`}
        >
          {Icons.download}
        </button>
      ) : null}
      {onPrint ? (
        <button
          type="button"
          onClick={run(onPrint)}
          disabled={printBusy}
          title={labels.print || 'Print'}
          aria-label={labels.print || 'Print'}
          className={`${baseBtn} border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-fg-secondary)] hover:bg-[var(--admin-surface-2)] hover:text-[var(--admin-fg)]`}
        >
          {Icons.print}
        </button>
      ) : null}
      {onWhatsApp ? (
        <button
          type="button"
          onClick={run(onWhatsApp)}
          disabled={whatsappBusy}
          title={labels.whatsapp || 'Share via WhatsApp'}
          aria-label={labels.whatsapp || 'Share via WhatsApp'}
          className={`${baseBtn} border-emerald-200/80 bg-white text-[#128C7E] hover:bg-emerald-50 hover:border-emerald-300`}
        >
          {Icons.whatsapp}
        </button>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          onClick={run(onDelete)}
          title={labels.delete || 'Delete'}
          aria-label={labels.delete || 'Delete'}
          className={`${baseBtn} border-red-200/80 bg-white text-red-600 hover:bg-red-50 hover:border-red-300`}
        >
          {Icons.trash}
        </button>
      ) : null}
    </div>
  )
}
