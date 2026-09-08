import React, { useMemo, useState } from 'react'
import { FilterBar, SearchInput } from './ui/FilterBar'

const EMPTY = {
  search: '',
  customerName: '',
  cin: '',
  phone: '',
  documentNumber: '',
  plate: '',
  vehicleModel: '',
  vehicleId: '',
  pickupFrom: '',
  pickupTo: '',
  returnFrom: '',
  returnTo: '',
  createdFrom: '',
  createdTo: '',
  status: '',
  signatureStatus: '',
  paymentStatus: '',
  source: '',
}

/**
 * Shared Contracts/Invoices filter shell:
 * search + key filters → advanced panel → active chips.
 */
export default function DocumentWorkspaceFilters({
  mode = 'contracts',
  value,
  onChange,
  onApply,
  onClear,
  labels = {},
  vehicles = [],
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const filters = { ...EMPTY, ...value }

  const patch = (key) => (event) => {
    const nextValue = event?.target ? event.target.value : event
    onChange?.({ ...filters, [key]: nextValue })
  }

  const setField = (key, nextValue) => onChange?.({ ...filters, [key]: nextValue })

  const advancedKeys = useMemo(() => {
    const keys = [
      'cin',
      'phone',
      'documentNumber',
      'plate',
      'vehicleModel',
      'vehicleId',
      'pickupFrom',
      'pickupTo',
      'returnFrom',
      'returnTo',
      'createdFrom',
      'createdTo',
      'status',
      'signatureStatus',
    ]
    if (mode === 'invoices') keys.push('paymentStatus', 'source')
    return keys
  }, [mode])

  const advancedActiveCount = advancedKeys.filter((key) => String(filters[key] || '').trim()).length

  const chips = useMemo(() => {
    const items = []
    const push = (key, label, display) => {
      if (!String(filters[key] || '').trim()) return
      items.push({ key, label: `${label}: ${display || filters[key]}` })
    }
    push('search', labels.searchChip || 'Search')
    push('customerName', labels.customerName || 'Customer')
    push('cin', labels.cin || 'CIN / ID')
    push('phone', labels.phone || 'Phone')
    push('documentNumber', labels.documentNumber || (mode === 'invoices' ? 'Invoice #' : 'Contract #'))
    push('plate', labels.plate || 'Plate')
    push('vehicleModel', labels.vehicleModel || 'Vehicle model')
    if (filters.vehicleId) {
      const car = vehicles.find((v) => String(v._id) === String(filters.vehicleId))
      const name = car
        ? `${car.brand || ''} ${car.model || ''}`.trim() + (car.licensePlate ? ` (${car.licensePlate})` : '')
        : filters.vehicleId
      push('vehicleId', labels.vehicle || 'Vehicle', name)
    }
    if (filters.pickupFrom || filters.pickupTo) {
      items.push({
        key: 'pickupRange',
        label: `${labels.pickup || 'Pickup'}: ${filters.pickupFrom || '…'} → ${filters.pickupTo || '…'}`,
        clearKeys: ['pickupFrom', 'pickupTo'],
      })
    }
    if (filters.returnFrom || filters.returnTo) {
      items.push({
        key: 'returnRange',
        label: `${labels.return || 'Return'}: ${filters.returnFrom || '…'} → ${filters.returnTo || '…'}`,
        clearKeys: ['returnFrom', 'returnTo'],
      })
    }
    if (filters.createdFrom || filters.createdTo) {
      items.push({
        key: 'createdRange',
        label: `${labels.created || 'Created'}: ${filters.createdFrom || '…'} → ${filters.createdTo || '…'}`,
        clearKeys: ['createdFrom', 'createdTo'],
      })
    }
    push('status', labels.status || 'Status')
    push('signatureStatus', labels.signatureStatus || 'Signature')
    push('paymentStatus', labels.paymentStatus || 'Payment')
    push('source', labels.source || 'Source')
    return items
  }, [filters, labels, mode, vehicles])

  const clearChip = (chip) => {
    const next = { ...filters }
    const keys = chip.clearKeys || [chip.key]
    keys.forEach((key) => {
      next[key] = ''
    })
    onChange?.(next)
    onApply?.(next)
  }

  const selectClass = (active) =>
    `admin-form-control admin-filter-select${active ? ' is-filtered' : ''}`

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onApply?.(filters)
      }}
      className="admin-docs-filters mb-4"
    >
      <FilterBar className="admin-filter-bar--stack !mb-0 !border-0 !bg-transparent !p-0">
        <div className="admin-filter-bar-row">
          <SearchInput
            value={filters.search}
            onChange={(v) => setField('search', v)}
            placeholder={labels.searchPlaceholder || 'Search…'}
            className={`min-w-[min(100%,280px)] flex-1${filters.search?.trim() ? ' is-filtered' : ''}`}
          />
          <input
            className={selectClass(Boolean(filters.customerName?.trim()))}
            value={filters.customerName}
            onChange={patch('customerName')}
            placeholder={labels.customerName || 'Customer name'}
            aria-label={labels.customerName || 'Customer name'}
          />
          <input
            className={selectClass(Boolean(filters.plate?.trim()))}
            value={filters.plate}
            onChange={patch('plate')}
            placeholder={labels.plate || 'Matricule / plate'}
            aria-label={labels.plate || 'Matricule / plate'}
          />
          <div className="admin-filter-bar-actions">
            <button
              type="button"
              className={advancedActiveCount ? 'admin-btn admin-btn--secondary admin-btn--sm' : 'admin-btn admin-btn--ghost admin-btn--sm'}
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced
                ? (labels.hideAdvanced || 'Hide filters')
                : (labels.showAdvanced || 'Advanced filters')}
              {advancedActiveCount > 0 ? ` (${advancedActiveCount})` : ''}
            </button>
            <button type="submit" className="admin-btn admin-btn--primary admin-btn--sm">
              {labels.apply || 'Apply'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--ghost admin-btn--sm"
              onClick={() => {
                const next = { ...EMPTY }
                onChange?.(next)
                onClear?.(next)
              }}
              disabled={!chips.length}
            >
              {labels.clear || 'Clear'}
            </button>
          </div>
        </div>

        {showAdvanced ? (
          <div className="admin-filter-more">
            <input className="admin-form-control" value={filters.cin} onChange={patch('cin')} placeholder={labels.cin || 'CIN / ID'} aria-label={labels.cin || 'CIN / ID'} />
            <input className="admin-form-control" value={filters.phone} onChange={patch('phone')} placeholder={labels.phone || 'Phone'} aria-label={labels.phone || 'Phone'} />
            <input
              className="admin-form-control"
              value={filters.documentNumber}
              onChange={patch('documentNumber')}
              placeholder={labels.documentNumber || (mode === 'invoices' ? 'Invoice #' : 'Contract #')}
              aria-label={labels.documentNumber || (mode === 'invoices' ? 'Invoice #' : 'Contract #')}
            />
            <input
              className="admin-form-control"
              value={filters.vehicleModel}
              onChange={patch('vehicleModel')}
              placeholder={labels.vehicleModel || 'Vehicle model'}
              aria-label={labels.vehicleModel || 'Vehicle model'}
            />
            <select
              className={selectClass(Boolean(filters.vehicleId))}
              value={filters.vehicleId}
              onChange={patch('vehicleId')}
              aria-label={labels.vehicle || 'Vehicle'}
            >
              <option value="">{labels.allVehicles || 'All vehicles'}</option>
              {vehicles.map((car) => (
                <option key={car._id} value={car._id}>
                  {`${car.brand || ''} ${car.model || ''}`.trim()}
                  {car.licensePlate ? ` · ${car.licensePlate}` : ''}
                </option>
              ))}
            </select>
            <select
              className={selectClass(Boolean(filters.status))}
              value={filters.status}
              onChange={patch('status')}
              aria-label={labels.status || 'Status'}
            >
              <option value="">{labels.allStatuses || 'All statuses'}</option>
              <option value="final">{labels.statusFinal || 'Final'}</option>
              <option value="draft">{labels.statusDraft || 'Draft'}</option>
            </select>
            <select
              className={selectClass(Boolean(filters.signatureStatus))}
              value={filters.signatureStatus}
              onChange={patch('signatureStatus')}
              aria-label={labels.signatureStatus || 'Signature'}
            >
              <option value="">{labels.allSignatures || 'All signatures'}</option>
              <option value="signed">{labels.signed || 'Signed'}</option>
              <option value="unsigned">{labels.unsigned || 'Unsigned'}</option>
            </select>
            {mode === 'invoices' ? (
              <>
                <select
                  className={selectClass(Boolean(filters.paymentStatus))}
                  value={filters.paymentStatus}
                  onChange={patch('paymentStatus')}
                  aria-label={labels.paymentStatus || 'Payment'}
                >
                  <option value="">{labels.allPayments || 'All payments'}</option>
                  <option value="pending">{labels.pending || 'Pending'}</option>
                  <option value="partial">{labels.partial || 'Partial'}</option>
                  <option value="paid">{labels.paid || 'Paid'}</option>
                </select>
                <select
                  className={selectClass(Boolean(filters.source))}
                  value={filters.source}
                  onChange={patch('source')}
                  aria-label={labels.source || 'Source'}
                >
                  <option value="">{labels.allSources || 'All sources'}</option>
                  <option value="booking">{labels.sourceBooking || 'From booking'}</option>
                  <option value="manual">{labels.sourceManual || 'Manual'}</option>
                </select>
              </>
            ) : null}
            <label className="admin-filter-date">
              <span>{labels.pickupFrom || 'Pickup from'}</span>
              <input type="date" className="admin-form-control" value={filters.pickupFrom} onChange={patch('pickupFrom')} />
            </label>
            <label className="admin-filter-date">
              <span>{labels.pickupTo || 'Pickup to'}</span>
              <input type="date" className="admin-form-control" value={filters.pickupTo} onChange={patch('pickupTo')} />
            </label>
            <label className="admin-filter-date">
              <span>{labels.returnFrom || 'Return from'}</span>
              <input type="date" className="admin-form-control" value={filters.returnFrom} onChange={patch('returnFrom')} />
            </label>
            <label className="admin-filter-date">
              <span>{labels.returnTo || 'Return to'}</span>
              <input type="date" className="admin-form-control" value={filters.returnTo} onChange={patch('returnTo')} />
            </label>
            <label className="admin-filter-date">
              <span>{labels.createdFrom || 'Created from'}</span>
              <input type="date" className="admin-form-control" value={filters.createdFrom} onChange={patch('createdFrom')} />
            </label>
            <label className="admin-filter-date">
              <span>{labels.createdTo || 'Created to'}</span>
              <input type="date" className="admin-form-control" value={filters.createdTo} onChange={patch('createdTo')} />
            </label>
          </div>
        ) : null}
      </FilterBar>

      {chips.length > 0 ? (
        <div className="admin-filter-active mt-3" role="status" aria-live="polite">
          <span className="admin-filter-active__label">{labels.activeFilters || 'Active filters'}</span>
          <div className="admin-filter-chips">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className="admin-filter-chip"
                onClick={() => clearChip(chip)}
                title={labels.removeFilter || 'Remove filter'}
              >
                <span className="admin-filter-chip__text">{chip.label}</span>
                <span className="admin-filter-chip__x" aria-hidden="true">×</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="admin-filter-active__clear"
            onClick={() => {
              const next = { ...EMPTY }
              onChange?.(next)
              onClear?.(next)
            }}
          >
            {labels.clearAll || 'Clear all'}
          </button>
        </div>
      ) : null}
    </form>
  )
}

export const EMPTY_DOCUMENT_FILTERS = { ...EMPTY }
