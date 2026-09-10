import React from 'react'
import ChannelBadge from '../ChannelBadge'
import StatusBadge from '../StatusBadge'
import BookingActionsMenu from './BookingActionsMenu'
import {
  formatDateTimeCompact,
  getBookingAttention,
  locationShort,
  resId,
  vehicleTitle,
} from './bookingUtils'

/**
 * Desktop reservations table — fixed layout, sticky actions, no horizontal scroll.
 */
const BookingOperationsTable = ({
  bookings,
  loading,
  selectedId,
  selectedIds,
  allVisibleSelected,
  someVisibleSelected,
  currency,
  t,
  onSelect,
  onToggleSelect,
  onToggleSelectAll,
  buildMoreItems,
  emptyState,
  skeleton,
}) => {
  const selectedSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds || [])

  return (
    <div className="admin-booking-table-scroll">
      <table className="admin-table admin-booking-ops-table">
        <colgroup>
          <col className="admin-booking-ops-table__col-check" />
          <col className="admin-booking-ops-table__col-res" />
          <col className="admin-booking-ops-table__col-client" />
          <col className="admin-booking-ops-table__col-vehicle" />
          <col className="admin-booking-ops-table__col-schedule" />
          <col className="admin-booking-ops-table__col-status" />
          <col className="admin-booking-ops-table__col-total" />
          <col className="admin-booking-ops-table__col-actions" />
        </colgroup>
        <thead>
          <tr>
            <th className="admin-booking-ops-table__check" scope="col">
              <label className="admin-booking-check">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = Boolean(someVisibleSelected && !allVisibleSelected)
                  }}
                  onChange={onToggleSelectAll}
                  aria-label={t('admin.bookings.selectAllVisible')}
                />
              </label>
            </th>
            <th scope="col">{t('admin.bookings.reservation')}</th>
            <th scope="col">{t('admin.bookings.customer')}</th>
            <th scope="col">{t('admin.bookings.vehicle')}</th>
            <th scope="col">{t('admin.bookings.schedule')}</th>
            <th scope="col">{t('admin.bookings.status')}</th>
            <th className="text-end" scope="col">{t('admin.bookings.total')}</th>
            <th className="admin-booking-ops-table__actions text-end" scope="col">
              <span className="sr-only">{t('admin.bookings.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={8} className="!p-4">
                {skeleton}
              </td>
            </tr>
          ) : bookings.length === 0 ? (
            <tr>
              <td colSpan={8} className="!p-0">
                {emptyState}
              </td>
            </tr>
          ) : (
            bookings.map((booking) => {
              const { sigStatus, paymentOutstanding, signatureNeedsAttention } = getBookingAttention(booking)
              const needsEye = paymentOutstanding || signatureNeedsAttention || booking.status === 'pending'
              const isChecked = selectedSet.has(booking._id)
              return (
                <tr
                  key={booking._id}
                  className={`${selectedId === booking._id ? 'is-selected' : ''}${needsEye ? ' is-attention' : ''}${isChecked ? ' is-checked' : ''}`}
                  onClick={() => onSelect(booking)}
                >
                  <td
                    className="admin-booking-ops-table__check"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label className="admin-booking-check">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleSelect(booking._id)}
                        aria-label={t('admin.bookings.selectReservation', { id: resId(booking) })}
                      />
                    </label>
                  </td>

                  <td>
                    <div className="admin-booking-cell-ref">
                      <span className="admin-booking-cell-ref__id">{resId(booking)}</span>
                      <ChannelBadge
                        channel={booking.channel || 'online'}
                        className="admin-booking-cell-ref__channel"
                      />
                    </div>
                  </td>

                  <td>
                    <div className="admin-booking-cell-person">
                      <span className="admin-booking-cell-person__name">
                        {booking.customerName || t('admin.common.guest')}
                      </span>
                      <span className="admin-booking-cell-person__sub">
                        {booking.customerPhone || '—'}
                      </span>
                    </div>
                  </td>

                  <td>
                    <div className="admin-booking-cell-vehicle">
                      <span className="admin-booking-cell-vehicle__title">{vehicleTitle(booking.car)}</span>
                      {booking.car?.licensePlate ? (
                        <span className="admin-booking-plate">{booking.car.licensePlate}</span>
                      ) : null}
                    </div>
                  </td>

                  <td>
                    <div className="admin-booking-cell-schedule">
                      <div className="admin-booking-cell-schedule__row">
                        <span className="admin-booking-cell-schedule__tag is-out" title={t('admin.bookings.outShort')}>
                          {t('admin.bookings.outShort')}
                        </span>
                        <div className="admin-booking-cell-schedule__body">
                          <span className="admin-booking-cell-schedule__when">
                            {formatDateTimeCompact(booking.pickupDate)}
                          </span>
                          <span className="admin-booking-cell-schedule__loc">
                            {locationShort(booking.pickupLocation)}
                          </span>
                        </div>
                      </div>
                      <div className="admin-booking-cell-schedule__row">
                        <span className="admin-booking-cell-schedule__tag is-in" title={t('admin.bookings.inShort')}>
                          {t('admin.bookings.inShort')}
                        </span>
                        <div className="admin-booking-cell-schedule__body">
                          <span className="admin-booking-cell-schedule__when">
                            {formatDateTimeCompact(booking.returnDate)}
                          </span>
                          <span className="admin-booking-cell-schedule__loc">
                            {locationShort(booking.returnLocation)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className="admin-booking-cell-status">
                      <StatusBadge status={booking.status} className="admin-badge--compact" />
                      <div className="admin-booking-cell-status__row" aria-label={t('admin.bookings.status')}>
                        <StatusBadge status={booking.paymentStatus} className="admin-badge--compact" />
                        <StatusBadge status={sigStatus} className="admin-badge--compact" />
                      </div>
                    </div>
                  </td>

                  <td className="text-end">
                    <span className="admin-booking-cell-total tabular-nums">
                      <span className="admin-booking-cell-total__currency">{currency}</span>
                      {Number(booking.price || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </td>

                  <td
                    className="admin-booking-ops-table__actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <BookingActionsMenu
                      t={t}
                      size="sm"
                      onView={() => onSelect(booking)}
                      items={buildMoreItems(booking)}
                    />
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

export default BookingOperationsTable
