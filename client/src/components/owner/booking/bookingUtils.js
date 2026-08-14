export const resId = (b) =>
  b?.reservationId || (b?._id ? `RES-${b._id.toString().slice(-8).toUpperCase()}` : '—')

export const formatDateTime = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

export const formatDateShort = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export const formatDateRange = (pickup, ret) => {
  const a = formatDateShort(pickup)
  const b = formatDateShort(ret)
  if (a === '—' && b === '—') return '—'
  return `${a} → ${b}`
}

/** Attention flags for list + inspector (UI only). */
export const getBookingAttention = (booking) => {
  const completion = booking?.completion
  const sigStatus = completion?.signatureRequestStatus || (completion?.signatureComplete ? 'signed' : 'none')
  const paymentOutstanding = ['pending', 'failed'].includes(String(booking?.paymentStatus || '').toLowerCase())
  const signatureNeedsAttention =
    !completion?.signatureComplete &&
    ['none', 'pending', 'expired'].includes(String(sigStatus).toLowerCase())
  const contractMissing =
    Boolean(booking) &&
    booking.status !== 'cancelled' &&
    !completion?.documentsComplete

  return { paymentOutstanding, signatureNeedsAttention, contractMissing, sigStatus }
}
