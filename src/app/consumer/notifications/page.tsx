'use client';

import Link from 'next/link';

import { AuthGuard } from '@/components/AuthGuard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  useConsumerNotifications,
  useMarkAllConsumerNotificationsRead,
  useMarkConsumerNotificationRead,
} from '@/features/notifications/hooks';

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ConsumerNotificationsPage() {
  const { data, isLoading, isError } = useConsumerNotifications(true, 100);
  const markOne = useMarkConsumerNotificationRead();
  const markAll = useMarkAllConsumerNotificationsRead();

  return (
    <AuthGuard allowedRoles={['consumer']}>
      <div className="min-h-screen py-8 sm:py-12 px-6 sm:px-8 lg:px-12 max-w-3xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <Link href="/consumer/bookings" className="text-sm text-white hover:underline">
              ← My bookings
            </Link>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-white">Notifications</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            {markAll.isPending ? 'Marking…' : 'Mark all read'}
          </Button>
        </div>

        {isLoading ? <p className="text-white">Loading notifications…</p> : null}
        {isError ? <p className="text-white">Could not load notifications.</p> : null}

        {!isLoading && !isError && (!data || data.length === 0) ? (
          <Card className="p-8 text-center border-white/10 bg-white/5 text-white">
            You have no notifications yet.
          </Card>
        ) : null}

        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(data ?? []).map((n) => {
            const href = n.bookingId
              ? `/consumer/bookings?bookingId=${encodeURIComponent(n.bookingId)}&fromNotification=1`
              : '/consumer/bookings';
            return (
              <li key={n.id}>
                <Card className={`p-4 border ${n.readAt ? 'border-white/10 bg-white/5' : 'border-blue-400/35 bg-blue-500/10'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <p className="text-white font-semibold">{n.title}</p>
                      <p className="text-sm text-white/80">{n.message}</p>
                      <p className="text-xs text-white/60">{formatWhen(n.createdAt)}</p>
                    </div>
                    {!n.readAt ? (
                      <button
                        type="button"
                        className="text-xs font-bold transition-colors"
                        onClick={() => markOne.mutate(n.id)}
                        style={{
                          padding: '0.375rem 0.75rem',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          color: '#60a5fa',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          borderRadius: '9999px',
                          cursor: 'pointer'
                        }}
                      >
                        Mark read
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    <Link
                      href={href}
                      onClick={() => {
                        if (!n.readAt) markOne.mutate(n.id);
                      }}
                      className="text-sm font-medium transition-colors"
                      style={{ color: '#93c5fd', textDecoration: 'none' }}
                    >
                      Open booking →
                    </Link>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>
    </AuthGuard>
  );
}
