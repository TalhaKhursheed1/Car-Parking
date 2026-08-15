'use client';

import { useState, type CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  XCircle,
} from 'lucide-react';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AuthGuard } from '@/components/AuthGuard';
import { useProviderSpace } from '@/features/provider/hooks';
import type { ProviderSpaceStatus } from '@/features/provider/api';

/** Inline styles: this app’s globals.css only defines a subset of Tailwind-like classes. */
const badgeShell: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  borderRadius: '9999px',
  padding: '0.375rem 0.75rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.03em',
};

function statusPresentation(status: ProviderSpaceStatus): {
  Icon: typeof CheckCircle2;
  label: string;
  style: CSSProperties;
} {
  switch (status) {
    case 'approved':
      return {
        Icon: CheckCircle2,
        label: 'Approved',
        style: {
          ...badgeShell,
          color: '#d1fae5',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          border: '1px solid rgba(52, 211, 153, 0.45)',
        },
      };
    case 'pending':
      return {
        Icon: Clock,
        label: 'Pending review',
        style: {
          ...badgeShell,
          color: '#fef3c7',
          backgroundColor: 'rgba(245, 158, 11, 0.2)',
          border: '1px solid rgba(251, 191, 36, 0.45)',
        },
      };
    case 'rejected':
      return {
        Icon: XCircle,
        label: 'Rejected',
        style: {
          ...badgeShell,
          color: '#fecaca',
          backgroundColor: 'rgba(239, 68, 68, 0.18)',
          border: '1px solid rgba(248, 113, 113, 0.45)',
        },
      };
    case 'archived':
      return {
        Icon: Archive,
        label: 'Archived',
        style: {
          ...badgeShell,
          color: '#e2e8f0',
          backgroundColor: 'rgba(30, 41, 59, 0.85)',
          border: '1px solid rgba(148, 163, 184, 0.35)',
        },
      };
  }
}

function SpaceStatusBadges({ status, isActive }: { status: ProviderSpaceStatus; isActive: boolean }) {
  const meta = statusPresentation(status);
  const StatusIcon = meta.Icon;
  const visibilityStyle: CSSProperties = isActive
    ? {
        ...badgeShell,
        color: '#e0f2fe',
        backgroundColor: 'rgba(14, 165, 233, 0.18)',
        border: '1px solid rgba(56, 189, 248, 0.4)',
      }
    : {
        ...badgeShell,
        color: 'rgba(255, 255, 255, 0.75)',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
      };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '0.5rem',
      }}
    >
      <span style={meta.style}>
        <StatusIcon width={14} height={14} strokeWidth={2} aria-hidden />
        {meta.label}
      </span>
      <span style={visibilityStyle}>
        {isActive ? (
          <Eye width={14} height={14} strokeWidth={2} aria-hidden />
        ) : (
          <EyeOff width={14} height={14} strokeWidth={2} aria-hidden />
        )}
        {isActive ? 'Visible to renters' : 'Hidden from renters'}
      </span>
    </div>
  );
}

function formatCurrency(value: number | undefined, currency: string) {
  if (typeof value !== 'number') {
    return '—';
  }

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

function ProviderSpaceDetailContent({ spaceId }: { spaceId: string }) {
  const router = useRouter();
  const { data: space, isLoading, isError } = useProviderSpace(spaceId);
  const [currentImage, setCurrentImage] = useState(0);

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

  if (isError || !space) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-white/80">
        Unable to load this space.
        <Button variant="secondary" onClick={() => router.push('/provider/spaces')}>
          Back to spaces
        </Button>
      </div>
    );
  }

  const images = space.images ?? [];
  const imageCount = images.length;
  const safeCurrentIndex = imageCount === 0 ? 0 : Math.min(currentImage, imageCount - 1);
  const hasMultipleImages = imageCount > 1;
  const currentImageSrc = imageCount > 0 ? images[safeCurrentIndex] : '';

  const handlePreviousImage = () => {
    if (!hasMultipleImages) return;
    setCurrentImage((prev) => (prev - 1 + imageCount) % imageCount);
  };

  const handleNextImage = () => {
    if (!hasMultipleImages) return;
    setCurrentImage((prev) => (prev + 1) % imageCount);
  };

  return (
    <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/provider/spaces"
            className="inline-flex items-center text-blue-300 hover:text-blue-200 mb-2 transition-colors"
          >
            ← Back to My Spaces
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">{space.title}</h1>
          <p className="text-white/70">
            {[space.address, space.city, space.state].filter(Boolean).join(', ') || 'Location not provided'}
          </p>
        </div>
        <div
          className="flex flex-col gap-3"
          style={{ width: '100%', alignItems: 'stretch' }}
        >
          <span
            className="uppercase text-xs"
            style={{ letterSpacing: '0.14em', color: 'rgba(255, 255, 255, 0.55)' }}
          >
            Updated {new Date(space.updatedAt).toLocaleString('en-AU')}
          </span>
          <div
            style={{
              borderRadius: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              padding: '0.75rem',
              minWidth: 'min(100%, 280px)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
            }}
          >
            <p
              className="mb-2 uppercase font-semibold text-xs"
              style={{ letterSpacing: '0.08em', color: 'rgba(255, 255, 255, 0.5)' }}
            >
              Listing
            </p>
            <SpaceStatusBadges status={space.status} isActive={space.isActive} />
          </div>
          <Link href={`/provider/spaces/${space.id}/edit`} style={{ alignSelf: 'flex-end' }}>
            <Button variant="secondary" size="sm">
              Edit Space
            </Button>
          </Link>
        </div>
      </div>

      {imageCount > 0 ? (
        <div className="mx-auto w-full max-w-3xl">
          {/*
            Height via padding-bottom (16:9): `aspect-video` is not in globals.css, so a plain
            relative + aspect class gave 0 height and hid the image.
          */}
          <div
            className="relative w-full overflow-hidden rounded-xl border border-white/20"
            style={{
              paddingBottom: '56.25%',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35)',
            }}
          >
            <Image
              key={currentImageSrc}
              src={currentImageSrc}
              alt={`${space.title} photo ${safeCurrentIndex + 1}`}
              fill
              className="object-cover"
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 768px) 95vw, (max-width: 1280px) 70vw, 720px"
              priority={safeCurrentIndex === 0}
              unoptimized
            />

            {hasMultipleImages ? (
              <>
                <button
                  type="button"
                  onClick={handlePreviousImage}
                  aria-label="Previous photo"
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '2.75rem',
                    height: '2.75rem',
                    borderRadius: '9999px',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <ChevronLeft width={22} height={22} strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  aria-label="Next photo"
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '2.75rem',
                    height: '2.75rem',
                    borderRadius: '9999px',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <ChevronRight width={22} height={22} strokeWidth={2} aria-hidden />
                </button>
                <div
                  className="text-xs font-medium text-white"
                  style={{
                    pointerEvents: 'none',
                    position: 'absolute',
                    bottom: '0.75rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                    borderRadius: '9999px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    padding: '0.25rem 0.75rem',
                  }}
                >
                  {safeCurrentIndex + 1} / {imageCount}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <Card className="p-6 text-white/70 border-white/10 bg-white/5">
          No photos uploaded yet. Add images from the edit screen to help renters choose your space.
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="p-6 xl:col-span-2 space-y-6 border-white/10 bg-white/5">
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Description</h2>
            <p className="text-white/70 leading-relaxed">
              {space.description?.trim() ? space.description : 'No detailed description supplied.'}
            </p>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-white/10 rounded-lg p-4 bg-white/5">
              <p className="uppercase text-xs text-white/50 mb-1">Hourly Rate</p>
              <p className="text-lg font-semibold text-white">
                {formatCurrency(space.hourlyRate, space.currency)}
              </p>
            </div>
            {space.dailyRate !== undefined && space.dailyRate !== null ? (
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
                {typeof space.capacity === 'number' ? `${space.capacity} vehicles` : 'Not specified'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="flex flex-wrap gap-2">
                {space.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="px-6 py-1 rounded-full text-xs uppercase tracking-wide bg-white/10 text-white/80 border border-white/10"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-white/70">No amenities listed.</p>
            )}
          </section>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 border-white/10 bg-white/5 space-y-4">
            <h2 className="text-xl font-semibold text-white">Listing Status</h2>
            <div className="text-sm text-white/80 space-y-2">
              <p>
                <span className="text-white/50 uppercase text-xs block">Current Status</span>
                {space.status}
              </p>
              <p>
                <span className="text-white/50 uppercase text-xs block">Activation</span>
                {space.isActive ? 'Active (visible to renters)' : 'Inactive (hidden from renters)'}
              </p>
              <p>
                <span className="text-white/50 uppercase text-xs block">Created</span>
                {new Date(space.createdAt).toLocaleString('en-AU')}
              </p>
              <p>
                <span className="text-white/50 uppercase text-xs block">Last Updated</span>
                {new Date(space.updatedAt).toLocaleString('en-AU')}
              </p>
            </div>
          </Card>

          {space.verificationNotes ? (
            <Card className="p-6 border-amber-400/30 bg-amber-500/10 space-y-2">
              <h2 className="text-xl font-semibold text-amber-200">Admin Feedback</h2>
              <p className="text-sm text-amber-100">{space.verificationNotes}</p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ProviderSpaceDetailPage() {
  const params = useParams<{ id: string }>();
  const rawId = params?.id;
  const spaceId = Array.isArray(rawId) ? rawId[0] : rawId ?? '';

  return (
    <AuthGuard allowedRoles={['provider']}>
      <ProviderSpaceDetailContent key={spaceId} spaceId={spaceId} />
    </AuthGuard>
  );
}


