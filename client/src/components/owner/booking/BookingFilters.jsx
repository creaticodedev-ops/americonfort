import React from 'react'
import { useI18n } from '../../../i18n/I18nContext'
import { Icon } from '../ui/adminIcons'
import { AdminFormInput } from '../ui'
import { resolveOpsScope } from './bookingUtils'

const OPS_CHIP_IDS = ['all', 'attention', 'pickupToday', 'returnToday', 'onRent', 'ready', 'unpaid']

/**
 * Operational scopes + unified search + collapsible advanced filters.
 */
const BookingFilters = ({
  filters,
  onChange,
  onApply,
  onClear,
  onApplyScope,
  showAdvanced,
  onToggleAdvanced,
  total,
  inputClass,
  labelClass,
}) => {
  const { t } = useI18n()
  const activeScope = resolveOpsScope(filters)

  const set = (key, value) => onChange({ ...filters, [key]: value })

  const applyQuick = (e) => {
    e?.preventDefault()
    onApply()
  }

  const activeAdvancedCount = [
    filters.phone,
    filters.email,
    filters.vehicle,
    filters.licensePlate,
    filters.pickupLocation,
    filters.reservationId,
    filters.customerName,
    filters.channel,
    filters.status && activeScope === 'custom' ? filters.status : '',
    filters.paymentStatus && activeScope === 'custom' ? filters.paymentStatus : '',
    filters.pickupDateFrom && activeScope === 'custom' ? filters.pickupDateFrom : '',
    filters.returnDateFrom && activeScope === 'custom' ? filters.returnDateFrom : '',
  ].filter(Boolean).length

  return (
    <div className="admin-booking-filters">
      <div className="admin-booking-ops" role="toolbar" aria-label={t('admin.bookings.opsAria')}>
        {OPS_CHIP_IDS.map((id) => {
          const active = activeScope === id
          return (
            <button
              key={id}
              type="button"
              className={`admin-booking-ops__chip${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => onApplyScope?.(id)}
            >
              {t(`admin.bookings.ops.${id}`)}
            </button>
          )
        })}
      </div>

      <form onSubmit={applyQuick} className="admin-booking-filters-quick">
        <label className="admin-booking-filters-search admin-booking-filters-search--main">
          <Icon name="search" className="admin-booking-filters-search-icon" />
          <span className="sr-only">{t('admin.bookings.searchLabel')}</span>
          <input
            type="search"
            className="admin-booking-filters-search-input"
            placeholder={t('admin.bookings.searchPlaceholder')}
            value={filters.search || ''}
            onChange={(e) => set('search', e.target.value)}
            autoComplete="off"
          />
        </label>
        <button type="submit" className="admin-btn admin-btn--primary admin-booking-filters-search-btn">
          {t('admin.common.search')}
        </button>
        <button
          type="button"
          className={`admin-btn admin-btn--ghost admin-booking-filters-toggle${showAdvanced ? ' is-open' : ''}`}
          onClick={onToggleAdvanced}
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? t('admin.bookings.hideFilters') : t('admin.bookings.showFilters')}
          {activeAdvancedCount > 0 && !showAdvanced ? (
            <span className="admin-booking-filters-toggle-count">{activeAdvancedCount}</span>
          ) : null}
        </button>
        <span className="admin-booking-filters-count">
          {total === 1
            ? t('admin.bookings.count', { count: total })
            : t('admin.bookings.count_plural', { count: total })}
        </span>
      </form>

      {showAdvanced && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onApply()
          }}
          className="admin-booking-filters-advanced"
        >
          <div>
            <label className={labelClass}>{t('admin.bookings.reservationId')}</label>
            <AdminFormInput
              value={filters.reservationId}
              onChange={(e) => set('reservationId', e.target.value)}
              placeholder={t('admin.bookings.reservationId')}
            />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.customerName')}</label>
            <AdminFormInput
              value={filters.customerName}
              onChange={(e) => set('customerName', e.target.value)}
              placeholder={t('admin.bookings.customerName')}
            />
          </div>
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
            <select
              className={inputClass}
              value={filters.paymentStatus}
              onChange={(e) => set('paymentStatus', e.target.value)}
            >
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
            <input
              type="date"
              className={inputClass}
              value={filters.pickupDateFrom}
              onChange={(e) => set('pickupDateFrom', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.pickupTo')}</label>
            <input
              type="date"
              className={inputClass}
              value={filters.pickupDateTo}
              onChange={(e) => set('pickupDateTo', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.returnFrom')}</label>
            <input
              type="date"
              className={inputClass}
              value={filters.returnDateFrom || ''}
              onChange={(e) => set('returnDateFrom', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{t('admin.bookings.returnTo')}</label>
            <input
              type="date"
              className={inputClass}
              value={filters.returnDateTo || ''}
              onChange={(e) => set('returnDateTo', e.target.value)}
            />
          </div>
          <div className="admin-booking-filters-advanced-actions">
            <button type="submit" className="admin-btn admin-btn--primary">
              {t('admin.bookings.applyFilters')}
            </button>
            <button type="button" onClick={onClear} className="admin-btn admin-btn--secondary">
              {t('admin.bookings.clear')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default BookingFilters
