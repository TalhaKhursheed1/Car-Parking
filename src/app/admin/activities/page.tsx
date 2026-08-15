'use client';

import Link from 'next/link';
import { useState } from 'react';

import { AuthGuard } from '@/components/AuthGuard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAdminActivities } from '@/features/admin/activities/hooks';

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminActivitiesPage() {
  const [page, setPage] = useState(0);
  const limit = 25;
  const offset = page * limit;
  const { data, isLoading, isError } = useAdminActivities(limit, offset);
  const rows = (data?.data ?? []).filter((row) => row.type !== 'booking_expired');

  const total = data?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return (
    <AuthGuard allowedRoles={['admin']}>
      <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <Link href="/admin/dashboard" className="inline-flex items-center text-blue-300 hover:text-blue-400 mb-2">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">All Activities</h1>
        </div>

        {isLoading ? <p className="text-white/80">Loading activities…</p> : null}
        {isError ? <p className="text-red-200">Could not load activities.</p> : null}

        {!isLoading && !isError ? (
          <Card className="p-0 overflow-hidden border border-white/10 bg-white/5">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-white/80">
                <thead>
                  <tr className="border-b border-white/10 text-white/60 text-xs uppercase">
                    <th className="px-4 py-3 font-semibold">When</th>
                    <th className="px-4 py-3 font-semibold">Actor</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold">Context</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-white/5">
                      <td className="px-4 py-3 text-white/75">{formatWhen(row.createdAt)}</td>
                      <td className="px-4 py-3 text-white">{row.actorLabel}</td>
                      <td className="px-4 py-3 text-white/90">{row.actionLabel}</td>
                      <td className="px-4 py-3 text-white/70">{row.contextLabel ?? '—'}</td>
                      <td className="px-4 py-3 text-white/80">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}

        <div className="flex items-center justify-between">
          <p className="text-sm text-white/70">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex" style={{ gap: '0.75rem' }}>
            <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage((p) => Math.max(p - 1, 0))}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
