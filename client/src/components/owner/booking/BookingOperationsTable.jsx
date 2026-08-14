import React from 'react'
import ChannelBadge from '../ChannelBadge'
import StatusBadge from '../StatusBadge'
import BookingActionsMenu from './BookingActionsMenu'
import BookingAttentionIndicators from './BookingAttentionIndicators'
import { formatDateShort, resId } from './bookingUtils'

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
          <th>{t('admin.bookings.dates')}</th>
          <th>{t('admin.bookings.status')}</th>
          <th>{t('admin.bookings.paymentStatus')}</th>
          <th>{t('admin.bookings.sign')}</th>
          <th>{t('admin.bookings.total')}</th>
          <th className="text-right">{t('admin.bookings.actions')}</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr><td colSpan={9} className="!p-4">{skeleton}</td></tr>
        ) : bookings.length === 0 ? (
          <tr><td colSpan={9} className="!p-0">{emptyState}</td></tr>
        ) : (
          bookings.map((booking) => {
            const sig = booking.completion?.signatureRequestStatus || (booking.completion?.signatureComplete ? 'signed' : 'none')
            return (
              <tr
                key={booking._id}
                className={selectedId === booking._id ? 'is-selected' : ''}
                onClick={() => onSelect(booking)}
              >
                <td>
                  <p className="font-medium text-[var(--admin-accent)]">{resId(booking)}</p>
                  <ChannelBadge channel={booking.channel || 'online'} className="mt-0.5" />
                  <BookingAttentionIndicators booking={booking} compact />
                </td>
                <td>
                  <p className="font-medium truncate max-w-[9rem]">{booking.customerName || t('admin.common.guest')}</p>
                  <p className="text-[11px] text-[var(--admin-fg-muted)] truncate max-w-[9rem]">{booking.customerPhone || '—'}</p>
                </td>
                <td>
                  <p className="text-sm truncate max-w-[8rem]">{booking.car?.brand} {booking.car?.model}</p>
                  {booking.car?.licensePlate && (
                    <p className="text-[10px] text-[var(--admin-fg-muted)]">{booking.car.licensePlate}</p>
                  )}
                </td>
                <td className="text-[11px] text-[var(--admin-fg-secondary)] whitespace-nowrap">
                  {formatDateShort(booking.pickupDate)}
                  <br />
                  <span className="text-[var(--admin-fg-muted)]">→ {formatDateShort(booking.returnDate)}</span>
                </td>
                <td><StatusBadge status={booking.status} /></td>
                <td><StatusBadge status={booking.paymentStatus} /></td>
                <td><StatusBadge status={sig} /></td>
                <td className="tabular-nums font-medium whitespace-nowrap">{currency}{booking.price}</td>
                <td className="align-middle" onClick={(e) => e.stopPropagation()}>
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
