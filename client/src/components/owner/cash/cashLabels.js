export const CASH_METHODS = ['cash', 'card_tpe', 'bank_transfer', 'other']

export const ENCAISSEMENT_TYPES = ['customer_payment', 'deposit_hold']

export const DECAISSEMENT_TYPES = [
  'customer_refund',
  'deposit_release',
  'agency_expense',
  'vehicle_expense',
  'samsar_payment',
]

export const formatMoney = (currency, value) =>
  `${currency}${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`

export const formatWhen = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const cashTypeLabel = (t, cashType) => {
  const key = `admin.cash.types.${cashType}`
  const label = t(key)
  return label === key ? cashType : label
}

export const methodLabel = (t, method) => {
  const key = `admin.bookingMoney.methods.${method}`
  const label = t(key)
  return label === key ? method : label
}

export const newIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}
