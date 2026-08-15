'use client';

import { Heart } from 'lucide-react';

import { useSpaceLike, useToggleSpaceLike } from '@/features/spaceLikes/hooks';

interface Props {
  spaceId: string;
  /** When false, the heart is shown but the click handler prompts a sign-in instead of toggling. */
  canInteract: boolean;
  /** Optional fallback like count for guests / before the query resolves. */
  fallbackCount?: number;
  onUnauthorized?: () => void;
}

/**
 * Heart button shown on the space detail page. Only consumers with a confirmed
 * booking can like a space (API enforces this); other users see the count and
 * receive a friendly nudge.
 */
export default function SpaceLikeButton({
  spaceId,
  canInteract,
  fallbackCount,
  onUnauthorized,
}: Props) {
  const { data, isLoading } = useSpaceLike(spaceId, canInteract);
  const toggle = useToggleSpaceLike();

  const liked = data?.liked ?? false;
  const likeCount = data?.likeCount ?? fallbackCount ?? 0;

  const handleClick = () => {
    if (!canInteract) {
      onUnauthorized?.();
      return;
    }
    if (isLoading || toggle.isPending) return;
    toggle.mutate(
      { spaceId, liked: !liked },
      {
        onError: (e) => window.alert(e.message),
      },
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike this space' : 'Like this space'}
      disabled={canInteract && (isLoading || toggle.isPending)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.875rem',
        borderRadius: '9999px',
        border: liked
          ? '1px solid rgba(244, 63, 94, 0.65)'
          : '1px solid rgba(255, 255, 255, 0.2)',
        backgroundColor: liked ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
        color: 'white',
        fontSize: '0.875rem',
        fontWeight: 600,
        cursor:
          canInteract && (isLoading || toggle.isPending) ? 'not-allowed' : 'pointer',
        transition: 'background-color 150ms ease, border-color 150ms ease',
      }}
    >
      <Heart
        width={16}
        height={16}
        strokeWidth={2}
        style={{
          color: liked ? '#f43f5e' : 'rgba(255, 255, 255, 0.85)',
          fill: liked ? '#f43f5e' : 'transparent',
        }}
        aria-hidden
      />
      <span>{likeCount}</span>
    </button>
  );
}
