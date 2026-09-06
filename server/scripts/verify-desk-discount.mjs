/**
 * Desk discount + pricing engine integration smoke test.
 * Run: node scripts/verify-desk-discount.mjs
 */
import assert from 'node:assert/strict'
import { calculateBookingPrice } from '../services/pricingEngine.js'
import {
  normalizeDeskDiscount,
  computeDeskDiscountLine,
  buildDiscountsForBooking,
} from '../services/deskDiscount.js'

{
  const d = normalizeDeskDiscount({ type: 'percentage', value: 150 })
  assert.equal(d.type, 'percentage')
  assert.equal(d.value, 100)
}

{
  const line = computeDeskDiscountLine({
    deskDiscount: { type: 'fixed', value: 200 },
    baseAmount: 1500,
  })
  assert.equal(line.amount, 200)
  assert.equal(line.code, 'desk_discount')
}

{
  const line = computeDeskDiscountLine({
    deskDiscount: { type: 'fixed', value: 2000 },
    baseAmount: 1500,
  })
  assert.equal(line.amount, 1500, 'fixed discount cannot exceed base')
}

{
  const line = computeDeskDiscountLine({
    deskDiscount: { type: 'percentage', value: 10 },
    baseAmount: 1500,
  })
  assert.equal(line.amount, 150)
}

{
  const discounts = buildDiscountsForBooking({
    deskDiscount: { type: 'fixed', value: 200 },
    rentalPrice: 1400,
    pickupDeliveryFee: 100,
    dropoffDeliveryFee: 0,
  })
  const breakdown = calculateBookingPrice({
    pricePerDay: 200,
    pickupDate: '2026-09-01T10:00:00',
    returnDate: '2026-09-08T10:00:00',
    pickupDeliveryFee: 100,
    dropoffDeliveryFee: 0,
    discounts,
  })
  // 7 days * 200 = 1400 + 100 = 1500 - 200 = 1300
  assert.equal(breakdown.subtotal, 1500)
  assert.equal(breakdown.discountTotal, 200)
  assert.equal(breakdown.total, 1300)
  assert.equal(breakdown.discounts[0].code, 'desk_discount')
}

{
  // Percentage recompute after longer rental: intent stays 10%
  const deskDiscount = { type: 'percentage', value: 10 }
  const short = calculateBookingPrice({
    pricePerDay: 100,
    pickupDate: '2026-09-01',
    returnDate: '2026-09-02',
    discounts: buildDiscountsForBooking({
      deskDiscount,
      rentalPrice: 100,
      pickupDeliveryFee: 0,
      dropoffDeliveryFee: 0,
    }),
  })
  assert.equal(short.total, 90)

  const long = calculateBookingPrice({
    pricePerDay: 100,
    pickupDate: '2026-09-01',
    returnDate: '2026-09-11',
    discounts: buildDiscountsForBooking({
      deskDiscount,
      rentalPrice: 1000,
      pickupDeliveryFee: 0,
      dropoffDeliveryFee: 0,
    }),
  })
  assert.equal(long.discountTotal, 100)
  assert.equal(long.total, 900)
}

console.log('OK: desk discount pricing verified')
