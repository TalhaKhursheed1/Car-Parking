import { filterDigits } from '@/lib/validation/registerForm';

export { filterDigits };

/** AU/US-style numeric postcode when provided: 4–10 digits only. */
export function isValidNumericPostcode(postcode: string): boolean {
  const t = postcode.trim();
  if (!t) return true;
  return /^\d{4,10}$/.test(t);
}

/** Digits and at most one decimal point; up to 2 fraction digits. */
export function filterPriceInput(value: string): string {
  const stripped = value.replace(/[^\d.]/g, '');
  const dotIdx = stripped.indexOf('.');
  if (dotIdx === -1) {
    return stripped.slice(0, 10);
  }
  const whole = stripped.slice(0, dotIdx).replace(/\D/g, '').slice(0, 8);
  const frac = stripped.slice(dotIdx + 1).replace(/\D/g, '').slice(0, 2);
  if (stripped.endsWith('.') && frac.length === 0) {
    return `${whole}.`;
  }
  return frac.length > 0 ? `${whole}.${frac}` : whole;
}

export function isValidPositivePrice(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  const n = Number(t);
  return !Number.isNaN(n) && n > 0;
}

export function isValidOptionalPositivePrice(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  const n = Number(t);
  return !Number.isNaN(n) && n > 0;
}

export function isValidSpaceCapacity(s: string): boolean {
  const t = s.trim();
  if (!/^\d+$/.test(t)) return false;
  const n = Number(t);
  return n >= 1 && n <= 999;
}

export function isValidSpaceTitle(title: string): boolean {
  const t = title.trim();
  return t.length >= 2 && t.length <= 120;
}

export function isValidStateField(state: string): boolean {
  const t = state.trim();
  return t.length >= 2 && t.length <= 50;
}
