/**
 * Client-side preview of Walk-in / desk pricing.
 * Mirrors server pricingEngine + deskDiscount (server remains authoritative on save).
 */

const toMoney = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 100) / 100
}

export const normalizeDeskDiscountInput = (raw) => {
  if (!raw) return { type: 'fixed', value: 0 }
  const type = raw.type === 'percentage' ? 'percentage' : 'fixed'
  let value = Number(raw.value)
  if (!Number.isFinite(value) || value < 0) value = 0
  if (type === 'percentage') value = Math.min(100, value)
  else value = toMoney(value)
  return { type, value }
}

/**
 * @returns {{
 *   days: number,
 *   rental: number,
 *   pickupFee: number,
 *   dropoffFee: number,
 *   subtotal: number,
 *   discountType: 'fixed'|'percentage',
 *   discountValue: number,
 *   discountAmount: number,
 *   total: number,
 *   franchise: number,
 *   error: string|null,
 * }}
 */
export const buildWalkInQuote = ({
  pricePerDay = 0,
  pickupDate,
  returnDate,
  pickupFee = 0,
  dropoffFee = 0,
  deskDiscount,
  franchise = 0,
} = {}) => {
  const start = pickupDate ? new Date(pickupDate) : null
  const end = returnDate ? new Date(returnDate) : null
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || !(end > start)) {
    return null
  }

  const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)))
  const rental = toMoney(days * Number(pricePerDay || 0))
  const pickup = toMoney(pickupFee)
  const dropoff = toMoney(dropoffFee)
  const subtotal = toMoney(rental + pickup + dropoff)
  const d = normalizeDeskDiscountInput(deskDiscount)

  let discountAmount = 0
  let error = null
  if (d.value > 0) {
    if (d.type === 'percentage') {
      discountAmount = toMoney((subtotal * d.value) / 100)
    } else {
      discountAmount = toMoney(d.value)
      if (discountAmount > subtotal) {
        discountAmount = subtotal
        error = 'exceeds'
      }
    }
  }
  discountAmount = Math.min(discountAmount, subtotal)
  const total = toMoney(Math.max(0, subtotal - discountAmount))

  return {
    days,
    rental,
    pickupFee: pickup,
    dropoffFee: dropoff,
    subtotal,
    discountType: d.type,
    discountValue: d.value,
    discountAmount,
    total,
    franchise: toMoney(franchise),
    error,
  }
}

export default buildWalkInQuote
