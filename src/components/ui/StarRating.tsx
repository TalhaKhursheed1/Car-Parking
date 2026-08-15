'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';

interface StarRatingProps {
  value: number;
  onChange?: (next: number) => void;
  size?: number;
  readOnly?: boolean;
  ariaLabel?: string;
}

/**
 * A 1-5 star rating control. Renders read-only by default; pass an `onChange`
 * to make it interactive (hover preview + keyboard / click).
 */
export default function StarRating({
  value,
  onChange,
  size = 24,
  readOnly = false,
  ariaLabel,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const display = hovered ?? value;
  const isInteractive = Boolean(onChange) && !readOnly;

  return (
    <div
      role={isInteractive ? 'radiogroup' : 'img'}
      aria-label={ariaLabel ?? `${value} out of 5 stars`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.125rem',
      }}
      onMouseLeave={() => setHovered(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= display;
        const button = (
          <Star
            width={size}
            height={size}
            strokeWidth={1.5}
            style={{
              color: filled ? '#facc15' : 'rgba(255, 255, 255, 0.35)',
              fill: filled ? '#facc15' : 'transparent',
              transition: 'color 120ms ease, fill 120ms ease',
            }}
            aria-hidden
          />
        );
        if (!isInteractive) {
          return (
            <span key={star} style={{ display: 'inline-flex' }}>
              {button}
            </span>
          );
        }
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => setHovered(star)}
            onFocus={() => setHovered(star)}
            onBlur={() => setHovered(null)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              lineHeight: 0,
            }}
          >
            {button}
          </button>
        );
      })}
    </div>
  );
}
