import React from 'react'

/**
 * Shared bulk-selection toolbar (Reservations, Contracts, …).
 * Hidden when count is 0.
 */
const BulkSelectionBar = ({
  count,
  onClear,
  onDelete,
  busy = false,
  selectedCountLabel,
  clearLabel,
  deleteLabel,
  ariaLabel,
}) => {
  if (!count || count < 1) return null

  return (
    <div className="admin-booking-bulkbar" role="region" aria-label={ariaLabel}>
      <div className="admin-booking-bulkbar__info">
        <span className="admin-booking-bulkbar__count">{selectedCountLabel}</span>
        <button type="button" className="admin-booking-bulkbar__clear" onClick={onClear} disabled={busy}>
          {clearLabel}
        </button>
      </div>
      <button
        type="button"
        className="admin-btn admin-btn--danger"
        onClick={onDelete}
        disabled={busy}
      >
        {deleteLabel}
      </button>
    </div>
  )
}

export default BulkSelectionBar
