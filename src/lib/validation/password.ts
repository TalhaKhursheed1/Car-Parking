/**
 * Shared password rules. Kept deliberately small so it can be reused on
 * the client (live validation) and the server (final gate), with the
 * server always being authoritative.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export type ChangePasswordInput = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export type PasswordValidationResult =
  | { ok: true; value: { currentPassword: string; newPassword: string } }
  | { ok: false; error: string; field?: 'currentPassword' | 'newPassword' | 'confirmPassword' };

export function isStrongPassword(value: string): boolean {
  if (value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) {
    return false;
  }
  // Require at least one letter and one digit. We deliberately avoid
  // forcing symbols / casing rules because we don't enforce them at
  // registration either - keeping the rules consistent reduces friction.
  return /[A-Za-z]/.test(value) && /\d/.test(value);
}

export function validateChangePasswordInput(
  input: ChangePasswordInput,
): PasswordValidationResult {
  const currentPassword = typeof input.currentPassword === 'string' ? input.currentPassword : '';
  const newPassword = typeof input.newPassword === 'string' ? input.newPassword : '';
  const confirmPassword =
    typeof input.confirmPassword === 'string' ? input.confirmPassword : undefined;

  if (!currentPassword) {
    return { ok: false, error: 'Current password is required.', field: 'currentPassword' };
  }
  if (!newPassword) {
    return { ok: false, error: 'New password is required.', field: 'newPassword' };
  }
  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      error: `New password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
      field: 'newPassword',
    };
  }
  if (newPassword.length > PASSWORD_MAX_LENGTH) {
    return {
      ok: false,
      error: `New password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
      field: 'newPassword',
    };
  }
  if (!isStrongPassword(newPassword)) {
    return {
      ok: false,
      error: 'New password must contain at least one letter and one number.',
      field: 'newPassword',
    };
  }
  if (newPassword === currentPassword) {
    return {
      ok: false,
      error: 'New password must be different from the current password.',
      field: 'newPassword',
    };
  }
  if (confirmPassword !== undefined && confirmPassword !== newPassword) {
    return {
      ok: false,
      error: 'Passwords do not match.',
      field: 'confirmPassword',
    };
  }

  return { ok: true, value: { currentPassword, newPassword } };
}
