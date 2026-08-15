/** Platform commission: 10% of the customer total (AUD), before Stripe processing fees. */
export const PLATFORM_FEE_BPS = 1000;

export function audDollarsToCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Application fee in smallest currency units (cents for AUD). */
export function platformApplicationFeeCents(totalAudDollars: number): number {
  const totalCents = audDollarsToCents(totalAudDollars);
  return Math.round((totalCents * PLATFORM_FEE_BPS) / 10_000);
}

/** Platform fee in AUD dollars (2 decimal places) for storage / display. */
export function platformFeeAudDollars(totalAudDollars: number): number {
  return platformApplicationFeeCents(totalAudDollars) / 100;
}

/** Rough Stripe card processing estimate (AUD) for admin reporting only; actual fees vary. */
export function estimateStripeProcessingFeeAud(grossAudDollars: number): number {
  return Math.round((grossAudDollars * 0.029 + 0.3) * 100) / 100;
}
