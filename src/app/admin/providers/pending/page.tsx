'use client';

import Link from 'next/link';
import { PartyPopper } from 'lucide-react';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AuthGuard } from '@/components/AuthGuard';
import { usePendingProviders, useUpdateProviderStatus } from '@/features/admin/providers/hooks';

export default function PendingProvidersPage() {
  const { data, isLoading, isError } = usePendingProviders();
  const updateStatusMutation = useUpdateProviderStatus();

  const providers = data?.providers ?? [];

  return (
    <AuthGuard allowedRoles={['admin']}>
      <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
        <div className="mb-8 sm:mb-12">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center text-blue-300 hover:text-blue-400 mb-4 transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
            Pending Provider Approvals
          </h1>
          <p className="text-base sm:text-lg text-white/70">
            Review provider applications and approve or reject them to control marketplace access.
          </p>
        </div>

        {isLoading && (
          <div className="min-h-[200px] flex items-center justify-center text-white/70">
            Loading pending providers...
          </div>
        )}

        {isError && (
          <Card className="p-8 text-center text-red-200 border-red-500/40 bg-red-500/10">
            Unable to load pending providers. Please try again later.
          </Card>
        )}

        {!isLoading && !isError && providers.length > 0 && (
          <div className="grid grid-cols-1 xl:grid-cols-2" style={{ gap: '1.5rem' }}>
            {providers.map(({ profile, user }) => (
              <Card key={profile.userId} className="p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} hover>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">
                      {profile.businessName || 'No business name'}
                    </h2>
                    <p className="text-sm text-white/70">
                      Contact: {profile.contactName || user?.fullName || 'Unknown'}
                    </p>
                  </div>
                  <span className="text-xs text-yellow-300 bg-yellow-500/20 border border-yellow-400/30 px-3 py-1 rounded-full">
                    Submitted {new Date(profile.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 text-sm text-white/80" style={{ gap: '1rem' }}>
                  <div>
                    <p className="uppercase text-xs text-white/50">Email</p>
                    <p className="font-medium">{user?.email || '—'}</p>
                  </div>
                  <div>
                    <p className="uppercase text-xs text-white/50">Phone</p>
                    <p className="font-medium">{profile.phone || '—'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="uppercase text-xs text-white/50">Address</p>
                    <p className="font-medium">
                      {profile.address && profile.city && profile.state && profile.zipCode
                        ? `${profile.address}, ${profile.city}, ${profile.state} ${profile.zipCode}`
                        : profile.address || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase text-xs text-white/50">Business Type</p>
                    <p className="font-medium">{profile.businessType || '—'}</p>
                  </div>
                  <div>
                    <p className="uppercase text-xs text-white/50">Last 4 Bank Digits</p>
                    <p className="font-medium">{profile.bankAccountLast4 || '—'}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-white/10" style={{ gap: '1rem' }}>
                  <div className="text-xs text-white/60">
                    Approve the provider to allow listings, or reject if details look suspicious.
                  </div>
                  <div className="flex items-center" style={{ gap: '1rem' }}>
                    <Button
                      variant="outline"
                      style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}
                      disabled={updateStatusMutation.isPending}
                      onClick={() =>
                        updateStatusMutation.mutate({ userId: profile.userId, status: 'rejected' })
                      }
                    >
                      {updateStatusMutation.isPending ? 'Processing...' : 'Reject'}
                    </Button>
                    <Button
                      disabled={updateStatusMutation.isPending}
                      onClick={() =>
                        updateStatusMutation.mutate({ userId: profile.userId, status: 'approved' })
                      }
                    >
                      {updateStatusMutation.isPending ? 'Processing...' : 'Approve'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && !isError && providers.length === 0 && (
          <Card className="p-10 text-center mt-10">
            <div className="mb-4 flex justify-center">
              <PartyPopper className="h-14 w-14 text-emerald-300" strokeWidth={1.25} aria-hidden />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No pending approvals</h2>
            <p className="text-white/70">
              All providers have been reviewed. New applications will appear here automatically.
            </p>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}
