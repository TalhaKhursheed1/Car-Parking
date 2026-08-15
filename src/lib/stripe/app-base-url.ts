/**
 * Base URL for Stripe redirects and webhooks. Prefer NEXT_PUBLIC_SITE_URL (see layout metadata).
 */
export function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return 'http://localhost:3000';
}
