import StripeImport from 'stripe';

// stripe-node ships incompatible default-export typings under `moduleResolution: "node"` vs Next's `bundler`.
// Runtime is always `new Stripe(key)`; narrow types stay accurate at call sites that import from `stripe` directly.
let stripe: import('stripe').Stripe | null = null;

export function getStripe(): import('stripe').Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  if (!stripe) {
    const StripeCtor = StripeImport as unknown as new (apiKey: string) => import('stripe').Stripe;
    stripe = new StripeCtor(key);
  }
  return stripe;
}
