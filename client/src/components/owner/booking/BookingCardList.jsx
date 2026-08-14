import React from 'react'
import ChannelBadge from '../ChannelBadge'
import StatusBadge from '../StatusBadge'
import BookingActionsMenu from './BookingActionsMenu'
import BookingAttentionIndicators from './BookingAttentionIndicators'
import { formatDateShort, resId } from './bookingUtils'

const BookingCardList = ({
  bookings,
  selectedId,
  currency,
  t,
  onSelect,
  buildMoreItems,
}) => (
  <div className="admin-booking-card-list">
    {bookings.map((booking) => {
      const sig = booking.completion?.signatureRequestStatus || (booking.completion?.signatureComplete ? 'signed' : 'none')
      return (
        <article
          key={booking._id}
          className={`admin-booking-card-v2 ${selectedId === booking._id ? 'is-selected' : ''}`}
        >
          <button type="button" className="admin-booking-card-v2-main" onClick={() => onSelect(booking)}>
            <div className="admin-booking-card-v2-top">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--admin-accent)]">{resId(booking)}</p>
                <p className="truncate text-sm font-medium text-[var(--admin-fg)]">{booking.customerName || t('admin.common.guest')}</p>
                <p className="truncate text-xs text-[var(--admin-fg-muted)]">
                  {booking.car?.brand} {booking.car?.model}
                  {booking.car?.licensePlate ? ` · ${booking.car.licensePlate}` : ''}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <StatusBadge status={booking.status} />
                <span className="text-sm font-semibold tabular-nums">{currency}{booking.price}</span>
              </div>
            </div>
            <div className="admin-booking-card-v2-meta">
              <ChannelBadge channel={booking.channel || 'online'} />
              <StatusBadge status={booking.paymentStatus} />
              <StatusBadge status={sig} />
              <BookingAttentionIndicators booking={booking} compact />
            </div>
            <p className="text-[11px] text-[var(--admin-fg-muted)]">
              {formatDateShort(booking.pickupDate)} → {formatDateShort(booking.returnDate)}
            </p>
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

export default BookingCardList
