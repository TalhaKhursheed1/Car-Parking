'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Car, Sparkles, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

interface SpaceCardProps {
  id: string;
  title: string;
  hourlyRate: number;
  currency: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  amenities?: string[];
  images?: string[];
  image?: string; // Fallback for backward compatibility
  isActive?: boolean;
  providerBadge?: string | null;
  ratingAverage?: number;
  ratingCount?: number;
  isRecommended?: boolean;
  href?: string;
  ctaLabel?: string;
  compact?: boolean;
  photoCount?: number;
}

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

export default function SpaceCard({
  title,
  hourlyRate,
  currency,
  description,
  address,
  city,
  state,
  zipCode,
  amenities = [],
  images = [],
  image,
  isActive = true,
  providerBadge,
  ratingAverage,
  ratingCount,
  isRecommended = false,
  href,
  ctaLabel = 'View details',
  compact = false,
  photoCount,
}: SpaceCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const displayImages = images?.length > 0 ? images : image ? [image] : [];

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % displayImages.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  const street = address?.trim() || '';
  const cityPart = city?.trim() || '';
  const statePart = state?.trim() || '';
  const postcode = zipCode?.trim() || '';

  let localityLine = '';
  if (cityPart || statePart) {
    localityLine = [cityPart, statePart].filter(Boolean).join(', ');
    if (postcode) {
      localityLine = localityLine ? `${localityLine} ${postcode}` : postcode;
    }
  } else if (postcode) {
    localityLine = postcode;
  }

  const hasLocation = Boolean(street || localityLine);
  const locationOneLine = hasLocation
    ? [street, localityLine].filter(Boolean).join(' · ')
    : '';

  const imgSizes = compact
    ? '(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 22vw'
    : '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';

  const pad = compact ? '1rem' : '1.25rem';
  const titleSize = compact ? '1rem' : '1.125rem';
  const priceSize = compact ? '1.25rem' : '1.5rem';

  const cardBody = (
    <div className="glass-card overflow-hidden flex flex-col h-full hover:shadow-[0_8px_32px_rgba(124,58,237,0.15)] transition-all hover:-translate-y-1 hover:border-primary/50 relative group/card">
      {/* Image Container */}
      <div className="relative w-full bg-white/5 border-b border-white/10" style={{ paddingBottom: '56.25%' }}>
        {displayImages.length > 0 ? (
          <>
            <Image
              src={displayImages[currentImageIndex]}
              alt={`${title} - image ${currentImageIndex + 1}`}
              fill
              className="object-cover"
              sizes={imgSizes}
              loading="lazy"
            />
            {/* Carousel Controls */}
            {displayImages.length > 1 && (
              <>
                {/* Dots */}
                <div style={{ position: 'absolute', bottom: '0.5rem', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '0.375rem', zIndex: 20 }}>
                  {displayImages.map((_, i) => (
                    <div 
                      key={i} 
                      className="transition-all"
                      style={{ 
                        height: '0.375rem', 
                        borderRadius: '9999px', 
                        width: i === currentImageIndex ? '1rem' : '0.375rem',
                        backgroundColor: i === currentImageIndex ? 'white' : 'rgba(255,255,255,0.5)'
                      }} 
                    />
                  ))}
                </div>
                {/* Arrows */}
                <button 
                  onClick={prevImage}
                  className="opacity-0 group-hover/card:opacity-100 transition-opacity"
                  style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', padding: '0.375rem', borderRadius: '9999px', zIndex: 20, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
                </button>
                <button 
                  onClick={nextImage}
                  className="opacity-0 group-hover/card:opacity-100 transition-opacity"
                  style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', padding: '0.375rem', borderRadius: '9999px', zIndex: 20, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </>
            )}
          </>
        ) : (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <Car className="text-white/20" style={{ width: compact ? '3rem' : '4rem', height: compact ? '3rem' : '4rem' }} strokeWidth={1.25} />
          </div>
        )}

        {/* Bottom gradient for text readability if needed */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '33%', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', pointerEvents: 'none', zIndex: 5 }} />

        {/* Photo Count */}
        {typeof photoCount === 'number' && photoCount > 0 && (
          <div style={{ position: 'absolute', bottom: '0.5rem', left: '0.5rem', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', zIndex: 10, border: '1px solid rgba(255,255,255,0.1)', fontWeight: 500 }}>
            {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
          </div>
        )}

        {/* Badges */}
        {(isRecommended || providerBadge) && (
          <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.375rem', zIndex: 10 }}>
            {isRecommended && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'var(--primary)', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 0 10px rgba(124,58,237,0.5)' }}>
                <Sparkles className="w-3 h-3" strokeWidth={2.5} />
                Recommended
              </div>
            )}
            {providerBadge && (
              <div style={{ backgroundColor: 'var(--secondary)', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 0 10px rgba(6,182,212,0.5)' }}>
                {providerBadge}
              </div>
            )}
          </div>
        )}

        {/* Status Badge */}
        <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 10, backgroundColor: isActive ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)', padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold', color: 'white', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}>
          {isActive ? 'Available' : 'Inactive'}
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow flex flex-col relative z-10" style={{ padding: pad }}>
        {/* Meta row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Parking space
          </span>
          {typeof ratingAverage === 'number' && ratingCount !== undefined && ratingCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
              <Star className="w-4 h-4 text-secondary fill-secondary drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]" />
              {ratingAverage.toFixed(1)} <span className="text-muted">({ratingCount})</span>
            </span>
          ) : (
            <span className="text-sm text-muted">New</span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-foreground mb-1 line-clamp-2" style={{ fontSize: titleSize }}>
          {title}
        </h3>

        {/* Location */}
        <p className="text-sm text-muted mb-3 line-clamp-1">
          {locationOneLine || 'Location not listed'}
        </p>

        {/* Description (not shown in compact) */}
        {!compact && description?.trim() ? (
          <p className="text-sm text-muted mb-4 line-clamp-2 leading-relaxed flex-grow">
            {description}
          </p>
        ) : (
          <div className="flex-grow" />
        )}

        {/* Footer Area */}
        <div className="mt-auto pt-4 border-t border-white/10 flex items-end justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-0.5">
              From
            </span>
            <p className="font-extrabold text-foreground leading-none" style={{ fontSize: priceSize }}>
              {formatCurrency(hourlyRate, currency)}
              <span className="text-sm font-medium text-muted"> / hr</span>
            </p>
          </div>
          {href ? (
            <span className="text-sm font-bold text-primary hover:text-secondary transition-colors drop-shadow-[0_0_8px_rgba(124,58,237,0.3)]">
              {ctaLabel} &rarr;
            </span>
          ) : (
            <button className="px-4 py-2 text-sm font-medium bg-primary/20 text-primary rounded-full border border-primary/30">
              {ctaLabel}
            </button>
          )}
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {amenities.slice(0, compact ? 3 : 4).map((amenity) => (
              <span key={amenity} className="text-xs font-medium text-foreground bg-white/10 border border-white/10 px-2.5 py-1 rounded-md shadow-sm">
                {amenity}
              </span>
            ))}
            {amenities.length > (compact ? 3 : 4) && (
              <span className="text-xs font-medium text-muted flex items-center ml-1">
                +{amenities.length - (compact ? 3 : 4)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-2xl">
        {cardBody}
      </Link>
    );
  }

  return cardBody;
}
