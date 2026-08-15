'use client';

import { Building2, CarFront } from 'lucide-react';

const ROLES = {
  consumer: {
    Icon: CarFront,
    /** Subtle cool wash — booking / mobility */
    wash: 'from-sky-400/[0.22] via-blue-500/[0.08] to-slate-950/0',
    icon: 'text-sky-100',
  },
  provider: {
    Icon: Building2,
    /** Subtle warm wash — property / listings */
    wash: 'from-amber-400/[0.2] via-orange-500/[0.08] to-slate-950/0',
    icon: 'text-amber-100',
  },
} as const;

export type PremiumRoleVariant = keyof typeof ROLES;

type PremiumRoleIconProps = {
  variant: PremiumRoleVariant;
  /** Smaller frame for page headers (e.g. provider-only registration). */
  compact?: boolean;
  className?: string;
};

/**
 * Role icons for registration: frosted tile, single accent wash, crisp Lucide glyphs.
 */
export function PremiumRoleIcon({ variant, compact = false, className = '' }: PremiumRoleIconProps) {
  const { Icon, wash, icon } = ROLES[variant];
  const tile = compact ? 'h-16 w-16 rounded-2xl' : 'h-[5.25rem] w-[5.25rem] rounded-[1.15rem]';
  const iconSize = compact ? 'h-8 w-8' : 'h-12 w-12';

  return (
    <div className={`relative mx-auto w-fit ${className}`}>
      <div
        className={`relative flex items-center justify-center overflow-hidden border border-white/[0.14] bg-slate-950/55 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.06] backdrop-blur-md ${tile}`}
      >
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${wash}`}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -top-px left-1/2 h-1/2 w-[70%] -translate-x-1/2 rounded-full bg-white/[0.07] blur-xl"
          aria-hidden
        />
        <Icon className={`relative ${iconSize} ${icon}`} strokeWidth={1.5} aria-hidden />
      </div>
    </div>
  );
}
