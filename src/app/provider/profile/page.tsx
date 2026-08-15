'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { AuthGuard } from '@/components/AuthGuard';
import {
  PROVIDER_PROFILE_QUERY_KEY,
  useProviderProfile,
  useUpdateProviderProfile,
  useUpdateProviderAccount,
} from '@/features/provider/hooks';
import { ProviderPendingNotice } from '@/components/ProviderPendingNotice';
import { useCurrentUser, useLogout } from '@/features/auth/hooks';
import { useAuthStore } from '@/stores/authStore';
import { isValidEmail, isValidPhoneDigits } from '@/lib/validation/registerForm';
import ProviderBankingSection from '@/components/provider/ProviderBankingSection';
import ProviderSecuritySection from '@/components/provider/ProviderSecuritySection';
import {
  Building2,
  CheckCircle2,
  MapPin,
  User,
  UserCog,
} from 'lucide-react';

type BusinessForm = {
  businessName: string;
  contactName: string;
  phone: string;
  taxId: string;
  businessType: 'individual' | 'company';
  address: string;
  city: string;
  state: string;
  zipCode: string;
};

type AccountForm = {
  fullName: string;
  email: string;
  currentPassword: string;
};

const EMPTY_BUSINESS: BusinessForm = {
  businessName: '',
  contactName: '',
  phone: '',
  taxId: '',
  businessType: 'company',
  address: '',
  city: '',
  state: '',
  zipCode: '',
};

const EMPTY_ACCOUNT: AccountForm = {
  fullName: '',
  email: '',
  currentPassword: '',
};

function deriveJoinedDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-AU', {
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function ProviderProfilePageInner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useProviderProfile();
  const updateProfile = useUpdateProviderProfile();
  const updateAccount = useUpdateProviderAccount();
  const logoutMutation = useLogout();
  const { user } = useAuthStore();
  useCurrentUser();

  const profile = data?.profile;

  const [accountForm, setAccountForm] = useState<AccountForm>(EMPTY_ACCOUNT);
  const [accountErrors, setAccountErrors] = useState<Partial<Record<keyof AccountForm | 'general', string>>>({});
  const [accountSuccess, setAccountSuccess] = useState(false);
  const [editingAccount, setEditingAccount] = useState(false);

  const [businessForm, setBusinessForm] = useState<BusinessForm>(EMPTY_BUSINESS);
  const [businessErrors, setBusinessErrors] = useState<Partial<Record<keyof BusinessForm | 'general', string>>>({});
  const [businessSuccess, setBusinessSuccess] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(false);

  // Mirror the server-fetched profile into editable form state. This is
  // the canonical "external source → local form" pattern, and the linter
  // rule's preferred alternatives (keyed remount, derived state) would
  // either flicker the inputs while a user types or fight react-hook-form.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!profile) return;
    setAccountForm({
      fullName: user?.fullName ?? '',
      email: profile.email ?? user?.email ?? '',
      currentPassword: '',
    });
    setBusinessForm({
      businessName: profile.businessName ?? '',
      contactName: profile.contactName ?? '',
      phone: profile.phone ?? '',
      taxId: profile.taxId ?? '',
      businessType: profile.businessType ?? 'company',
      address: profile.address ?? '',
      city: profile.city ?? '',
      state: profile.state ?? '',
      zipCode: profile.zipCode ?? '',
    });
  }, [profile, user?.email, user?.fullName]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('stripe_return') || q.get('stripe_refresh')) {
      queryClient.invalidateQueries({ queryKey: PROVIDER_PROFILE_QUERY_KEY });
      window.history.replaceState({}, '', '/provider/profile');
    }
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/80">
        Loading provider profile…
      </div>
    );
  }
  if (isError || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/80">
        Unable to load provider profile. Please try again later.
      </div>
    );
  }
  if (profile.status !== 'approved') {
    return (
      <ProviderPendingNotice
        onLogout={() =>
          logoutMutation.mutate(undefined, { onSuccess: () => router.push('/') })
        }
        isLoggingOut={logoutMutation.isPending}
      />
    );
  }

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setAccountSuccess(false);
    const errors: typeof accountErrors = {};

    const fullName = accountForm.fullName.trim();
    const email = accountForm.email.trim().toLowerCase();
    const baselineFullName = (user?.fullName ?? '').trim();
    const baselineEmail = (profile.email ?? user?.email ?? '').toLowerCase();

    if (fullName.length < 2) errors.fullName = 'Full name must be at least 2 characters.';
    if (email && !isValidEmail(email)) errors.email = 'Enter a valid email address.';

    const emailChanging = email && email !== baselineEmail;
    if (emailChanging && !accountForm.currentPassword) {
      errors.currentPassword = 'Confirm with your current password to change email.';
    }

    if (Object.keys(errors).length > 0) {
      setAccountErrors(errors);
      return;
    }

    if (fullName === baselineFullName && !emailChanging) {
      setAccountErrors({ general: 'No changes to save.' });
      return;
    }

    setAccountErrors({});
    const payload: { fullName?: string; email?: string; currentPassword?: string } = {};
    if (fullName !== baselineFullName) payload.fullName = fullName;
    if (emailChanging) {
      payload.email = email;
      payload.currentPassword = accountForm.currentPassword;
    }

    updateAccount.mutate(payload, {
      onSuccess: () => {
        setAccountSuccess(true);
        setAccountForm((prev) => ({ ...prev, currentPassword: '' }));
        setEditingAccount(false);
      },
      onError: (err) => {
        const field = (err as { field?: string }).field;
        const message = err instanceof Error ? err.message : 'Failed to update account';
        if (field && (field === 'fullName' || field === 'email' || field === 'currentPassword')) {
          setAccountErrors({ [field]: message } as typeof accountErrors);
        } else {
          setAccountErrors({ general: message });
        }
      },
    });
  };

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    setBusinessSuccess(false);
    const errors: typeof businessErrors = {};

    if (!businessForm.businessName.trim()) errors.businessName = 'Required.';
    if (!businessForm.contactName.trim()) errors.contactName = 'Required.';
    const phoneDigits = businessForm.phone.replace(/\D/g, '');
    if (!phoneDigits) {
      errors.phone = 'Required.';
    } else if (!isValidPhoneDigits(phoneDigits)) {
      errors.phone = 'Phone must be 10-15 digits only.';
    }
    if (!businessForm.address.trim()) errors.address = 'Required.';
    if (!businessForm.city.trim()) errors.city = 'Required.';
    if (!businessForm.state.trim()) errors.state = 'Required.';
    if (!businessForm.zipCode.trim()) errors.zipCode = 'Required.';

    if (Object.keys(errors).length > 0) {
      setBusinessErrors(errors);
      return;
    }
    setBusinessErrors({});

    updateProfile.mutate(
      {
        businessName: businessForm.businessName.trim(),
        contactName: businessForm.contactName.trim(),
        phone: phoneDigits,
        address: businessForm.address.trim(),
        city: businessForm.city.trim(),
        state: businessForm.state.trim(),
        zipCode: businessForm.zipCode.trim(),
        taxId: businessForm.taxId.trim(),
        businessType: businessForm.businessType,
      },
      {
        onSuccess: () => {
          setBusinessSuccess(true);
          setEditingBusiness(false);
        },
        onError: (err) => {
          const field = (err as { field?: string }).field as keyof BusinessForm | undefined;
          const message = err instanceof Error ? err.message : 'Failed to update profile';
          if (field) {
            setBusinessErrors({ [field]: message } as typeof businessErrors);
          } else {
            setBusinessErrors({ general: message });
          }
        },
      },
    );
  };

  return (
    <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
      <div className="mb-8 sm:mb-12">
        <Link
          href="/provider/dashboard"
          className="inline-flex items-center text-blue-300 hover:text-blue-400 mb-4 transition-colors"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
          Provider Profile
        </h1>
        <p className="text-base sm:text-lg text-white/70">
          Keep your personal, business, and payout details up to date.
        </p>
      </div>

      <Card className="p-6 mb-8" style={{ borderColor: 'rgba(34, 197, 94, 0.3)' }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <CheckCircle2
              className="h-9 w-9 text-emerald-400 shrink-0"
              strokeWidth={1.5}
              aria-hidden
            />
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Account approved</h3>
              <p className="text-sm text-white/70">
                You can manage listings, take bookings, and receive payouts. Joined{' '}
                {deriveJoinedDate(profile.createdAt)}.
              </p>
            </div>
          </div>
          <div className="px-4 py-2 rounded-lg bg-green-500/20 border border-green-400/30">
            <span className="text-green-300 text-sm font-semibold">Approved</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: '1.5rem' }}>
        <div className="lg:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Personal account */}
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-3">
                <UserCog className="h-7 w-7 text-white/85" strokeWidth={1.5} aria-hidden />
                <div>
                  <h2 className="text-xl font-bold text-white">Personal account</h2>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Used to sign in and contact you about payouts and bookings.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant={editingAccount ? 'outline' : 'secondary'}
                onClick={() => {
                  setEditingAccount((v) => !v);
                  setAccountErrors({});
                  setAccountSuccess(false);
                }}
              >
                {editingAccount ? 'Cancel' : 'Edit'}
              </Button>
            </div>
            {accountErrors.general ? (
              <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {accountErrors.general}
              </div>
            ) : null}
            {accountSuccess ? (
              <div
                className="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
                role="status"
              >
                Account updated.
              </div>
            ) : null}
            <form onSubmit={handleSaveAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '1rem' }}>
                <Input
                  label="Full name"
                  type="text"
                  value={accountForm.fullName}
                  onChange={(e) => setAccountForm({ ...accountForm, fullName: e.target.value })}
                  disabled={!editingAccount}
                  error={accountErrors.fullName}
                />
                <Input
                  label="Email address"
                  type="email"
                  value={accountForm.email}
                  onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                  disabled={!editingAccount}
                  error={accountErrors.email}
                  autoComplete="email"
                />
              </div>
              {editingAccount &&
              accountForm.email.trim().toLowerCase() !==
                (profile.email ?? user?.email ?? '').toLowerCase() ? (
                <Input
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                  value={accountForm.currentPassword}
                  onChange={(e) =>
                    setAccountForm({ ...accountForm, currentPassword: e.target.value })
                  }
                  error={accountErrors.currentPassword}
                  required
                />
              ) : null}
              {editingAccount ? (
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button type="submit" disabled={updateAccount.isPending}>
                    {updateAccount.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              ) : null}
            </form>
          </Card>

          {/* Business info */}
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-3">
                <Building2 className="h-7 w-7 text-white/85" strokeWidth={1.5} aria-hidden />
                <div>
                  <h2 className="text-xl font-bold text-white">Business information</h2>
                  <p className="text-sm text-white/70 leading-relaxed">
                    Shown to renters and printed on invoices. Phone and address are also used
                    for payout verification.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant={editingBusiness ? 'outline' : 'secondary'}
                onClick={() => {
                  setEditingBusiness((v) => !v);
                  setBusinessErrors({});
                  setBusinessSuccess(false);
                }}
              >
                {editingBusiness ? 'Cancel' : 'Edit'}
              </Button>
            </div>
            {businessErrors.general ? (
              <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {businessErrors.general}
              </div>
            ) : null}
            {businessSuccess ? (
              <div
                className="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
                role="status"
              >
                Business details updated.
              </div>
            ) : null}
            <form onSubmit={handleSaveBusiness} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="block text-white/95 text-sm font-semibold mb-2">
                  Account type
                </label>
                <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                  <button
                    type="button"
                    disabled={!editingBusiness}
                    onClick={() => setBusinessForm({ ...businessForm, businessType: 'individual' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      businessForm.businessType === 'individual'
                        ? 'border-blue-500/50 bg-blue-500/20'
                        : 'border-white/20 bg-white/5'
                    } text-white ${!editingBusiness ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
                  >
                    <div className="mb-2 flex justify-center">
                      <User className="h-7 w-7 text-white" strokeWidth={1.5} aria-hidden />
                    </div>
                    <div className="font-semibold text-sm">Individual</div>
                  </button>
                  <button
                    type="button"
                    disabled={!editingBusiness}
                    onClick={() => setBusinessForm({ ...businessForm, businessType: 'company' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      businessForm.businessType === 'company'
                        ? 'border-blue-500/50 bg-blue-500/20'
                        : 'border-white/20 bg-white/5'
                    } text-white ${!editingBusiness ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
                  >
                    <div className="mb-2 flex justify-center">
                      <Building2 className="h-7 w-7 text-white" strokeWidth={1.5} aria-hidden />
                    </div>
                    <div className="font-semibold text-sm">Company</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '1rem' }}>
                <Input
                  label={businessForm.businessType === 'company' ? 'Company name' : 'Trading name'}
                  type="text"
                  value={businessForm.businessName}
                  onChange={(e) =>
                    setBusinessForm({ ...businessForm, businessName: e.target.value })
                  }
                  disabled={!editingBusiness}
                  error={businessErrors.businessName}
                />
                <Input
                  label="Contact person"
                  type="text"
                  value={businessForm.contactName}
                  onChange={(e) =>
                    setBusinessForm({ ...businessForm, contactName: e.target.value })
                  }
                  disabled={!editingBusiness}
                  error={businessErrors.contactName}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '1rem' }}>
                <Input
                  label="Phone number"
                  type="tel"
                  value={businessForm.phone}
                  onChange={(e) => setBusinessForm({ ...businessForm, phone: e.target.value })}
                  disabled={!editingBusiness}
                  error={businessErrors.phone}
                  placeholder="10-15 digits"
                  autoComplete="tel"
                />
                <Input
                  label="Tax ID / EIN (optional)"
                  type="text"
                  value={businessForm.taxId}
                  onChange={(e) => setBusinessForm({ ...businessForm, taxId: e.target.value })}
                  disabled={!editingBusiness}
                  error={businessErrors.taxId}
                />
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-white/70" aria-hidden />
                  <span className="text-sm font-semibold text-white/85">Business address</span>
                </div>
                <Input
                  label="Street address"
                  type="text"
                  value={businessForm.address}
                  onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })}
                  disabled={!editingBusiness}
                  error={businessErrors.address}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 mt-4" style={{ gap: '1rem' }}>
                  <Input
                    label="City"
                    type="text"
                    value={businessForm.city}
                    onChange={(e) => setBusinessForm({ ...businessForm, city: e.target.value })}
                    disabled={!editingBusiness}
                    error={businessErrors.city}
                  />
                  <Input
                    label="State"
                    type="text"
                    value={businessForm.state}
                    onChange={(e) => setBusinessForm({ ...businessForm, state: e.target.value })}
                    disabled={!editingBusiness}
                    error={businessErrors.state}
                  />
                  <Input
                    label="Zip code"
                    type="text"
                    value={businessForm.zipCode}
                    onChange={(e) => setBusinessForm({ ...businessForm, zipCode: e.target.value })}
                    disabled={!editingBusiness}
                    error={businessErrors.zipCode}
                  />
                </div>
              </div>

              {editingBusiness ? (
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button type="submit" disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              ) : null}
            </form>
          </Card>

          {/* Banking */}
          <ProviderBankingSection
            banking={profile.banking}
            stripe={profile.stripeConnect}
          />

          {/* Security */}
          <ProviderSecuritySection />
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card className="p-6 sm:p-8">
            <h3 className="text-lg font-bold text-white mb-6">Quick actions</h3>
            <div className="flex flex-col" style={{ gap: '0.75rem' }}>
              <Link href="/provider/spaces">
                <Button variant="outline" fullWidth>
                  Manage spaces
                </Button>
              </Link>
              <Link href="/provider/earnings">
                <Button variant="outline" fullWidth>
                  View earnings
                </Button>
              </Link>
              <a href="#banking">
                <Button variant="outline" fullWidth>
                  Banking &amp; payouts
                </Button>
              </a>
              <a href="#security">
                <Button variant="outline" fullWidth>
                  Change password
                </Button>
              </a>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Account information</h3>
            <dl className="text-sm" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="flex justify-between gap-3">
                <dt className="text-white/70">Status</dt>
                <dd className="text-green-300 font-semibold">Approved</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/70">Member since</dt>
                <dd className="text-white">{deriveJoinedDate(profile.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/70">Profile updated</dt>
                <dd className="text-white">{deriveJoinedDate(profile.updatedAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/70">Payouts ready</dt>
                <dd
                  className={
                    profile.stripeConnect?.readyForPayments
                      ? 'text-emerald-300 font-semibold'
                      : 'text-amber-300 font-semibold'
                  }
                >
                  {profile.stripeConnect?.readyForPayments ? 'Yes' : 'Not yet'}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ProviderProfilePage() {
  return (
    <AuthGuard allowedRoles={['provider']}>
      <ProviderProfilePageInner />
    </AuthGuard>
  );
}
