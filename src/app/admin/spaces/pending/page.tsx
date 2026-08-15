'use client';

import Link from 'next/link';
import { PartyPopper } from 'lucide-react';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AuthGuard } from '@/components/AuthGuard';
import { usePendingSpaces, useUpdateSpaceStatus, PendingSpace } from '@/features/admin/spaces/hooks';

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${value}`;
  }
}

function SpaceCard({ entry }: { entry: PendingSpace }) {
  const mutation = useUpdateSpaceStatus();

  const handleUpdate = (status: 'approved' | 'rejected') => {
    mutation.mutate({
      spaceId: entry.space.id,
      status,
      isActive: status === 'approved' ? entry.space.isActive : false,
    });
  };

  const handleReject = (status: 'approved' | 'rejected') => {
    mutation.mutate({
      spaceId: entry.space.id,
      status,
      isActive: status === 'approved' ? entry.space.isActive : false,
    });
  };
  return (
    <Card className="p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white mb-1">{entry.space.title}</h2>
          <p className="text-sm text-white/70">
            {[entry.space.address, entry.space.city, entry.space.state]
              .filter(Boolean)
              .join(', ') || 'Location not provided'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-xs text-yellow-300 bg-yellow-500/20 border border-yellow-400/30 px-3 py-1 rounded-full">
            Submitted {new Date(entry.space.createdAt).toLocaleString('en-AU')}
          </span>
          <Link
            href={`/admin/spaces/pending/${entry.space.id}`}
            className="text-xs uppercase tracking-wide text-blue-200 hover:text-blue-100"
          >
            View details →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 text-sm text-white/80" style={{ gap: '1rem' }}>
        <div>
          <p className="uppercase text-xs text-white/50">Hourly Rate</p>
          <p className="font-medium">
            {formatCurrency(entry.space.hourlyRate, entry.space.currency)}
          </p>
        </div>
        <div>
          <p className="uppercase text-xs text-white/50">Amenities</p>
          <p className="font-medium">
            {(entry.space.amenities ?? []).length > 0
              ? entry.space.amenities.join(', ')
              : 'Not specified'}
          </p>
        </div>
        <div>
          <p className="uppercase text-xs text-white/50">Provider</p>
          <p className="font-medium">
            {entry.provider
              ? `${entry.provider.fullName} (${entry.provider.email})`
              : 'Unknown provider'}
          </p>
        </div>
      </div>

      <div className="text-sm text-white/80 border border-white/10 rounded-lg p-4 bg-white/5">
        <p className="uppercase text-xs text-white/50 mb-2">Provider Business</p>
        <p className="font-medium">
          {entry.profile?.businessName || 'No business profile supplied'}
        </p>
        {entry.profile?.phone && (
          <p className="text-xs text-white/60 mt-1">Phone: {entry.profile.phone}</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-white/10" style={{ gap: '1rem' }}>
        <div className="text-xs text-white/60">
          Approve the space to make it available to guests. Reject with notes if details look suspicious or incomplete.
        </div>
        <div className="flex" style={{ gap: '1rem' }}>
          <Button
            variant="outline"
            style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}
            disabled={mutation.isPending}
            onClick={() => handleReject('rejected')}
          >
            {mutation.isPending ? 'Processing...' : 'Reject'}
          </Button>
          <Button
            disabled={mutation.isPending}
            onClick={() => handleUpdate('approved')}
          >
            {mutation.isPending ? 'Processing...' : 'Approve'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function PendingSpacesPage() {
  const { data, isLoading, isError } = usePendingSpaces();

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
            Pending Space Approvals
          </h1>
          <p className="text-base sm:text-lg text-white/70">
            Review newly submitted parking spaces before they go live to users.
          </p>
        </div>

        {isLoading ? (
          <div className="min-h-[200px] flex items-center justify-center text-white/70">
            Loading pending spaces...
          </div>
        ) : isError ? (
          <Card className="p-8 text-center text-red-200 border-red-500/40 bg-red-500/10">
            Unable to load pending spaces. Please try again later.
          </Card>
        ) : data && data.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2" style={{ gap: '1.5rem' }}>
            {data.map((entry) => (
              <SpaceCard key={entry.space.id} entry={entry} />
            ))}
          </div>
        ) : (
          <Card className="p-10 text-center">
            <div className="mb-4 flex justify-center">
              <PartyPopper className="h-14 w-14 text-emerald-300" strokeWidth={1.25} aria-hidden />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No pending spaces</h2>
            <p className="text-white/70">
              All submitted spaces have been reviewed. New submissions will appear here automatically.
            </p>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}
