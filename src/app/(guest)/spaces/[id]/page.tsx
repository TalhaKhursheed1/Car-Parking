'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SpaceBookingCard from '@/components/booking/SpaceBookingCard';
import SpaceLikeButton from '@/components/space/SpaceLikeButton';
import SpaceReviewForm from '@/components/space/SpaceReviewForm';
import SpaceReviewsSection from '@/components/space/SpaceReviewsSection';
import { usePublicSpace } from '@/features/spaces/hooks';
import { useCurrentUser } from '@/features/auth/hooks';
import { useAuthStore } from '@/stores/authStore';

function formatCurrency(value: number | null | undefined, currency: string) {
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

function PublicSpaceDetailContent({ spaceId }: { spaceId: string }) {
  const router = useRouter();
  const { data: space, isLoading, isError } = usePublicSpace(spaceId);
  const [currentImage, setCurrentImage] = useState(0);
  useCurrentUser();
  const { isAuthenticated, user } = useAuthStore();
  const isConsumer = isAuthenticated && user?.role === 'consumer';

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
        <Button variant="secondary" onClick={() => router.push('/spaces')}>
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
    <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/spaces"
            className="inline-flex items-center text-blue-300 hover:text-blue-200 mb-2 transition-colors"
          >
            ← Back to spaces
          </Link>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-3xl sm:text-4xl font-bold text-white">{space.title}</h1>
            {space.isRecommended ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  backgroundColor: 'rgba(234, 179, 8, 0.95)',
                  color: '#1f2937',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.65rem',
                  borderRadius: '9999px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  boxShadow: '0 4px 12px rgba(202, 138, 4, 0.35)',
                }}
              >
                <Sparkles width={12} height={12} strokeWidth={2.5} aria-hidden />
                Admin recommended
              </span>
            ) : null}
          </div>
          <p className="text-white/70">
            {[space.address, space.city, space.state].filter(Boolean).join(', ') || 'Location not provided'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <SpaceLikeButton
              spaceId={spaceId}
              canInteract={isConsumer}
              fallbackCount={space.likeCount}
              onUnauthorized={() => {
                if (!isAuthenticated) {
                  router.push('/login');
                } else {
                  window.alert('Only consumers can like spaces.');
                }
              }}
            />
            {space.ratingCount > 0 ? (
              <span className="text-sm text-white/70">
                ★ {space.ratingAverage.toFixed(1)} ({space.ratingCount} review
                {space.ratingCount === 1 ? '' : 's'})
              </span>
            ) : (
              <span className="text-sm text-white/50">No reviews yet</span>
            )}
          </div>
        </div>
        <div
          className="flex flex-col gap-3"
          style={{ width: '100%', alignItems: 'stretch' }}
        >
          <span
            className="uppercase text-xs"
            style={{ letterSpacing: '0.14em', color: 'rgba(255, 255, 255, 0.55)', alignSelf: 'flex-end' }}
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
              alignSelf: 'flex-end',
            }}
          >
            <p
              className="mb-2 uppercase font-semibold text-xs"
              style={{ letterSpacing: '0.08em', color: 'rgba(255, 255, 255, 0.5)' }}
            >
              Listing
            </p>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderRadius: '9999px',
                padding: '0.375rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#d1fae5',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(52, 211, 153, 0.45)',
              }}
            >
              <CheckCircle2 width={14} height={14} strokeWidth={2} aria-hidden />
              Verified listing
            </span>
          </div>
        </div>
      </div>

      {imageCount > 0 ? (
        <div className="mx-auto w-full max-w-3xl">
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
          This provider hasn’t uploaded photos yet. Check back soon!
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="p-6 xl:col-span-2 border-white/10 bg-white/5" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">About this space</h2>
            <p className="text-white/70 leading-relaxed">
              {space.description?.trim() ? space.description : 'The provider has not added a detailed description yet.'}
            </p>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-white/10 rounded-lg p-4 bg-white/5">
              <p className="uppercase text-xs text-white/50 mb-1">Hourly Rate</p>
              <p className="text-lg font-semibold text-white">{formatCurrency(space.hourlyRate, space.currency)}</p>
            </div>
            {space.dailyRate !== null && space.dailyRate !== undefined ? (
              <div className="border border-white/10 rounded-lg p-4 bg-white/5">
                <p className="uppercase text-xs text-white/50 mb-1">Daily Rate</p>
                <p className="text-lg font-semibold text-white">{formatCurrency(space.dailyRate, space.currency)}</p>
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
              <h3 className="text-lg font-semibold text-white mb-3">Custom availability</h3>
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
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {isAuthenticated && user?.role === 'consumer' ? (
            <SpaceBookingCard space={space} />
          ) : null}

          {isAuthenticated && user?.role && user.role !== 'consumer' ? (
            <Card className="p-6 border-white/10 bg-white/5" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h2 className="text-xl font-semibold text-white">Consumer booking</h2>
              <p className="text-sm text-white/70">
                Bookings can only be created with a consumer account. Sign in as a consumer to reserve this space.
              </p>
            </Card>
          ) : null}

          {!isAuthenticated ? (
            <Card className="p-6 border-white/10 bg-white/5" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 className="text-xl font-semibold text-white">Ready to reserve?</h2>
              <p className="text-sm text-white/70">
                Sign in with a consumer account to choose a date and time. New here? Register as a consumer to book.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/register" className="flex-1">
                  <Button fullWidth>Register</Button>
                </Link>
                <Link href="/login" className="flex-1">
                  <Button variant="outline" fullWidth>
                    Sign In
                  </Button>
                </Link>
              </div>
            </Card>
          ) : null}

          <Card className="p-6 border-white/10 bg-white/5 text-sm text-white/70" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div>
              <span className="text-white/50 uppercase text-xs block">Added</span>
              {new Date(space.createdAt).toLocaleString('en-AU')}
            </div>
            <div>
              <span className="text-white/50 uppercase text-xs block">Last Updated</span>
              {new Date(space.updatedAt).toLocaleString('en-AU')}
            </div>
          </Card>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <SpaceReviewForm
          spaceId={spaceId}
          spaceTitle={space.title}
          enabled={isConsumer}
        />
        <SpaceReviewsSection
          spaceId={spaceId}
          ratingAverage={space.ratingAverage}
          ratingCount={space.ratingCount}
        />
      </div>
    </div>
  );
}

export default function PublicSpaceDetailPage() {
  const params = useParams<{ id: string }>();
  const rawId = params?.id;
  const spaceId = Array.isArray(rawId) ? rawId[0] : rawId ?? '';

  return <PublicSpaceDetailContent key={spaceId} spaceId={spaceId} />;
}


