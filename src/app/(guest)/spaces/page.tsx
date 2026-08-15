'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SpaceCard from '@/components/ui/SpaceCard';
import { usePublicSpaces, useRecommendedPublicSpaces } from '@/features/spaces/hooks';
import { useCurrentUser } from '@/features/auth/hooks';
import { useAuthStore } from '@/stores/authStore';
import { Car, Sparkles, SlidersHorizontal, Search, MapPin, DollarSign, Calendar } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type ActiveFilters = {
  city?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  availabilityType?: '24_7' | 'business_hours' | 'custom';
  day?: string;
  startTime?: string;
  endTime?: string;
};

type FilterFormState = {
  city: string;
  state: string;
  minPrice: string;
  maxPrice: string;
  availabilityType: '' | '24_7' | 'business_hours' | 'custom';
  day: string;
  startTime: string;
  endTime: string;
};

function filtersToFormState(filters: ActiveFilters): FilterFormState {
  return {
    city: filters.city ?? '',
    state: filters.state ?? '',
    minPrice: filters.minPrice?.toString() ?? '',
    maxPrice: filters.maxPrice?.toString() ?? '',
    availabilityType: filters.availabilityType ?? '',
    day: filters.day ?? '',
    startTime: filters.startTime ?? '',
    endTime: filters.endTime ?? '',
  };
}

function parseSearchParams(params: URLSearchParams): ActiveFilters {
  const city = params.get('city')?.trim() || undefined;
  const state = params.get('state')?.trim() || undefined;
  const availabilityTypeParam = params.get('availabilityType');
  const availabilityType =
    availabilityTypeParam === '24_7' || availabilityTypeParam === 'business_hours' || availabilityTypeParam === 'custom'
      ? availabilityTypeParam
      : undefined;

  const parseNumber = (value: string | null) => {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const minPrice = parseNumber(params.get('minPrice'));
  const maxPrice = parseNumber(params.get('maxPrice'));

  const day = params.get('day')?.trim() || undefined;
  const startTime = params.get('startTime') || undefined;
  const endTime = params.get('endTime') || undefined;

  return {
    city,
    state,
    minPrice,
    maxPrice,
    availabilityType,
    day,
    startTime,
    endTime,
  };
}

function PublicSpacesPageFallback() {
  return (
    <div className="min-h-screen py-12 lg:py-16 px-4 sm:px-6 lg:px-8 w-full relative">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 sm:mb-14">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground mb-3 tracking-tight">Browse Parking Spaces</h1>
          <p className="text-muted text-base sm:text-lg max-w-3xl">Loading search and listings…</p>
        </header>
        <div
          className="scrollbar-hide flex gap-6 overflow-x-auto pb-4 w-full"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="glass-card overflow-hidden"
              style={{ width: 'min(320px, 82vw)', flexShrink: 0 }}
            >
              <div className="w-full relative bg-white/5 animate-pulse" style={{ paddingBottom: '56.25%' }} />
              <div className="p-5 space-y-3">
                <div className="animate-pulse bg-white/10 rounded" style={{ width: '33%', height: '1rem' }} />
                <div className="h-5 w-full animate-pulse bg-white/10 rounded" />
                <div className="animate-pulse bg-white/10 rounded" style={{ width: '66%', height: '1rem' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PublicSpacesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeFilters = useMemo(() => parseSearchParams(searchParams), [searchParams]);
  const { data, isLoading, isError } = usePublicSpaces({
    city: activeFilters.city,
    state: activeFilters.state,
    minPrice: activeFilters.minPrice,
    maxPrice: activeFilters.maxPrice,
    availabilityType: activeFilters.availabilityType,
    day: activeFilters.day,
    startTime: activeFilters.startTime,
    endTime: activeFilters.endTime,
  });
  const spaces = data ?? [];
  useCurrentUser();
  const { isAuthenticated } = useAuthStore();

  const hasActiveFilters = Object.values(activeFilters).some(
    (value) => value !== undefined && value !== '',
  );
  const { data: recommendedData } = useRecommendedPublicSpaces(8);
  const recommendedSpaces = (recommendedData ?? []).filter(
    (s) => !spaces.some((existing) => existing.id === s.id),
  );
  const showRecommendedSection =
    !hasActiveFilters && !isLoading && recommendedSpaces.length > 0;

  const [formState, setFormState] = useState<FilterFormState>(() => filtersToFormState(activeFilters));
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(hasActiveFilters);

  const handleFilterSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();

    if (formState.city.trim()) params.set('city', formState.city.trim());
    if (formState.state.trim()) params.set('state', formState.state.trim());
    if (formState.minPrice.trim()) params.set('minPrice', formState.minPrice.trim());
    if (formState.maxPrice.trim()) params.set('maxPrice', formState.maxPrice.trim());
    if (formState.availabilityType) params.set('availabilityType', formState.availabilityType);

    if (formState.availabilityType === 'custom' && formState.day && formState.startTime && formState.endTime) {
      params.set('day', formState.day);
      params.set('startTime', formState.startTime);
      params.set('endTime', formState.endTime);
    }

    const query = params.toString();
    router.push(`/spaces${query ? `?${query}` : ''}`);
  };

  const handleClearFilters = () => {
    setFormState(filtersToFormState({}));
    router.push('/spaces');
    setShowAdvancedFilters(false);
  };

  return (
    <div className="min-h-screen py-12 lg:py-16 px-4 sm:px-6 lg:px-8 w-full relative">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground mb-3 tracking-tight">Browse Parking Spaces</h1>
          <p className="text-muted text-base sm:text-lg max-w-3xl leading-relaxed">
            Discover verified spaces available for instant booking. Every listing is approved by our admin team and actively managed by providers.
          </p>
        </header>

        {showRecommendedSection ? (
          <section className="mb-12 relative">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                  <Sparkles className="h-5 w-5" strokeWidth={2} aria-hidden />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">Recommended for you</h2>
              </div>
              <p className="text-xs sm:text-sm text-muted font-medium">
                Curated by our team based on consumer ratings
              </p>
            </div>
            <div
              className="scrollbar-hide flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 relative z-10"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {recommendedSpaces.map((space) => (
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
                    image={space.images?.[0]}
                    providerBadge={space.providerBadge}
                    ratingAverage={space.ratingAverage}
                    ratingCount={space.ratingCount}
                    isRecommended
                    isActive
                    href={`/spaces/${space.id}`}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mb-10">
          <Card>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4" style={{ gap: '1rem' }}>
              <form onSubmit={handleFilterSubmit} className="flex flex-col sm:flex-row flex-1" style={{ gap: '0.75rem' }}>
                <div className="relative flex-1">
                  <Search
                    className="text-muted"
                    style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1.25rem', height: '1.25rem', pointerEvents: 'none' }}
                  />
                  <input
                    type="text"
                    value={formState.city}
                    onChange={(e) => setFormState((prev) => ({ ...prev, city: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 text-foreground rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                    style={{ padding: '0.625rem 1rem 0.625rem 2.5rem' }}
                    placeholder="Search by city..."
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Button type="submit" className="px-6 py-2.5 rounded-xl btn-primary">Search</Button>
                  <Button type="button" variant="outline" className="px-4 py-2.5 bg-transparent rounded-xl" onClick={() => setShowAdvancedFilters((prev) => !prev)}>
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    {showAdvancedFilters ? 'Hide Filters' : 'Filters'}
                  </Button>
                  {hasActiveFilters && (
                    <Button type="button" variant="outline" className="px-4 py-2.5 bg-transparent rounded-xl" onClick={handleClearFilters}>
                      Clear
                    </Button>
                  )}
                </div>
              </form>
              {hasActiveFilters && (
                <p className="text-sm font-medium text-muted">
                  Showing filtered results{spaces.length > 0 ? ` (${spaces.length})` : ''}
                </p>
              )}
            </div>

            {showAdvancedFilters && (
              <form onSubmit={handleFilterSubmit} className="space-y-6 pt-6 border-t border-white/10 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="flex items-center text-sm font-medium text-muted mb-2">
                      <DollarSign className="h-4 w-4 mr-1 text-primary" /> Min price / hr
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formState.minPrice}
                      onChange={(e) => setFormState((prev) => ({ ...prev, minPrice: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 text-foreground rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                      style={{ padding: '0.625rem 1rem' }}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-sm font-medium text-muted mb-2">
                      <DollarSign className="h-4 w-4 mr-1 text-primary" /> Max price / hr
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formState.maxPrice}
                      onChange={(e) => setFormState((prev) => ({ ...prev, maxPrice: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 text-foreground rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                      style={{ padding: '0.625rem 1rem' }}
                      placeholder="50"
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-sm font-medium text-muted mb-2">
                      <MapPin className="h-4 w-4 mr-1 text-primary" /> State
                    </label>
                    <input
                      type="text"
                      value={formState.state}
                      onChange={(e) => setFormState((prev) => ({ ...prev, state: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 text-foreground rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                      style={{ padding: '0.625rem 1rem' }}
                      placeholder="e.g., NSW"
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-sm font-medium text-muted mb-2">
                      <Calendar className="h-4 w-4 mr-1 text-primary" /> Availability
                    </label>
                    <select
                      value={formState.availabilityType}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, availabilityType: e.target.value as FilterFormState['availabilityType'] }))
                      }
                      className="w-full bg-white/5 border border-white/10 text-foreground rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all [&>option]:bg-slate-900"
                      style={{ padding: '0.625rem 1rem' }}
                    >
                      <option value="">Any</option>
                      <option value="24_7">24 / 7 Access</option>
                      <option value="business_hours">Business Hours</option>
                      <option value="custom">Custom Schedule</option>
                    </select>
                  </div>
                </div>

                {formState.availabilityType === 'custom' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 bg-primary/10 rounded-xl border border-primary/20">
                    <div>
                      <label className="block text-sm font-medium text-muted mb-2">Day</label>
                      <select
                        value={formState.day}
                        onChange={(e) => setFormState((prev) => ({ ...prev, day: e.target.value }))}
                        className="w-full text-foreground [&>option]:bg-slate-900"
                      >
                        <option value="">Any</option>
                        {DAYS.map((day) => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted mb-2">From</label>
                      <input
                        type="time"
                        value={formState.startTime}
                        onChange={(e) => setFormState((prev) => ({ ...prev, startTime: e.target.value }))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted mb-2">To</label>
                      <input
                        type="time"
                        value={formState.endTime}
                        onChange={(e) => setFormState((prev) => ({ ...prev, endTime: e.target.value }))}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                <div className="flex" style={{ gap: '0.75rem', marginTop: '1.5rem', paddingTop: '0.5rem' }}>
                  <Button type="submit" className="px-6 py-2.5 btn-primary rounded-xl">
                    Apply filters
                  </Button>
                  {hasActiveFilters && (
                    <Button type="button" variant="outline" className="px-6 py-2.5 bg-transparent rounded-xl border-white/10 text-foreground" onClick={handleClearFilters}>
                      Reset
                    </Button>
                  )}
                </div>
              </form>
            )}
          </Card>
        </section>

        {isLoading ? (
          <div
            className="scrollbar-hide flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="glass-card overflow-hidden"
                style={{ width: 'min(320px, 82vw)', flexShrink: 0 }}
              >
                <div className="w-full relative bg-white/5 animate-pulse" style={{ paddingBottom: '56.25%' }} />
                <div className="p-5 space-y-3">
                  <div className="animate-pulse bg-white/10 rounded" style={{ width: '33%', height: '1rem' }} />
                  <div className="h-5 w-full animate-pulse bg-white/10 rounded" />
                  <div className="animate-pulse bg-white/10 rounded" style={{ width: '66%', height: '1rem' }} />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="glass-card text-red-400 p-8 text-center border-red-500/20 bg-red-500/10 font-medium">
            Unable to load spaces right now. Please try again later.
          </div>
        ) : spaces.length > 0 ? (
          <div
            className="scrollbar-hide flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 relative z-10"
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
          <div className="glass-card p-12 text-center shadow-lg">
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-muted border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                <Car className="h-10 w-10" strokeWidth={1.5} aria-hidden />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3 tracking-tight">No spaces match those filters</h2>
            <p className="text-muted mb-8 max-w-lg mx-auto">
              Try adjusting your search criteria to discover more available parking spaces.
              {!isAuthenticated && ' Create an account to get notified when new listings appear.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
              <Button variant="outline" className="px-6 py-2.5" onClick={handleClearFilters}>
                Clear filters
              </Button>
              {!isAuthenticated && (
                <Link href="/register">
                  <Button className="px-6 py-2.5">Create a free account</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PublicSpacesPage() {
  return (
    <Suspense fallback={<PublicSpacesPageFallback />}>
      <PublicSpacesPageContent />
    </Suspense>
  );
}
