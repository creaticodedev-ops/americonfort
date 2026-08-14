import React from 'react'
import { useI18n } from '../../../i18n/I18nContext'
import StatusBadge from '../StatusBadge'
import { getBookingAttention } from './bookingUtils'

/**
 * Compact attention row: payment, signature, contract.
 */
const BookingAttentionIndicators = ({ booking, compact = false, showLabels = false }) => {
  const { t } = useI18n()
  const { paymentOutstanding, signatureNeedsAttention, contractMissing, sigStatus } =
    getBookingAttention(booking)

  if (compact) {
    return (
      <div className="admin-booking-attention admin-booking-attention--compact" aria-label={t('admin.bookings.completionProgress')}>
        {paymentOutstanding && (
          <span className="admin-booking-attention-dot admin-booking-attention-dot--payment" title={t('admin.bookings.pay')} />
        )}
        {signatureNeedsAttention && (
          <span className="admin-booking-attention-dot admin-booking-attention-dot--signature" title={t('admin.bookings.sign')} />
        )}
        {contractMissing && (
          <span className="admin-booking-attention-dot admin-booking-attention-dot--contract" title={t('admin.bookings.docs')} />
        )}
      </div>
    )
  }

  return (
    <div className="admin-booking-attention">
      <StatusBadge status={booking.paymentStatus} />
      <StatusBadge status={sigStatus} />
      {contractMissing && (
        <span className="admin-booking-attention-tag admin-booking-attention-tag--contract">
          {showLabels ? t('admin.bookings.docs') : '!'}
        </span>
      )}
    </div>
  )
}

export default BookingAttentionIndicators
