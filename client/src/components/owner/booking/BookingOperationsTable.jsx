import React from 'react'
import ChannelBadge from '../ChannelBadge'
import StatusBadge from '../StatusBadge'
import BookingActionsMenu from './BookingActionsMenu'
import BookingAttentionIndicators from './BookingAttentionIndicators'
import {
  formatDateTimeCompact,
  getBookingAttention,
  locationShort,
  resId,
  vehicleTitle,
} from './bookingUtils'

const BookingOperationsTable = ({
  bookings,
  loading,
  selectedId,
  currency,
  t,
  onSelect,
  buildMoreItems,
  emptyState,
  skeleton,
}) => (
  <div className="admin-booking-table-scroll">
    <table className="admin-table admin-booking-ops-table">
      <thead>
        <tr>
          <th>{t('admin.bookings.reservation')}</th>
          <th>{t('admin.bookings.customer')}</th>
          <th>{t('admin.bookings.vehicle')}</th>
          <th>{t('admin.bookings.schedule')}</th>
          <th>{t('admin.bookings.status')}</th>
          <th className="text-end">{t('admin.bookings.total')}</th>
          <th className="text-end">{t('admin.bookings.actions')}</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr>
            <td colSpan={7} className="!p-4">
              {skeleton}
            </td>
          </tr>
        ) : bookings.length === 0 ? (
          <tr>
            <td colSpan={7} className="!p-0">
              {emptyState}
            </td>
          </tr>
        ) : (
          bookings.map((booking) => {
            const { sigStatus, paymentOutstanding, signatureNeedsAttention } = getBookingAttention(booking)
            const needsEye = paymentOutstanding || signatureNeedsAttention || booking.status === 'pending'
            return (
              <tr
                key={booking._id}
                className={`${selectedId === booking._id ? 'is-selected' : ''}${needsEye ? ' is-attention' : ''}`}
                onClick={() => onSelect(booking)}
              >
                <td>
                  <div className="admin-booking-cell-ref">
                    <span className="admin-booking-cell-ref__id">{resId(booking)}</span>
                    <div className="admin-booking-cell-ref__meta">
                      <ChannelBadge channel={booking.channel || 'online'} />
                      <BookingAttentionIndicators booking={booking} compact />
                    </div>
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
                      <span className="admin-booking-cell-schedule__tag is-out">
                        {t('admin.bookings.outShort')}
                      </span>
                      <span className="admin-booking-cell-schedule__when">
                        {formatDateTimeCompact(booking.pickupDate)}
                      </span>
                      <span className="admin-booking-cell-schedule__loc">
                        {locationShort(booking.pickupLocation)}
                      </span>
                    </div>
                    <div className="admin-booking-cell-schedule__row">
                      <span className="admin-booking-cell-schedule__tag is-in">
                        {t('admin.bookings.inShort')}
                      </span>
                      <span className="admin-booking-cell-schedule__when">
                        {formatDateTimeCompact(booking.returnDate)}
                      </span>
                      <span className="admin-booking-cell-schedule__loc">
                        {locationShort(booking.returnLocation)}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="admin-booking-cell-status">
                    <StatusBadge status={booking.status} />
                    <div className="admin-booking-cell-status__row">
                      <StatusBadge status={booking.paymentStatus} />
                      <StatusBadge status={sigStatus} />
                    </div>
                  </div>
                </td>
                <td className="text-end">
                  <span className="admin-booking-cell-total tabular-nums">
                    {currency}
                    {Number(booking.price || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </td>
                <td className="align-middle text-end" onClick={(e) => e.stopPropagation()}>
                  <BookingActionsMenu
                    t={t}
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

export default BookingOperationsTable
