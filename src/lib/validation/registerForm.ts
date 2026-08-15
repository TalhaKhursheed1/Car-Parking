/** Strip non-digits and optionally cap length (for controlled inputs). */
export function filterDigits(raw: string, maxLength?: number): string {
  const digits = raw.replace(/\D/g, '');
  return maxLength !== undefined ? digits.slice(0, maxLength) : digits;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPersonOrPlaceName(name: string): boolean {
  return /^[a-zA-Z\s\-']{2,50}$/.test(name.trim());
}

/** Phone stored as digits only, 10–15 (E.164 national number range without +). */
export function isValidPhoneDigits(phone: string): boolean {
  return /^\d{10,15}$/.test(phone.trim());
}

/** US ZIP: 5 digits or 9 digits (ZIP+4, no hyphen). */
export function isValidZipDigits(zip: string): boolean {
  return /^\d{5}(\d{4})?$/.test(zip.trim());
}

export function isValidBankAccountDigits(account: string): boolean {
  return /^\d{10,19}$/.test(account.trim());
}

/** Tax ID / EIN: digits only, 8–15. */
export function isValidTaxIdDigits(taxId: string): boolean {
  return /^\d{8,15}$/.test(taxId.trim());
}
