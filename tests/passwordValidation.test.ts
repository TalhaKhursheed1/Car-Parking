import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PASSWORD_MIN_LENGTH,
  isStrongPassword,
  validateChangePasswordInput,
} from '../src/lib/validation/password';

describe('isStrongPassword', () => {
  it('rejects passwords shorter than the minimum', () => {
    assert.equal(isStrongPassword('Ab1'), false);
    assert.equal(isStrongPassword('A'.repeat(PASSWORD_MIN_LENGTH - 1) + '1'), false);
  });

  it('rejects letters-only passwords', () => {
    assert.equal(isStrongPassword('passwordpass'), false);
  });

  it('rejects digits-only passwords', () => {
    assert.equal(isStrongPassword('12345678'), false);
  });

  it('accepts passwords with letters and digits at the minimum length', () => {
    assert.equal(isStrongPassword('Secret12'), true);
  });

  it('rejects passwords longer than 128 chars', () => {
    assert.equal(isStrongPassword('A1' + 'a'.repeat(200)), false);
  });
});

describe('validateChangePasswordInput', () => {
  it('requires the current password', () => {
    const result = validateChangePasswordInput({ newPassword: 'Secret12', confirmPassword: 'Secret12' });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.field, 'currentPassword');
  });

  it('requires the new password', () => {
    const result = validateChangePasswordInput({ currentPassword: 'old', confirmPassword: '' });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.field, 'newPassword');
  });

  it('rejects new passwords shorter than the minimum', () => {
    const result = validateChangePasswordInput({
      currentPassword: 'oldpass1',
      newPassword: 'short1',
      confirmPassword: 'short1',
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.field, 'newPassword');
      assert.match(result.error, /at least/);
    }
  });

  it('rejects new passwords without both letters and digits', () => {
    const result = validateChangePasswordInput({
      currentPassword: 'oldpass1',
      newPassword: 'alllettersxx',
      confirmPassword: 'alllettersxx',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /letter and one number/);
  });

  it('rejects reusing the same password', () => {
    const result = validateChangePasswordInput({
      currentPassword: 'Secret12',
      newPassword: 'Secret12',
      confirmPassword: 'Secret12',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.field, 'newPassword');
  });

  it('rejects mismatched confirm field when provided', () => {
    const result = validateChangePasswordInput({
      currentPassword: 'OldPass12',
      newPassword: 'NewPass34',
      confirmPassword: 'WrongPass4',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.field, 'confirmPassword');
  });

  it('ignores confirm field when explicitly omitted', () => {
    const result = validateChangePasswordInput({
      currentPassword: 'OldPass12',
      newPassword: 'NewPass34',
    });
    assert.equal(result.ok, true);
  });

  it('returns the trimmed value on success', () => {
    const result = validateChangePasswordInput({
      currentPassword: 'OldPass12',
      newPassword: 'NewPass34',
      confirmPassword: 'NewPass34',
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.currentPassword, 'OldPass12');
      assert.equal(result.value.newPassword, 'NewPass34');
    }
  });
});
