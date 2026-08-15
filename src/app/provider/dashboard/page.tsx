'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AuthGuard } from '@/components/AuthGuard';
import { useProviderActivity, useProviderEarnings, useProviderProfile } from '@/features/provider/hooks';
import { ProviderPendingNotice } from '@/components/ProviderPendingNotice';
import { useLogout } from '@/features/auth/hooks';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  Car,
  CheckCircle2,
  DollarSign,
  Plus,
  Settings,
  User,
} from 'lucide-react';

function formatAud(amount: number) {
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatPaidShort(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

const quickActions: {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  bgGradient: string;
  borderColor: string;
}[] = [
  {
    title: 'Add New Space',
    description: 'List a new parking space',
    icon: Plus,
    href: '/provider/spaces/new',
    bgGradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  {
    title: 'Manage Spaces',
    description: 'View and edit your parking spaces',
    icon: Car,
    href: '/provider/spaces',
    bgGradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.1) 100%)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  {
    title: 'Bookings',
    description: 'Calendar and reservations for your spaces',
    icon: Calendar,
    href: '/provider/bookings',
    bgGradient: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(202, 138, 4, 0.1) 100%)',
    borderColor: 'rgba(234, 179, 8, 0.35)',
  },
  {
    title: 'Earnings',
    description: 'Paid bookings, platform fee, and your share',
    icon: DollarSign,
    href: '/provider/earnings',
    bgGradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.12) 100%)',
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },
  {
    title: 'Profile Settings',
    description: 'Update your provider profile',
    icon: Settings,
    href: '/provider/profile',
    bgGradient: 'linear-gradient(135deg, rgba(20, 184, 166, 0.2) 0%, rgba(13, 148, 136, 0.1) 100%)',
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
];

export default function ProviderDashboard() {
  const router = useRouter();
  const { data, isLoading, isError } = useProviderProfile();
  const logoutMutation = useLogout();
  const profileStatus = data?.profile.status;
  const profile = data?.profile;
  const connectReady = data?.profile.stripeConnect?.readyForPayments === true;
  const stripeSummary = data?.profile.stripeConnect;
  const liveDataEnabled = profileStatus === 'approved';
  const { data: earningsData, isLoading: loadingEarnings } = useProviderEarnings(
    undefined,
    undefined,
    liveDataEnabled,
  );
  const { data: activity, isLoading: loadingActivity } = useProviderActivity(liveDataEnabled);

  const completionChecks = [
    Boolean(profile?.businessName?.trim()),
    Boolean(profile?.contactName?.trim()),
    Boolean(profile?.phone?.trim()),
    Boolean(profile?.address?.trim()),
    Boolean(profile?.city?.trim()),
    Boolean(profile?.state?.trim()),
    Boolean(profile?.zipCode?.trim()),
    Boolean(profile?.taxId?.trim()),
    Boolean(profile?.businessType),
    Boolean(stripeSummary?.hasAccount),
    Boolean(stripeSummary?.detailsSubmitted),
  ];
  const completionTotal = completionChecks.length;
  const completionDone = completionChecks.filter(Boolean).length;
  const profileCompletionPercent = Math.round((completionDone / completionTotal) * 100);

  const verificationLabel = connectReady ? 'Ready for payments' : 'Setup required';
  const verificationBadgeClass = connectReady
    ? 'text-xs text-white bg-green-500/20 px-2 py-1 rounded'
    : 'text-xs text-white bg-amber-500/20 px-2 py-1 rounded';
  const verificationHint = connectReady
    ? 'Stripe onboarding is complete. You can accept payments and list new spaces.'
    : stripeSummary?.hasAccount
      ? 'Stripe account connected. Complete remaining onboarding checks to enable payments.'
      : 'Connect Stripe to enable payments and publish new listings.';
  const primaryProfileActionLabel = profileCompletionPercent >= 100 ? 'Edit Profile' : 'Complete Profile';
  const stripeActionLabel = !stripeSummary?.hasAccount
    ? 'Connect Stripe'
    : connectReady
      ? 'Add New Space'
      : 'Finish Stripe setup';
  const stripeActionHref = connectReady ? '/provider/spaces/new' : '/provider/profile';

  return (
    <AuthGuard allowedRoles={['provider']}>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center text-white/80">
          Loading your provider account...
        </div>
      ) : isError || !profileStatus ? (
        <div className="min-h-screen flex items-center justify-center text-white/80">
          Unable to load provider profile. Please try again later.
        </div>
      ) : profileStatus !== 'approved' ? (
        <ProviderPendingNotice
          onLogout={() =>
            logoutMutation.mutate(undefined, {
              onSuccess: () => router.push('/'),
            })
          }
          isLoggingOut={logoutMutation.isPending}
        />
      ) : (
        <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
      {/* Header Section */}
      <div className="mb-8 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
              Provider Dashboard
            </h1>
            <p className="text-base sm:text-lg text-white/70">
              Manage your parking spaces and bookings
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-lg bg-green-500/20 border border-green-400/30 flex items-center gap-2">
              <CheckCircle2 className="h-9 w-9 text-green-400 shrink-0 text-white" aria-hidden />
              <span className=" text-lg font-semibold text-white bg-white/10 px-2 py-1 rounded-lg">Approved</span>
            </div>
            <Link href="/provider/profile">
              <Button variant="outline" size="sm">
                View Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Account Status Banner */}
      {/* Account Status Banner removed for approved */}
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8 sm:mb-12" style={{ gap: '1.5rem' }}>
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <Car className="h-7 w-7 sm:h-8 sm:w-8 text-white/90" strokeWidth={1.5} aria-hidden />
            <div className="text-xs sm:text-sm text-white/60">Total Spaces</div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
            {loadingActivity ? '…' : (activity?.activeListingCount ?? 0)}
          </div>
          <div className="text-xs text-blue-400">Active listings</div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="h-7 w-7 sm:h-8 sm:w-8 text-white/90" strokeWidth={1.5} aria-hidden />
            <div className="text-xs sm:text-sm text-white/60">Paid bookings</div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
            {loadingActivity ? '…' : (activity?.paidBookingsThisMonthCount ?? 0)}
          </div>
          <div className="text-xs text-green-400">This month (paid)</div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-7 w-7 sm:h-8 sm:w-8 text-white/90" strokeWidth={1.5} aria-hidden />
            <div className="text-xs sm:text-sm text-white/60">Your share</div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
            {loadingEarnings ? '…' : formatAud(earningsData?.totals.providerShareAud ?? 0)}
          </div>
          <div className="text-xs text-green-400">Confirmed · last 90 days</div>
        </Card>

        {/* <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <Hourglass className="h-7 w-7 sm:h-8 sm:w-8 text-white/90" strokeWidth={1.5} aria-hidden />
            <div className="text-xs sm:text-sm text-white/60">Pending</div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{stats.pendingApprovals}</div>
          <div className="text-xs text-yellow-400">Awaiting approval</div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <Star className="h-7 w-7 sm:h-8 sm:w-8 text-amber-300" strokeWidth={1.5} aria-hidden />
            <div className="text-xs sm:text-sm text-white/60">Rating</div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{stats.rating}</div>
          <div className="text-xs text-yellow-400">{stats.totalReviews} reviews</div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="h-7 w-7 sm:h-8 sm:w-8 text-white/90" strokeWidth={1.5} aria-hidden />
            <div className="text-xs sm:text-sm text-white/60">Occupancy</div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white mb-1">78%</div>
          <div className="text-xs text-blue-400">This week</div>
        </Card> */}
      </div>

      {/* Quick Actions */}
      <div className="mb-8 sm:mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" style={{ gap: '1.5rem' }}>
          {quickActions.map((action, index) => {
            const isAddSpace = action.title === 'Add New Space';
            const href = isAddSpace && !connectReady ? '/provider/profile' : action.href;
            const description =
              isAddSpace && !connectReady
                ? 'Complete Stripe setup on your profile before listing a space'
                : action.description;
            const ActionIcon = action.icon;
            const bookingsPending = action.title === 'Bookings' && (activity?.pendingPaymentCount ?? 0) > 0;
            const earningsSignal = action.title === 'Earnings' && (activity?.paidLast7DaysCount ?? 0) > 0;
            return (
              <Link key={index} href={href} className="relative block">
                {bookingsPending && (
                  <span
                    className="absolute -top-1 -right-1 z-10 min-w-[1.25rem] h-6 px-1.5 rounded-full bg-amber-500/90 text-white text-xs font-bold flex items-center justify-center border border-amber-300/50 shadow-lg"
                    title={`${activity?.pendingPaymentCount} booking(s) awaiting payment`}
                  >
                    {activity?.pendingPaymentCount}
                  </span>
                )}
                {earningsSignal && (
                  <span
                    className="absolute -top-1 -right-1 z-10 min-w-[1.25rem] h-6 px-1.5 rounded-full bg-emerald-500/90 text-white text-xs font-bold flex items-center justify-center border border-emerald-300/50 shadow-lg"
                    title={`${activity?.paidLast7DaysCount} payment(s) in the last 7 days`}
                  >
                    {activity?.paidLast7DaysCount}
                  </span>
                )}
                <Card
                  className="p-6 cursor-pointer h-full"
                  style={{
                    borderColor: action.borderColor,
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="p-3 rounded-xl flex items-center justify-center"
                      style={{
                        background: action.bgGradient,
                      }}
                    >
                      <ActionIcon className="h-10 w-10 sm:h-12 sm:w-12 text-white" strokeWidth={1.5} aria-hidden />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">{action.title}</h3>
                      <p className="text-sm text-white/70 leading-relaxed">{description}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Bookings and Profile Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '2rem' }}>
        {/* Recent Bookings */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Recent paid bookings</h2>
            <div className="flex items-center gap-4">
              <Link
                href="/provider/earnings"
                className="text-sm text-emerald-300/90 hover:text-emerald-200 transition-colors"
              >
                Earnings →
              </Link>
              <Link
                href="/provider/bookings"
                className="text-sm text-blue-300 hover:text-blue-400 transition-colors"
              >
                All bookings →
              </Link>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!activity?.recentPaid?.length ? (
              <p className="text-sm text-white/65">
                No confirmed payments yet. When customers complete checkout, they will appear here.
              </p>
            ) : (
              activity.recentPaid.map((row) => (
                <div
                  key={row.bookingId}
                  className="p-4 rounded-lg border border-white/10 hover:border-white/20 transition-all"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white text-sm truncate">{row.spaceTitle}</span>
                        <span
                          className="px-2 py-1 rounded text-xs font-medium shrink-0"
                          style={{
                            background: 'rgba(34, 197, 94, 0.2)',
                            color: '#86efac',
                          }}
                        >
                          Paid
                        </span>
                      </div>
                      <p className="text-xs text-white/70 mb-1 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 shrink-0 text-white/60" aria-hidden />
                        {row.consumerName}
                      </p>
                      <p className="text-xs text-white/60 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-white/50" aria-hidden />
                        {formatPaidShort(row.paidAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-white tabular-nums">
                        {formatAud(row.providerShareAud)}
                      </div>
                      <div className="text-xs text-white/60">Your share</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Profile Status */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Profile Status</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Profile Completion */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">Profile Completion</span>
                <span className="text-xs text-white/60">{profileCompletionPercent}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${profileCompletionPercent}%` }}
                />
              </div>
            </div>

            {/* Verification Status */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">Account Verification</span>
                <span className={verificationBadgeClass}>{verificationLabel}</span>
              </div>
              <p className="text-xs text-white/60 mt-2">
                {verificationHint}
              </p>
            </div>

            {/* Quick Profile Actions */}
            <div className="pt-4 border-t border-white/10">
              <h3 className="text-sm font-semibold text-white mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
                <Link href="/provider/profile">
                  <button
                    className="w-full px-4 py-2 rounded-lg text-sm font-medium text-white transition-all text-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.2) 100%)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(37, 99, 235, 0.3) 100%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.2) 100%)';
                    }}
                  >
                    {primaryProfileActionLabel}
                  </button>
                </Link>
                <Link href={stripeActionHref}>
                  <button
                    type="button"
                    className="w-full px-4 py-2 rounded-lg text-sm font-medium text-white transition-all text-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.3) 0%, rgba(13, 148, 136, 0.2) 100%)',
                      border: '1px solid rgba(20, 184, 166, 0.3)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(20, 184, 166, 0.4) 0%, rgba(13, 148, 136, 0.3) 100%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(20, 184, 166, 0.3) 0%, rgba(13, 148, 136, 0.2) 100%)';
                    }}
                  >
                    {stripeActionLabel}
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
        </div>
      </div>
      )}
    </AuthGuard>
  );
}

