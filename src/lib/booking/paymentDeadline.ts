/** Consumer must complete payment within this window after booking creation. */
export const BOOKING_PAYMENT_WINDOW_MS = 10 * 60 * 1000;

/** Target Checkout Session lifetime (seconds). */
export const STRIPE_CHECKOUT_TARGET_EXPIRY_SEC = 10 * 60;

/**
 * Stripe API requires Checkout Session `expires_at` between ~30 min and 24h from creation.
 * If a 10-minute expiry is rejected, we retry with this fallback (session may outlive `paymentDueAt`;
 * app-side expiry + webhook still enforce the 10-minute booking rule).
 */
export const STRIPE_CHECKOUT_FALLBACK_EXPIRY_SEC = 30 * 60;
