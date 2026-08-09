import React from 'react'

/**
 * Shared document PDF generation progress UI.
 * Progress bar is indeterminate while `status === 'running'` and completes
 * only when the real request succeeds. Never uses a fake percentage timer.
 */
const DocumentPdfProgress = ({
  status = 'idle',
  title,
  subtitle,
  stages = [],
  errorMessage,
  onRetry,
  retryLabel = 'Retry',
  variant = 'card',
  className = '',
}) => {
  if (status === 'idle') return null

  const showBar = status === 'running' || status === 'success'
  const barDone = status === 'success'

  const body = (
    <div
      className={`w-full max-w-md rounded-2xl border border-borderColor bg-white p-5 sm:p-6 shadow-[0_16px_40px_-24px_rgba(22,18,16,0.35)] ${className}`}
      role="status"
      aria-live="polite"
      aria-busy={status === 'running'}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
            status === 'success'
              ? 'bg-emerald-100 text-emerald-700'
              : status === 'error'
                ? 'bg-red-100 text-red-700'
                : 'bg-primary/10 text-primary'
          }`}
        >
          {status === 'success' ? '✓' : status === 'error' ? '!' : (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl text-ink leading-snug">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
      </div>

      {showBar ? (
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-sand">
          <div
            className={`h-full rounded-full bg-primary transition-[width] duration-500 ease-out ${
              barDone ? 'w-full' : 'doc-pdf-progress-indeterminate'
            }`}
          />
        </div>
      ) : null}

      {stages.length > 0 ? (
        <ol className="mt-5 space-y-2.5">
          {stages.map((stage) => {
            const state = stage.state || 'pending'
            return (
              <li key={stage.id} className="flex items-center gap-2.5 text-sm">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    state === 'done'
                      ? 'bg-emerald-600 text-white'
                      : state === 'active'
                        ? 'bg-primary text-white'
                        : state === 'error'
                          ? 'bg-red-600 text-white'
                          : 'bg-sand text-muted'
                  }`}
                >
                  {state === 'done' ? '✓' : state === 'error' ? '!' : state === 'active' ? '…' : ''}
                </span>
                <span
                  className={
                    state === 'done' || state === 'active'
                      ? 'font-medium text-ink'
                      : state === 'error'
                        ? 'font-medium text-red-700'
                        : 'text-muted'
                  }
                >
                  {stage.label}
                </span>
              </li>
            )
          })}
        </ol>
      ) : null}

      {status === 'error' ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-3">
          <p className="text-sm text-red-800">
            {errorMessage || 'Something went wrong while generating the document.'}
          </p>
          {typeof onRetry === 'function' ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dull"
            >
              {retryLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )

  if (variant === 'overlay') {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/75 p-4 backdrop-blur-[2px]">
        {body}
      </div>
    )
  }

  if (variant === 'inline') {
    return body
  }

  return (
    <div className="flex w-full justify-center py-2">
      {body}
    </div>
  )
}

/** Build stage states tied to real job status (no timers). */
export function buildPdfJobStages(status, labels) {
  const signed = labels.signed || labels.saved
  const generating = labels.generating
  const ready = labels.ready

  const stages = []
  if (signed) {
    stages.push({
      id: 'signed',
      label: signed,
      state: status === 'idle' ? 'pending' : 'done',
    })
  }
  if (generating) {
    let state = 'pending'
    if (status === 'running') state = 'active'
    else if (status === 'success') state = 'done'
    else if (status === 'error') state = 'error'
    stages.push({ id: 'generating', label: generating, state })
  }
  if (ready) {
    stages.push({
      id: 'ready',
      label: ready,
      state: status === 'success' ? 'done' : 'pending',
    })
  }
  return stages
}

export default DocumentPdfProgress
