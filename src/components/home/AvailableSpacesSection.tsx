'use client';

import Link from 'next/link';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import SpaceCard from '@/components/ui/SpaceCard';
import { usePublicSpaces } from '@/features/spaces/hooks';
import { Car } from 'lucide-react';

export default function AvailableSpacesSection() {
  const { data, isLoading, isError } = usePublicSpaces();
  const spaces = data ?? [];
  const availableCount = spaces.length;

  return (
    <section
      className="py-16 sm:py-20 lg:py-24 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full"
      style={{
        background:
          'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 50%, rgba(0, 0, 0, 0.03) 100%)',
      }}
    >
      <div className="w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
              Available Spaces
            </h2>
            <p className="text-base sm:text-lg text-white/70">
              {isLoading
                ? 'Loading spaces...'
                : isError
                ? 'Unable to load spaces right now.'
                : availableCount === 0
                ? 'New spaces coming soon'
                : `${availableCount} spaces available now`}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div
            className="scrollbar-hide flex gap-4 overflow-x-auto pb-4"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {Array.from({ length: 5 }).map((_, index) => (
              <Card
                key={index}
                className="p-0 border-white/10 bg-white/5 overflow-hidden rounded-xl"
                style={{ width: 'min(320px, 82vw)', flexShrink: 0 }}
              >
                <div
                  className="w-full relative bg-white/10 animate-pulse"
                  style={{ paddingBottom: '56.25%' }}
                />
                <div className="p-4 space-y-2">
                  <div className="animate-pulse bg-white/10 rounded" style={{ width: '33%', height: '0.75rem' }} />
                  <div className="h-4 w-full animate-pulse bg-white/10 rounded" />
                  <div className="animate-pulse bg-white/10 rounded" style={{ width: '66%', height: '0.75rem' }} />
                </div>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <Card className="p-6 text-center text-red-200 border-red-500/30 bg-red-500/10">
            Unable to load spaces. Please try again later.
          </Card>
        ) : spaces.length > 0 ? (
          <div
            className="scrollbar-hide flex gap-4 overflow-x-auto pb-4"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {spaces.map((space) => (
              <div key={space.id} style={{ width: 'min(320px, 82vw)', flexShrink: 0 }}>
                <SpaceCard
                  compact
                  photoCount={space.images?.length ?? 0}
                  id={space.id}
                  title={space.title}
                  hourlyRate={space.hourlyRate}
                  currency={space.currency}
                  description={space.description}
                  address={space.address}
                  city={space.city}
                  state={space.state}
                  zipCode={space.zipCode}
                  amenities={space.amenities}
                  images={space.images}
                  image={space.images?.[0]}
                  providerBadge={space.providerBadge}
                  ratingAverage={space.ratingAverage}
                  ratingCount={space.ratingCount}
                  isRecommended={space.isRecommended}
                  isActive
                  href={`/spaces/${space.id}`}
                />
              </div>
            ))}
          </div>
        ) : (
          <Card className="p-10 text-center">
            <div className="mb-4 flex justify-center">
              <Car className="h-14 w-14 text-white/80" strokeWidth={1.25} aria-hidden />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No spaces available yet</h3>
            <p className="text-white/70 mb-6">
              Check back soon—new parking spaces are added regularly.
            </p>
          </Card>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/spaces"
            className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4 rounded-xl shadow-[0_0_20px_rgba(124,58,237,0.3)]"
          >
            Browse All Spaces
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
