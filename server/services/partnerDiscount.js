/**
 * Partner-company discounts — integrates with pricingEngine discounts[].
 *
 * Accounting treatment:
 * - Discount reduces booking.price via calculateBookingPrice (discountTotal).
 * - Gross Revenue = sum(booking.price) already reflects applied discounts.
 * - Net Result formula unchanged: Gross − Samsar − Agency − Vehicle.
 * - Surface discountTotal in UI for transparency; do NOT subtract again in Net Result.
 */

const toMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
};

export const DISCOUNT_TYPES = Object.freeze(['percentage', 'fixed_per_day', 'fixed']);

export const normalizePartnerDiscount = (raw = {}) => {
  const type = DISCOUNT_TYPES.includes(raw.type) ? raw.type : 'percentage';
  const value = Math.max(0, Number(raw.value) || 0);
  let startDate = null;
  let endDate = null;
  if (raw.startDate) {
    const d = new Date(raw.startDate);
    if (!Number.isNaN(d.getTime())) startDate = d;
  }
  if (raw.endDate) {
    const d = new Date(raw.endDate);
    if (!Number.isNaN(d.getTime())) endDate = d;
  }
  return {
    enabled: Boolean(raw.enabled),
    type,
    value,
    startDate,
    endDate,
    notes: String(raw.notes || '').slice(0, 1000),
  };
};

export const isPartnerDiscountActive = (discount, atDate = new Date()) => {
  if (!discount || !discount.enabled) return false;
  const at = atDate instanceof Date ? atDate : new Date(atDate);
  if (Number.isNaN(at.getTime())) return false;
  if (discount.startDate && at < new Date(discount.startDate)) return false;
  if (discount.endDate) {
    const end = new Date(discount.endDate);
    end.setHours(23, 59, 59, 999);
    if (at > end) return false;
  }
  return (Number(discount.value) || 0) > 0;
};

/**
 * @returns {{ code: string, label: string, amount: number, meta: object } | null}
 */
export const computePartnerDiscountLine = ({
  partner,
  days,
  rentalPrice,
  atDate = new Date(),
} = {}) => {
  if (!partner || partner.status === 'inactive') return null;
  const discount = partner.discount;
  if (!isPartnerDiscountActive(discount, atDate)) return null;

  const d = Number(days) || 0;
  const rental = toMoney(rentalPrice);
  let amount = 0;

  if (discount.type === 'percentage') {
    amount = toMoney((rental * Number(discount.value)) / 100);
  } else if (discount.type === 'fixed_per_day') {
    amount = toMoney(Number(discount.value) * Math.max(0, d));
  } else if (discount.type === 'fixed') {
    amount = toMoney(discount.value);
  }

  if (amount <= 0) return null;
  // Never exceed rental line (delivery fees stay full)
  amount = Math.min(amount, rental);

  const name = partner.companyName || 'Partner';
  const label =
    discount.type === 'percentage'
      ? `${name} (−${discount.value}%)`
      : discount.type === 'fixed_per_day'
        ? `${name} (−${discount.value}/day)`
        : `${name} discount`;

  return {
    code: 'partner_discount',
    label,
    amount,
    meta: {
      partnerId: String(partner._id || ''),
      type: discount.type,
      value: discount.value,
    },
  };
};

/**
 * Merge partner discount into an existing discounts array (replaces prior partner_discount).
 */
export const mergePartnerDiscount = (existingDiscounts = [], partnerLine) => {
  const rest = (Array.isArray(existingDiscounts) ? existingDiscounts : []).filter(
    (d) => d?.code !== 'partner_discount',
  );
  if (!partnerLine) return rest;
  return [...rest, { code: partnerLine.code, label: partnerLine.label, amount: partnerLine.amount }];
};

export default {
  DISCOUNT_TYPES,
  normalizePartnerDiscount,
  isPartnerDiscountActive,
  computePartnerDiscountLine,
  mergePartnerDiscount,
};
