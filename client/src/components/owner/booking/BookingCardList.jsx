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

const BookingCardList = ({
  bookings,
  selectedId,
  selectedIds,
  currency,
  t,
  onSelect,
  onToggleSelect,
  buildMoreItems,
}) => {
  const selectedSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds || [])

  return (
    <div className="admin-booking-card-list">
      {bookings.map((booking) => {
        const { sigStatus, paymentOutstanding, signatureNeedsAttention } = getBookingAttention(booking)
        const needsEye = paymentOutstanding || signatureNeedsAttention || booking.status === 'pending'
        const isChecked = selectedSet.has(booking._id)
        return (
          <article
            key={booking._id}
            className={`admin-booking-card-v2${selectedId === booking._id ? ' is-selected' : ''}${needsEye ? ' is-attention' : ''}${isChecked ? ' is-checked' : ''}`}
          >
            <label
              className="admin-booking-card-v2-check"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggleSelect(booking._id)}
                aria-label={t('admin.bookings.selectReservation', { id: resId(booking) })}
              />
            </label>
            <button type="button" className="admin-booking-card-v2-main" onClick={() => onSelect(booking)}>
              <div className="admin-booking-card-v2-top">
                <div className="min-w-0">
                  <div className="admin-booking-card-v2-id-row">
                    <span className="admin-booking-cell-ref__id">{resId(booking)}</span>
                    <ChannelBadge channel={booking.channel || 'online'} />
                  </div>
                  <p className="admin-booking-card-v2-name">
                    {booking.customerName || t('admin.common.guest')}
                  </p>
                  <p className="admin-booking-card-v2-vehicle">
                    {vehicleTitle(booking.car)}
                    {booking.car?.licensePlate ? (
                      <span className="admin-booking-plate">{booking.car.licensePlate}</span>
                    ) : null}
                  </p>
                </div>
                <div className="admin-booking-card-v2-right">
                  <StatusBadge status={booking.status} />
                  <span className="admin-booking-cell-total tabular-nums">
                    {currency}
                    {Number(booking.price || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              <div className="admin-booking-card-v2-schedule">
                <div>
                  <span className="admin-booking-cell-schedule__tag is-out">{t('admin.bookings.outShort')}</span>
                  <span>{formatDateTimeCompact(booking.pickupDate)}</span>
                  <span className="text-[var(--admin-fg-muted)]"> · {locationShort(booking.pickupLocation)}</span>
                </div>
                <div>
                  <span className="admin-booking-cell-schedule__tag is-in">{t('admin.bookings.inShort')}</span>
                  <span>{formatDateTimeCompact(booking.returnDate)}</span>
                  <span className="text-[var(--admin-fg-muted)]"> · {locationShort(booking.returnLocation)}</span>
                </div>
              </div>

              <div className="admin-booking-card-v2-meta">
                <StatusBadge status={booking.paymentStatus} />
                <StatusBadge status={sigStatus} />
                <BookingAttentionIndicators booking={booking} compact />
              </div>
            </button>
            <div className="admin-booking-card-v2-actions" onClick={(e) => e.stopPropagation()}>
              <BookingActionsMenu
                t={t}
                onView={() => onSelect(booking)}
                items={buildMoreItems(booking)}
              />
            </div>
          </article>
        )
      })}
    </div>
  )
}

export default BookingCardList
