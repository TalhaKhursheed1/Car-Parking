'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronRight,
  LogOut,
  Mail,
  Shield,
  Sparkles,
  UserRound,
} from 'lucide-react';

import type { AuthUser } from '@/features/auth/api';

type Props = {
  user: AuthUser;
  profileHref: string;
  profileLabel: string;
  onLogout: () => void;
  isLoggingOut: boolean;
};

function initials(fullName: string | undefined | null): string {
  if (!fullName) return '·';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  const first = parts[0]![0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]![0] ?? '' : '';
  return (first + last).toUpperCase() || '·';
}

function roleLabel(role: AuthUser['role']): string {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'provider':
      return 'Provider';
    default:
      return 'Consumer';
  }
}

type Accent = {
  gradient: string;
  ring: string;
  glow: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
};

function roleAccent(role: AuthUser['role']): Accent {
  switch (role) {
    case 'admin':
      return {
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
        ring: '0 0 0 1px rgba(139,92,246,0.45), 0 8px 28px -10px rgba(139,92,246,0.55)',
        glow: 'radial-gradient(120% 70% at 50% 0%, rgba(139,92,246,0.22), transparent 60%)',
        badgeBg: 'rgba(139,92,246,0.22)',
        badgeText: '#ddd6fe',
        badgeBorder: 'rgba(139,92,246,0.5)',
      };
    case 'provider':
      return {
        gradient: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)',
        ring: '0 0 0 1px rgba(16,185,129,0.45), 0 8px 28px -10px rgba(16,185,129,0.5)',
        glow: 'radial-gradient(120% 70% at 50% 0%, rgba(16,185,129,0.22), transparent 60%)',
        badgeBg: 'rgba(16,185,129,0.22)',
        badgeText: '#a7f3d0',
        badgeBorder: 'rgba(16,185,129,0.45)',
      };
    default:
      return {
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
        ring: '0 0 0 1px rgba(59,130,246,0.45), 0 8px 28px -10px rgba(59,130,246,0.5)',
        glow: 'radial-gradient(120% 70% at 50% 0%, rgba(59,130,246,0.22), transparent 60%)',
        badgeBg: 'rgba(59,130,246,0.22)',
        badgeText: '#bfdbfe',
        badgeBorder: 'rgba(59,130,246,0.45)',
      };
  }
}

function formatJoined(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-AU', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function NavUserMenu({
  user,
  profileHref,
  profileLabel,
  onLogout,
  isLoggingOut,
}: Props) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const accent = roleAccent(user.role);

  const scheduleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpen(false), 140);
  };

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(() => () => cancelClose(), []);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative' }}
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => {
        cancelClose();
        setOpen(true);
      }}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (!containerRef.current?.contains(next)) {
          scheduleClose();
        }
      }}
    >
      {/* Compact avatar-only navbar button */}
      <Link
        href={profileHref}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Open ${profileLabel.toLowerCase()} menu for ${user.fullName}`}
        onClick={() => setOpen(false)}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '2.5rem',
          width: '2.5rem',
          borderRadius: '9999px',
          color: '#ffffff',
          fontSize: '0.875rem',
          fontWeight: 700,
          background: accent.gradient,
          boxShadow: accent.ring,
          transition: 'transform 200ms ease',
          outline: 'none',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <span
          aria-hidden
          style={{
            letterSpacing: '0.025em',
            textShadow: '0 1px 1px rgba(0,0,0,0.35)',
          }}
        >
          {initials(user.fullName)}
        </span>
        {/* Inner highlight */}
        <span
          aria-hidden
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            borderRadius: '9999px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 55%)',
          }}
        />
        {/* Online dot */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            height: '0.75rem',
            width: '0.75rem',
            borderRadius: '9999px',
            border: '2px solid #0b1220',
            background: '#22c55e',
          }}
        />
      </Link>

      {open ? (
        <div
          role="menu"
          aria-label="Account menu"
          style={{
            position: 'absolute',
            right: 0,
            marginTop: '0.75rem',
            width: '22rem',
            maxWidth: 'calc(100vw - 1.5rem)',
            zIndex: 50,
          }}
        >
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '1.5rem',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 30px 80px -20px rgba(0,0,0,0.85)',
              overflow: 'hidden',
              maxHeight: 'calc(100vh - 5rem)',
              background:
                'linear-gradient(160deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 50%, rgba(2,6,23,0.98) 100%)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            {/* Top accent stripe */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                height: '4px',
                background: accent.gradient,
              }}
            />
            {/* Role-tinted glow */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                height: '11rem',
                pointerEvents: 'none',
                background: accent.glow,
              }}
            />

            {/* Scrollable content */}
            <div style={{ overflowY: 'auto' }}>
              {/* Header */}
              <div
                style={{
                  position: 'relative',
                  padding: '1.75rem 1.5rem 1.25rem',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <div
                  aria-hidden
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '4.5rem',
                    width: '4.5rem',
                    borderRadius: '1.25rem',
                    color: '#ffffff',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    background: accent.gradient,
                    boxShadow:
                      '0 12px 32px -10px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.18)',
                    marginBottom: '0.875rem',
                    letterSpacing: '0.02em',
                  }}
                >
                  {initials(user.fullName)}
                </div>
                <p
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.2,
                  }}
                >
                  {user.fullName || profileLabel}
                </p>
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: 'rgba(255,255,255,0.85)',
                    marginTop: '0.25rem',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.email}
                </p>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    marginTop: '0.75rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    border: `1px solid ${accent.badgeBorder}`,
                    background: accent.badgeBg,
                    color: accent.badgeText,
                  }}
                >
                  <Sparkles style={{ height: '0.75rem', width: '0.75rem' }} aria-hidden />
                  {roleLabel(user.role)}
                </span>
              </div>

              {/* Meta rows */}
              <ul
                style={{
                  position: 'relative',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  listStyle: 'none',
                  margin: 0,
                }}
              >
                <MetaRow
                  accentGradient={accent.gradient}
                  icon={<Mail style={{ height: '1rem', width: '1rem' }} aria-hidden />}
                  label="Email address"
                  value={user.email}
                />
                <MetaRow
                  accentGradient={accent.gradient}
                  icon={<Shield style={{ height: '1rem', width: '1rem' }} aria-hidden />}
                  label="Account role"
                  value={roleLabel(user.role)}
                />
                <MetaRow
                  accentGradient={accent.gradient}
                  icon={<CalendarDays style={{ height: '1rem', width: '1rem' }} aria-hidden />}
                  label="Member since"
                  value={formatJoined(user.createdAt)}
                />
              </ul>
            </div>

            {/* Pinned action bar */}
            <div
              style={{
                position: 'relative',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                padding: '0.5rem',
                background: 'rgba(0,0,0,0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <Link
                href={profileHref}
                onClick={() => setOpen(false)}
                role="menuitem"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 0.875rem',
                  borderRadius: '0.875rem',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  background: 'transparent',
                  transition: 'background-color 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '2rem',
                    width: '2rem',
                    borderRadius: '0.625rem',
                    color: '#ffffff',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  <UserRound style={{ height: '1rem', width: '1rem' }} aria-hidden />
                </span>
                <span style={{ flex: 1 }}>Open {profileLabel.toLowerCase()}</span>
                <ChevronRight
                  style={{ height: '1rem', width: '1rem', color: 'rgba(255,255,255,0.7)' }}
                  aria-hidden
                />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                disabled={isLoggingOut}
                role="menuitem"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 0.875rem',
                  borderRadius: '0.875rem',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  background: 'transparent',
                  border: 'none',
                  cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                  opacity: isLoggingOut ? 0.6 : 1,
                  width: '100%',
                  textAlign: 'left',
                  transition: 'background-color 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(244, 63, 94, 0.18)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '2rem',
                    width: '2rem',
                    borderRadius: '0.625rem',
                    color: '#fecdd3',
                    background: 'rgba(244, 63, 94, 0.16)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                  }}
                >
                  <LogOut style={{ height: '1rem', width: '1rem' }} aria-hidden />
                </span>
                <span style={{ flex: 1 }}>
                  {isLoggingOut ? 'Logging out…' : 'Log out'}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetaRow({
  icon,
  label,
  value,
  accentGradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accentGradient: string;
}) {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.625rem 0.75rem',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255,255,255,0.1)',
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '2.25rem',
          width: '2.25rem',
          borderRadius: '0.75rem',
          color: '#ffffff',
          flexShrink: 0,
          background: accentGradient,
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 12px -4px rgba(0,0,0,0.4)',
        }}
      >
        {icon}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          style={{
            fontSize: '0.625rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 600,
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: '0.875rem',
            color: '#ffffff',
            fontWeight: 500,
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </p>
      </div>
    </li>
  );
}
