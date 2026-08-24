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
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export const formatTimeShort = (value) => {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export const formatDateTimeCompact = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

export const formatDateRange = (pickup, ret) => {
  const a = formatDateShort(pickup)
  const b = formatDateShort(ret)
  if (a === '—' && b === '—') return '—'
  return `${a} → ${b}`
}

export const vehicleTitle = (car) => {
  if (!car) return '—'
  return [car.brand, car.model].filter(Boolean).join(' ') || '—'
}

export const locationShort = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return '—'
  // "Casablanca - Casablanca, Morocco" → "Casablanca"
  const head = raw.split(/[-–,]/)[0]?.trim()
  return head || raw
}

export const isoDateLocal = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
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

/**
 * Operational scopes → existing list API filters (no new endpoints).
 * Other filter fields are preserved when applying a scope.
 */
export const OPS_SCOPES = [
  { id: 'all', clear: ['status', 'paymentStatus', 'pickupDateFrom', 'pickupDateTo', 'returnDateFrom', 'returnDateTo'] },
  { id: 'attention', patch: { status: 'pending', paymentStatus: '', pickupDateFrom: '', pickupDateTo: '', returnDateFrom: '', returnDateTo: '' } },
  { id: 'pickupToday', patch: (today) => ({ status: '', paymentStatus: '', pickupDateFrom: today, pickupDateTo: today, returnDateFrom: '', returnDateTo: '' }) },
  { id: 'returnToday', patch: (today) => ({ status: '', paymentStatus: '', pickupDateFrom: '', pickupDateTo: '', returnDateFrom: today, returnDateTo: today }) },
  { id: 'onRent', patch: { status: 'active', paymentStatus: '', pickupDateFrom: '', pickupDateTo: '', returnDateFrom: '', returnDateTo: '' } },
  { id: 'ready', patch: { status: 'ready_for_pickup', paymentStatus: '', pickupDateFrom: '', pickupDateTo: '', returnDateFrom: '', returnDateTo: '' } },
  { id: 'unpaid', patch: { status: '', paymentStatus: 'pending', pickupDateFrom: '', pickupDateTo: '', returnDateFrom: '', returnDateTo: '' } },
]

export const resolveOpsScope = (filters) => {
  const today = isoDateLocal()
  const f = filters || {}
  if (f.status === 'pending' && !f.paymentStatus && !f.pickupDateFrom && !f.returnDateFrom) return 'attention'
  if (f.status === 'active' && !f.pickupDateFrom && !f.returnDateFrom) return 'onRent'
  if (f.status === 'ready_for_pickup' && !f.pickupDateFrom && !f.returnDateFrom) return 'ready'
  if (f.paymentStatus === 'pending' && !f.status && !f.pickupDateFrom && !f.returnDateFrom) return 'unpaid'
  if (f.pickupDateFrom === today && f.pickupDateTo === today && !f.returnDateFrom) return 'pickupToday'
  if (f.returnDateFrom === today && f.returnDateTo === today && !f.pickupDateFrom) return 'returnToday'
  if (!f.status && !f.paymentStatus && !f.pickupDateFrom && !f.returnDateFrom) return 'all'
  return 'custom'
}

export const applyOpsScope = (filters, scopeId) => {
  const today = isoDateLocal()
  const scope = OPS_SCOPES.find((s) => s.id === scopeId)
  if (!scope) return filters
  if (scope.clear) {
    const next = { ...filters }
    scope.clear.forEach((k) => { next[k] = '' })
    return next
  }
  const patch = typeof scope.patch === 'function' ? scope.patch(today) : scope.patch
  return { ...filters, ...patch }
}
