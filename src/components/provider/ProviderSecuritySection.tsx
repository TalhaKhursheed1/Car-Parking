'use client';

import { useState } from 'react';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useChangeProviderPassword } from '@/features/provider/hooks';
import {
  PASSWORD_MIN_LENGTH,
  validateChangePasswordInput,
} from '@/lib/validation/password';
import { KeyRound, ShieldCheck } from 'lucide-react';

type FormErrors = Partial<{
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  general: string;
}>;

export default function ProviderSecuritySection() {
  const mutation = useChangeProviderPassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    const result = validateChangePasswordInput({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!result.ok) {
      setErrors({ [result.field ?? 'general']: result.error } as FormErrors);
      return;
    }

    setErrors({});
    mutation.mutate(
      {
        currentPassword: result.value.currentPassword,
        newPassword: result.value.newPassword,
        confirmPassword,
      },
      {
        onSuccess: () => {
          reset();
          setSuccess(true);
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : 'Failed to change password';
          // The API returns the offending field name when known.
          const field = (err as { field?: string })?.field;
          if (field && (field === 'currentPassword' || field === 'newPassword' || field === 'confirmPassword')) {
            setErrors({ [field]: message } as FormErrors);
          } else {
            setErrors({ general: message });
          }
        },
      },
    );
  };

  return (
    <Card id="security" className="p-6 scroll-mt-24">
      <div className="flex items-start gap-3 mb-4">
        <KeyRound className="h-7 w-7 text-white/85 shrink-0" strokeWidth={1.5} aria-hidden />
        <div>
          <h2 className="text-xl font-bold text-white">Security</h2>
          <p className="text-sm text-white/70 leading-relaxed">
            Use at least {PASSWORD_MIN_LENGTH} characters with a mix of letters and numbers.
            You&apos;ll stay signed in after changing your password.
          </p>
        </div>
      </div>

      {errors.general ? (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errors.general}
        </div>
      ) : null}
      {success ? (
        <div
          className="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 flex items-center gap-2"
          role="status"
        >
          <ShieldCheck className="h-4 w-4" aria-hidden />
          Password updated successfully.
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          error={errors.currentPassword}
          required
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={errors.newPassword}
            required
            minLength={PASSWORD_MIN_LENGTH}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            required
            minLength={PASSWORD_MIN_LENGTH}
          />
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Update password'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={reset}
            disabled={mutation.isPending}
          >
            Clear
          </Button>
        </div>
      </form>
    </Card>
  );
}
