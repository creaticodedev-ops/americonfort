/**
 * Flexible booking pricing engine.
 * Server is authoritative — client may preview, never trust client totals.
 *
 * Line items are extensible: add new types (insurance, extras, taxes)
 * without changing the core booking flow.
 */

import { calcRentalDays } from '../utils/helpers.js';

export const LINE_TYPES = {
  RENTAL: 'rental',
  PICKUP_DELIVERY: 'pickup_delivery',
  DROPOFF_DELIVERY: 'dropoff_delivery',
  DISCOUNT: 'discount',
};

const toMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
};

/**
 * @param {object} input
 * @param {number} input.pricePerDay
 * @param {Date|string} input.pickupDate
 * @param {Date|string} input.returnDate
 * @param {number} [input.pickupDeliveryFee=0]
 * @param {number} [input.dropoffDeliveryFee=0]
 * @param {Array<{code?:string,label:string,amount:number}>} [input.discounts=[]]
 * @returns {object} price breakdown
 */
export const calculateBookingPrice = ({
  pricePerDay,
  pickupDate,
  returnDate,
  pickupDeliveryFee = 0,
  dropoffDeliveryFee = 0,
  discounts = [],
} = {}) => {
  const picked = pickupDate instanceof Date ? pickupDate : new Date(pickupDate);
  const returned = returnDate instanceof Date ? returnDate : new Date(returnDate);
  const days = calcRentalDays(picked, returned);
  const daily = toMoney(pricePerDay);

  const rentalPrice = toMoney(daily * days);
  const pickupFee = toMoney(pickupDeliveryFee);
  const dropoffFee = toMoney(dropoffDeliveryFee);

  const normalizedDiscounts = (Array.isArray(discounts) ? discounts : [])
    .map((d) => ({
      code: d.code || '',
      label: d.label || 'Discount',
      amount: toMoney(d.amount),
    }))
    .filter((d) => d.amount > 0);

  const discountTotal = toMoney(
    normalizedDiscounts.reduce((sum, d) => sum + d.amount, 0)
  );

  const lineItems = [
    {
      type: LINE_TYPES.RENTAL,
      label: 'Rental Price',
      amount: rentalPrice,
      meta: { days, pricePerDay: daily },
    },
  ];

  if (pickupFee > 0 || pickupDeliveryFee !== undefined) {
    lineItems.push({
      type: LINE_TYPES.PICKUP_DELIVERY,
      label: 'Pickup Delivery Fee',
      amount: pickupFee,
      meta: {},
    });
  }

  if (dropoffFee > 0 || dropoffDeliveryFee !== undefined) {
    lineItems.push({
      type: LINE_TYPES.DROPOFF_DELIVERY,
      label: 'Drop-off Delivery Fee',
      amount: dropoffFee,
      meta: {},
    });
  }

  for (const d of normalizedDiscounts) {
    lineItems.push({
      type: LINE_TYPES.DISCOUNT,
      label: d.label,
      amount: -d.amount,
      meta: { code: d.code },
    });
  }

  const subtotal = toMoney(rentalPrice + pickupFee + dropoffFee);
  const total = toMoney(Math.max(0, subtotal - discountTotal));

  const breakdown = {
    days,
    pricePerDay: daily,
    listPricePerDay: daily,
    effectivePricePerDay: daily,
    rentalPrice,
    pickupDeliveryFee: pickupFee,
    dropoffDeliveryFee: dropoffFee,
    discounts: normalizedDiscounts,
    discountTotal,
    subtotal,
    total,
    lineItems,
    discountBakedIntoDaily: false,
  };

  return bakeDiscountIntoDailyRate(breakdown);
};

/**
 * When a remise is applied, the commercial daily rate becomes the discounted
 * daily rate so Contract / Invoice never show listPrice/day + reduced total.
 * Example: 250/day × 10 − 200 remise → 230/day, total 2300.
 */
export const bakeDiscountIntoDailyRate = (breakdown = {}) => {
  const days = Math.max(1, Number(breakdown.days) || 1);
  const fees = toMoney(
    (Number(breakdown.pickupDeliveryFee) || 0) + (Number(breakdown.dropoffDeliveryFee) || 0),
  );
  const total = toMoney(breakdown.total);
  const listDaily = toMoney(
    breakdown.listPricePerDay ?? breakdown.pricePerDay ?? 0,
  );
  const discountTotal = toMoney(breakdown.discountTotal);

  if (!(discountTotal > 0) || !(days > 0)) {
    return {
      ...breakdown,
      listPricePerDay: listDaily,
      effectivePricePerDay: listDaily,
      pricePerDay: listDaily,
      discountBakedIntoDaily: false,
    };
  }

  const rentalAfterDiscount = toMoney(Math.max(0, total - fees));
  const effectiveDaily = toMoney(rentalAfterDiscount / days);

  const pickupFee = toMoney(breakdown.pickupDeliveryFee);
  const dropoffFee = toMoney(breakdown.dropoffDeliveryFee);
  const lineItems = [
    {
      type: LINE_TYPES.RENTAL,
      label: 'Rental Price',
      amount: rentalAfterDiscount,
      meta: {
        days,
        pricePerDay: effectiveDaily,
        listPricePerDay: listDaily,
        originalDiscountTotal: discountTotal,
      },
    },
  ];
  if (pickupFee > 0 || breakdown.pickupDeliveryFee !== undefined) {
    lineItems.push({
      type: LINE_TYPES.PICKUP_DELIVERY,
      label: 'Pickup Delivery Fee',
      amount: pickupFee,
      meta: {},
    });
  }
  if (dropoffFee > 0 || breakdown.dropoffDeliveryFee !== undefined) {
    lineItems.push({
      type: LINE_TYPES.DROPOFF_DELIVERY,
      label: 'Drop-off Delivery Fee',
      amount: dropoffFee,
      meta: {},
    });
  }

  return {
    ...breakdown,
    listPricePerDay: listDaily,
    originalPricePerDay: listDaily,
    effectivePricePerDay: effectiveDaily,
    pricePerDay: effectiveDaily,
    rentalPrice: rentalAfterDiscount,
    // Remise is reflected in the daily rate for documents; keep audit trail separately.
    originalDiscountTotal: discountTotal,
    originalDiscounts: Array.isArray(breakdown.discounts) ? breakdown.discounts : [],
    discountTotal: 0,
    discounts: [],
    discountBakedIntoDaily: true,
    subtotal: toMoney(rentalAfterDiscount + fees),
    total,
    lineItems,
  };
};

/**
 * Resolve delivery fee for a location document (or 0).
 */
export const getLocationDeliveryFee = (location) =>
  toMoney(location?.deliveryFee ?? 0);

/**
 * Format location label for booking storage / display.
 */
export const formatLocationLabel = (location) => {
  if (!location) return '';
  return `${location.name} - ${location.address}`;
};

export default calculateBookingPrice;
