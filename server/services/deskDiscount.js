/**
 * Desk / Walk-in remises — integrates with pricingEngine discounts[].
 *
 * Intent is stored on Booking.deskDiscount { type, value } so percentage
 * discounts recompute correctly when dates/vehicle/fees change.
 *
 * Accounting:
 * - Reduces booking.price via calculateBookingPrice.
 * - Remise is then baked into priceBreakdown.pricePerDay (effective daily rate)
 *   so Contract / Invoice show consistent Prix/jour × jours = total.
 * - Intent stays on Booking.deskDiscount for recomputation; audit snapshot in
 *   priceBreakdown.originalDiscountTotal / originalDiscounts.
 */

export const DESK_DISCOUNT_CODE = 'desk_discount';

export const DESK_DISCOUNT_TYPES = Object.freeze(['fixed', 'percentage']);

const toMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
};

/**
 * Normalize client/API payload into a persisted deskDiscount shape.
 * Returns null when no discount should be stored.
 */
export const normalizeDeskDiscount = (raw) => {
  if (raw == null || raw === false) {
    return { type: 'fixed', value: 0 };
  }
  if (typeof raw === 'number') {
    const value = toMoney(raw);
    return { type: 'fixed', value };
  }
  const type = DESK_DISCOUNT_TYPES.includes(raw.type) ? raw.type : 'fixed';
  let value = Number(raw.value);
  if (!Number.isFinite(value) || value < 0) value = 0;
  if (type === 'percentage') {
    value = Math.min(100, Math.max(0, value));
  } else {
    value = toMoney(value);
  }
  return { type, value };
};

export const hasDeskDiscount = (deskDiscount) => {
  const d = normalizeDeskDiscount(deskDiscount);
  return d.value > 0;
};

/**
 * @param {object} opts
 * @param {{ type?: string, value?: number }|null} opts.deskDiscount
 * @param {number} opts.baseAmount - amount the remise applies to (usually subtotal before discounts)
 * @param {number} [opts.maxAmount] - hard cap (remaining room after other discounts)
 * @returns {{ code: string, label: string, amount: number, meta: object } | null}
 */
export const computeDeskDiscountLine = ({
  deskDiscount,
  baseAmount = 0,
  maxAmount = Infinity,
} = {}) => {
  const d = normalizeDeskDiscount(deskDiscount);
  if (!(d.value > 0)) return null;

  const base = toMoney(baseAmount);
  if (base <= 0) return null;

  let amount = 0;
  if (d.type === 'percentage') {
    amount = toMoney((base * d.value) / 100);
  } else {
    amount = toMoney(d.value);
  }

  const room = toMoney(Math.max(0, Number.isFinite(maxAmount) ? maxAmount : base));
  amount = Math.min(amount, base, room);
  if (amount <= 0) return null;

  const label =
    d.type === 'percentage'
      ? `Remise comptoir (−${d.value}%)`
      : 'Remise comptoir';

  return {
    code: DESK_DISCOUNT_CODE,
    label,
    amount,
    meta: {
      type: d.type,
      value: d.value,
    },
  };
};

/**
 * Remove prior desk_discount lines, then append a fresh computed line.
 */
export const mergeDeskDiscount = (existingDiscounts = [], deskLine) => {
  const rest = (Array.isArray(existingDiscounts) ? existingDiscounts : []).filter(
    (d) => d?.code !== DESK_DISCOUNT_CODE,
  );
  if (!deskLine) return rest;
  return [
    ...rest,
    {
      code: deskLine.code,
      label: deskLine.label,
      amount: deskLine.amount,
    },
  ];
};

/**
 * Build the full discounts[] for a booking recalculation.
 * Preserves non-system lines, refreshes partner + desk from source intent.
 */
export const buildDiscountsForBooking = ({
  existingDiscounts = [],
  partnerLine = null,
  deskDiscount = null,
  rentalPrice = 0,
  pickupDeliveryFee = 0,
  dropoffDeliveryFee = 0,
} = {}) => {
  const manual = (Array.isArray(existingDiscounts) ? existingDiscounts : []).filter(
    (d) => d?.code !== 'partner_discount' && d?.code !== DESK_DISCOUNT_CODE,
  );

  let discounts = [...manual];
  if (partnerLine) {
    discounts = [
      ...discounts,
      {
        code: partnerLine.code,
        label: partnerLine.label,
        amount: partnerLine.amount,
      },
    ];
  }

  const subtotal = toMoney(
    Number(rentalPrice || 0)
      + Number(pickupDeliveryFee || 0)
      + Number(dropoffDeliveryFee || 0),
  );
  const already = toMoney(discounts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0));
  const room = Math.max(0, subtotal - already);
  const deskLine = computeDeskDiscountLine({
    deskDiscount,
    baseAmount: subtotal,
    maxAmount: room,
  });
  return mergeDeskDiscount(discounts, deskLine);
};

export default {
  DESK_DISCOUNT_CODE,
  DESK_DISCOUNT_TYPES,
  normalizeDeskDiscount,
  hasDeskDiscount,
  computeDeskDiscountLine,
  mergeDeskDiscount,
  buildDiscountsForBooking,
};
