import React from 'react'
import { useI18n } from '../../../i18n/I18nContext'
import { AdminFormInput } from '../ui'

/**
 * Quick search + collapsible advanced filters for reservations workspace.
 */
const BookingFilters = ({
  filters,
  onChange,
  onApply,
  onClear,
  showAdvanced,
  onToggleAdvanced,
  total,
  inputClass,
  labelClass,
}) => {
  const { t } = useI18n()

  const set = (key, value) => onChange({ ...filters, [key]: value })

  const applyQuick = (e) => {
    e?.preventDefault()
    onApply()
  }

  return (
    <div className="admin-booking-filters">
      <form onSubmit={applyQuick} className="admin-booking-filters-quick">
        <div className="admin-booking-filters-search">
          <label className="sr-only" htmlFor="booking-search-id">{t('admin.bookings.reservationId')}</label>
          <AdminFormInput
            id="booking-search-id"
            placeholder={t('admin.bookings.reservationId')}
            value={filters.reservationId}
            onChange={(e) => set('reservationId', e.target.value)}
          />
        </div>
        <div className="admin-booking-filters-search">
          <label className="sr-only" htmlFor="booking-search-name">{t('admin.bookings.customerName')}</label>
          <AdminFormInput
            id="booking-search-name"
            placeholder={t('admin.bookings.customerName')}
            value={filters.customerName}
            onChange={(e) => set('customerName', e.target.value)}
          />
        </div>
        <button type="submit" className="admin-btn admin-btn--primary admin-booking-filters-search-btn">
          {t('admin.common.search')}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--ghost admin-booking-filters-toggle"
          onClick={onToggleAdvanced}
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? t('admin.bookings.hideFilters') : t('admin.bookings.showFilters')}
        </button>
        <span className="admin-booking-filters-count">
          {total === 1 ? t('admin.bookings.count', { count: total }) : t('admin.bookings.count_plural', { count: total })}
        </span>
      </form>

      {showAdvanced && (
        <form
          onSubmit={(e) => { e.preventDefault(); onApply() }}
          className="admin-booking-filters-advanced"
        >
          {[
            ['phone', t('admin.bookings.phone'), 'Phone'],
            ['email', t('admin.bookings.email'), 'Email'],
            ['vehicle', t('admin.bookings.vehicle'), 'Brand or model'],
            ['licensePlate', t('admin.bookings.licensePlate'), t('admin.bookings.licensePlatePlaceholder')],
            ['pickupLocation', t('admin.bookings.pickupLocation'), 'Location'],
          ].map(([key, label, ph]) => (
            <div key={key}>
              <label className={labelClass}>{label}</label>
              <input
                className={inputClass}
                value={filters[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={ph}
              />
            </div>
          ))}
          <div>
            <label className={labelClass}>{t('admin.bookings.status')}</label>
            <select className={inputClass} value={filters.status} onChange={(e) => set('status', e.target.value)}>
              <option value="">{t('admin.common.allStatuses')}</option>
              <option value="pending">{t('admin.status.pending')}</option>
              <option value="confirmed">{t('admin.status.confirmed')}</option>
              <option value="ready_for_pickup">{t('admin.status.ready_for_pickup')}</option>
              <option value="active">{t('admin.status.active')}</option>
              <option value="completed">{t('admin.status.completed')}</option>
              <option value="cancelled">{t('admin.status.cancelled')}</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.paymentStatus')}</label>
            <select className={inputClass} value={filters.paymentStatus} onChange={(e) => set('paymentStatus', e.target.value)}>
              <option value="">{t('admin.bookingsUi.allPayments')}</option>
              <option value="pending">{t('admin.status.pending')}</option>
              <option value="paid">{t('admin.status.paid')}</option>
              <option value="failed">{t('admin.status.failed')}</option>
              <option value="refunded">{t('admin.status.refunded')}</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.channel')}</label>
            <select className={inputClass} value={filters.channel} onChange={(e) => set('channel', e.target.value)}>
              <option value="">{t('admin.bookingsUi.allChannels')}</option>
              <option value="online">{t('admin.bookingsUi.online')}</option>
              <option value="walk_in">{t('admin.bookingsUi.walkIn')}</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.pickupFrom')}</label>
            <input type="date" className={inputClass} value={filters.pickupDateFrom} onChange={(e) => set('pickupDateFrom', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.pickupTo')}</label>
            <input type="date" className={inputClass} value={filters.pickupDateTo} onChange={(e) => set('pickupDateTo', e.target.value)} />
          </div>
          <div className="admin-booking-filters-advanced-actions">
            <button type="submit" className="admin-btn admin-btn--primary">{t('admin.bookings.applyFilters')}</button>
            <button type="button" onClick={onClear} className="admin-btn admin-btn--secondary">{t('admin.bookings.clear')}</button>
          </div>
        </form>
      )}
    </div>
  )
}

export default BookingFilters
