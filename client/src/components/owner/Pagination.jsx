import React from 'react'

const Pagination = ({ page, totalPages, total, limit, onPageChange }) => {
  if (!totalPages || totalPages <= 1) return null

  const hasRange = Number.isFinite(total) && Number.isFinite(limit) && limit > 0
  const start = hasRange ? (page - 1) * limit + 1 : null
  const end = hasRange ? Math.min(page * limit, total) : null

  const pages = []
  const maxVisible = 5
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2))
  let endPage = Math.min(totalPages, startPage + maxVisible - 1)
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1)
  }

  for (let i = startPage; i <= endPage; i++) pages.push(i)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 text-sm text-[var(--admin-fg-muted)]">
      <p className="text-xs sm:text-sm text-center sm:text-left">
        {hasRange ? `Showing ${start}–${end} of ${total} results` : `Page ${page} of ${totalPages}`}
      </p>
      <div className="flex items-center gap-1 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="admin-btn admin-btn--secondary h-8 px-2.5 disabled:opacity-40"
        >
          Prev
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`min-w-8 h-8 px-2.5 rounded-[var(--admin-radius)] text-sm cursor-pointer border ${
              p === page
                ? 'bg-[var(--admin-accent)] text-white border-[var(--admin-accent)]'
                : 'border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-fg-secondary)] hover:bg-[var(--admin-surface-hover)]'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="admin-btn admin-btn--secondary h-8 px-2.5 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default Pagination
