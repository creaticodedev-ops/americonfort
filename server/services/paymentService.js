/**
 * Online payment service — Stripe Checkout (production) or secure demo mode.
 */

const currencyCode = () => (process.env.PAYMENT_CURRENCY || process.env.CURRENCY || "mad").toLowerCase();

/**
 * @param {number} [overridePercent] optional owner bookingSettings.deposit.depositPercent
 * Falls back to DEPOSIT_PERCENT env, then 30 — preserves existing payment behaviour.
 */
export const getDepositPercent = (overridePercent) => {
  const fromSettings = Number(overridePercent);
  if (Number.isFinite(fromSettings) && fromSettings > 0 && fromSettings <= 100) {
    return fromSettings;
  }
  const n = Number(process.env.DEPOSIT_PERCENT);
  if (!Number.isFinite(n) || n <= 0 || n > 100) return 30;
  return n;
};

export const computePayableAmount = (total, paymentType, depositPercent) => {
  const full = Math.max(0, Number(total) || 0);
  if (paymentType === "deposit") {
    return Math.round((full * getDepositPercent(depositPercent)) / 100 * 100) / 100;
  }
  return Math.round(full * 100) / 100;
};

export const getPaymentMode = () => {
  if (process.env.STRIPE_SECRET_KEY) return "stripe";

  const mode = (process.env.PAYMENT_MODE || "demo").toLowerCase();
  const allowDemo =
    String(process.env.ALLOW_DEMO_PAYMENT || "").toLowerCase() === "true" ||
    process.env.NODE_ENV !== "production";

  // Production fail-closed: never silently accept free "demo" payments
  if (mode === "demo" && !allowDemo) {
    return "disabled";
  }

  return mode;
};

export const createStripeCheckoutSession = async ({
  booking,
  paymentType,
  amount,
  successUrl,
  cancelUrl,
}) => {
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const unitAmount = Math.round(amount * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: booking.customerEmail || undefined,
    client_reference_id: booking._id.toString(),
    metadata: {
      bookingId: booking._id.toString(),
      reservationId: booking.reservationId || "",
      paymentType,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: currencyCode(),
          unit_amount: unitAmount,
          product_data: {
            name: `Reservation ${booking.reservationId} (${paymentType})`,
            description: `${booking.customerName || "Guest"} — car rental`,
          },
        },
      },
    ],
  });

  return session;
};

export const retrieveStripeSession = async (sessionId) => {
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe.checkout.sessions.retrieve(sessionId);
};

export default {
  getDepositPercent,
  computePayableAmount,
  getPaymentMode,
  createStripeCheckoutSession,
  retrieveStripeSession,
};
