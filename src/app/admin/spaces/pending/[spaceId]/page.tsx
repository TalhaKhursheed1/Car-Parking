'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AuthGuard } from '@/components/AuthGuard';
import { useAdminSpace, useUpdateSpaceStatus } from '@/features/admin/spaces/hooks';

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

function AdminSpaceDetailContent({ spaceId }: { spaceId: string }) {
  const router = useRouter();
  const { data, isLoading, isError } = useAdminSpace(spaceId);
  const mutation = useUpdateSpaceStatus();
  const [currentImage, setCurrentImage] = useState(0);
  const images = data?.space?.images ?? [];

  const handleDecision = (status: 'approved' | 'rejected') => {
    if (!spaceId) return;
    mutation.mutate(
      {
        spaceId,
        status,
        isActive: status === 'approved' ? data?.space?.isActive ?? false : false,
      },
      {
        onSuccess: () => {
          router.push('/admin/spaces/pending');
        },
      },
    );
  };

  if (!spaceId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/80">
        Invalid space identifier.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/80">
        Loading space details...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center text-red-200 border-red-500/40 bg-red-500/10">
          Unable to load space details. Please return to the pending list and try again.
        </Card>
      </div>
    );
  }

  const { space, provider, profile } = data;
  const imageCount = images.length;
  const safeCurrentIndex = imageCount === 0 ? 0 : Math.min(currentImage, imageCount - 1);
  const hasMultipleImages = imageCount > 1;

  const handlePreviousImage = () => {
    if (imageCount <= 1) return;
    setCurrentImage((prev) => (prev - 1 + imageCount) % imageCount);
  };

  const handleNextImage = () => {
    if (imageCount <= 1) return;
    setCurrentImage((prev) => (prev + 1) % imageCount);
  };

  const currentImageSrc = imageCount > 0 ? images[safeCurrentIndex] : '';

  return (
    <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/spaces/pending"
            className="inline-flex items-center text-blue-300 hover:text-blue-200 mb-2 transition-colors"
          >
            ← Back to pending spaces
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">{space.title}</h1>
          <p className="text-white/70">
            {[space.address, space.city, space.state].filter(Boolean).join(', ') || 'Location not provided'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-xs uppercase tracking-wide text-white/70">
            Submitted {new Date(space.createdAt).toLocaleString('en-AU')}
          </span>
          <span className="text-xs text-yellow-300 bg-yellow-500/20 border border-yellow-400/30 px-3 py-1 rounded-full">
            Status: {space.status.toUpperCase()}
          </span>
        </div>
      </div>

      {imageCount > 0 ? (
        <div className="relative flex justify-center">
          <div
            className="relative w-full overflow-hidden rounded-xl border border-white/10"
            style={{ paddingBottom: '48%' }}
          >
            <Image
              key={currentImageSrc}
              src={currentImageSrc}
              alt={`${space.title} photo ${safeCurrentIndex + 1}`}
              fill
              className="object-cover transition-opacity duration-300"
              sizes="(max-width: 768px) 95vw, (max-width: 1280px) 70vw, 720px"
              priority={safeCurrentIndex === 0}
              unoptimized={process.env.NODE_ENV !== 'production'}
            />
          </div>

          {hasMultipleImages && (
            <>
              {/* <button
                type="button"
                onClick={handlePreviousImage}
                className="absolute top-1/2 left-2 sm:left-4 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
                aria-label="Previous photo"
              >
                ‹
              </button> */}
              <button
                type="button"
                onClick={handleNextImage}
                className="absolute top-0 bottom-0 right-2 sm:right-4 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
                aria-label="Next photo"
              >
                ›
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
                {safeCurrentIndex + 1} / {imageCount}
              </div>
            </>
          )}
        </div>
      ) : (
        <Card className="p-6 text-white/70 border-white/10 bg-white/5">
          No images were provided for this space.
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3" style={{ gap: '1.5rem' }}>
        <Card className="p-6 xl:col-span-2 border-white/10 bg-white/5" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Description</h2>
            <p className="text-white/70 leading-relaxed">
              {space.description?.trim() ? space.description : 'No detailed description supplied.'}
            </p>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '1rem' }}>
            <div className="border border-white/10 rounded-lg p-4 bg-white/5">
              <p className="uppercase text-xs text-white/50 mb-1">Hourly Rate</p>
              <p className="text-lg font-semibold text-white">
                {formatCurrency(space.hourlyRate, space.currency)}
              </p>
            </div>
            {space.dailyRate !== null && space.dailyRate !== undefined ? (
              <div className="border border-white/10 rounded-lg p-4 bg-white/5">
                <p className="uppercase text-xs text-white/50 mb-1">Daily Rate</p>
                <p className="text-lg font-semibold text-white">
                  {formatCurrency(space.dailyRate, space.currency)}
                </p>
              </div>
            ) : null}
            <div className="border border-white/10 rounded-lg p-4 bg-white/5">
              <p className="uppercase text-xs text-white/50 mb-1">Capacity</p>
              <p className="text-lg font-semibold text-white">
                {space.capacity !== null && space.capacity !== undefined ? `${space.capacity} vehicles` : 'Not specified'}
              </p>
            </div>
            <div className="border border-white/10 rounded-lg p-4 bg-white/5">
              <p className="uppercase text-xs text-white/50 mb-1">Availability</p>
              <p className="text-lg font-semibold text-white">
                {space.availabilityType === '24_7'
                  ? '24 / 7 Access'
                  : space.availabilityType === 'business_hours'
                    ? 'Business hours'
                    : 'Custom schedule'}
              </p>
            </div>
          </section>

          {space.availabilityType === 'custom' && space.customAvailability.length > 0 ? (
            <section>
              <h3 className="text-lg font-semibold text-white mb-3">Custom Availability</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '0.75rem' }}>
                {space.customAvailability.map((entry, index) => (
                  <div key={`${entry.day}-${index}`} className="border border-white/10 rounded-lg p-3 bg-white/5">
                    <p className="text-sm font-medium text-white">{entry.day}</p>
                    <p className="text-sm text-white/70">
                      {entry.startTime} – {entry.endTime}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="text-lg font-semibold text-white mb-3">Amenities</h3>
            {space.amenities.length > 0 ? (
              <div className="flex flex-wrap" style={{ gap: '0.5rem' }}>
                {space.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="px-3 py-1 rounded-full text-xs uppercase tracking-wide bg-white/10 text-white/80 border border-white/10"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-white/70">No amenities listed.</p>
            )}
          </section>

          {space.verificationNotes ? (
            <section>
              <h3 className="text-lg font-semibold text-white mb-3">Previous Verification Notes</h3>
              <p className="text-white/70">{space.verificationNotes}</p>
            </section>
          ) : null}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card className="p-6 border-white/10 bg-white/5" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 className="text-xl font-semibold text-white">Provider</h2>
            {provider ? (
              <div className="text-sm text-white/80" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p>{provider.fullName}</p>
                <p className="text-white/60">{provider.email}</p>
                <p className="text-white/50 uppercase text-xs">User ID: {provider.id}</p>
              </div>
            ) : (
              <p className="text-white/70">Provider record not found.</p>
            )}
          </Card>

          <Card className="p-6 border-white/10 bg-white/5" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 className="text-xl font-semibold text-white">Business Profile</h2>
            {profile ? (
              <div className="text-sm text-white/80" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p>
                  <span className="text-white/50 uppercase text-xs block">Business Name</span>
                  {profile.businessName || 'Not provided'}
                </p>
                <p>
                  <span className="text-white/50 uppercase text-xs block">Contact</span>
                  {profile.contactName || provider?.fullName || 'Not provided'}
                </p>
                <p>
                  <span className="text-white/50 uppercase text-xs block">Phone</span>
                  {profile.phone || 'Not provided'}
                </p>
                <p>
                  <span className="text-white/50 uppercase text-xs block">Address</span>
                  {[profile.address, profile.city, profile.state, profile.zipCode]
                    .filter(Boolean)
                    .join(', ') || 'Not provided'}
                </p>
                <p>
                  <span className="text-white/50 uppercase text-xs block">Payout Method</span>
                  {profile.payoutMethod || 'Not provided'}
                </p>
                {profile.bankAccountLast4 ? (
                  <p>
                    <span className="text-white/50 uppercase text-xs block">Account</span>
                    Ending in {profile.bankAccountLast4}
                  </p>
                ) : null}
                {profile.taxId ? (
                  <p>
                    <span className="text-white/50 uppercase text-xs block">Tax ID</span>
                    {profile.taxId}
                  </p>
                ) : null}
                <p>
                  <span className="text-white/50 uppercase text-xs block">Profile Status</span>
                  {profile.status}
                </p>
              </div>
            ) : (
              <p className="text-white/70">No provider profile available.</p>
            )}
          </Card>

          <Card className="p-6 border-white/10 bg-white/5" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 className="text-xl font-semibold text-white">Moderation</h2>
            <p className="text-sm text-white/70">
              Approve to make this space available for activation. Reject if the listing needs changes.
            </p>
            <div className="flex flex-col sm:flex-row" style={{ gap: '0.75rem' }}>
              <Button
                variant="outline"
                style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}
                disabled={mutation.isPending}
                onClick={() => handleDecision('rejected')}
              >
                {mutation.isPending ? 'Processing...' : 'Reject'}
              </Button>
              <Button
                disabled={mutation.isPending}
                onClick={() => handleDecision('approved')}
              >
                {mutation.isPending ? 'Processing...' : 'Approve'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AdminSpaceDetailPage() {
  const params = useParams<{ spaceId: string }>();
  const rawSpaceId = params?.spaceId;
  const spaceId = Array.isArray(rawSpaceId) ? rawSpaceId[0] : rawSpaceId ?? '';

  return (
    <AuthGuard allowedRoles={['admin']}>
      <AdminSpaceDetailContent key={spaceId} spaceId={spaceId} />
    </AuthGuard>
  );
}

