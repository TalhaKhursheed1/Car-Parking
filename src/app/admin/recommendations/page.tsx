'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Star } from 'lucide-react';

import { AuthGuard } from '@/components/AuthGuard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import {
  useAdminRecommendations,
  useSetSpaceRecommended,
} from '@/features/admin/recommendations/hooks';
import type {
  AdminRatedSpace,
  AdminRecommendationsFilters,
} from '@/features/admin/recommendations/api';

function formatRate(value: number, currency: string) {
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

function formatRecommendedAt(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
}

function RecommendBadge({ value }: { value: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.2rem 0.65rem',
        borderRadius: '9999px',
        fontSize: '0.6875rem',
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: value ? '#bbf7d0' : 'rgba(255, 255, 255, 0.55)',
        backgroundColor: value ? 'rgba(34, 197, 94, 0.18)' : 'rgba(255, 255, 255, 0.08)',
        border: value
          ? '1px solid rgba(74, 222, 128, 0.55)'
          : '1px solid rgba(255, 255, 255, 0.15)',
      }}
    >
      <Sparkles width={12} height={12} strokeWidth={2} aria-hidden />
      {value ? 'Recommended' : 'Not recommended'}
    </span>
  );
}

function AdminRecommendationsPageContent() {
  const [filterDraft, setFilterDraft] = useState({
    city: '',
    state: '',
    minReviews: '1',
    onlyRecommended: false,
    priorWeight: '5',
  });
  const [appliedFilters, setAppliedFilters] = useState<AdminRecommendationsFilters>({
    minReviews: 1,
    priorWeight: 5,
    limit: 50,
  });

  const { data, isLoading, isError } = useAdminRecommendations(appliedFilters);
  const toggle = useSetSpaceRecommended();
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);

  const rows = data?.data ?? [];
  const summary = data?.summary;
  const topRow = rows[0];
  const topRowKey = topRow?.space.id;

  const handleApply = (event: React.FormEvent) => {
    event.preventDefault();
    const parsedMin = Number(filterDraft.minReviews);
    const parsedPrior = Number(filterDraft.priorWeight);
    setAppliedFilters({
      city: filterDraft.city.trim() || undefined,
      state: filterDraft.state.trim() || undefined,
      minReviews: Number.isFinite(parsedMin) && parsedMin > 0 ? Math.floor(parsedMin) : 1,
      priorWeight:
        Number.isFinite(parsedPrior) && parsedPrior >= 0 ? Math.floor(parsedPrior) : 5,
      isRecommended: filterDraft.onlyRecommended ? true : undefined,
      limit: 50,
    });
  };

  const handleReset = () => {
    setFilterDraft({
      city: '',
      state: '',
      minReviews: '1',
      onlyRecommended: false,
      priorWeight: '5',
    });
    setAppliedFilters({ minReviews: 1, priorWeight: 5, limit: 50 });
  };

  const handleToggle = (row: AdminRatedSpace) => {
    setPendingRowId(row.space.id);
    toggle.mutate(
      { spaceId: row.space.id, recommended: !row.space.isRecommended },
      {
        onError: (e) => window.alert(e.message),
        onSettled: () => setPendingRowId(null),
      },
    );
  };

  const recommendedCount = summary?.recommendedCount ?? 0;

  return (
    <div className="min-h-screen py-8 sm:py-12 lg:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center text-blue-300 hover:text-blue-200 w-fit transition-colors"
        >
          ← Back to Dashboard
        </Link>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between" style={{ gap: '1rem' }}>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Rating-based Recommendations
            </h1>
            <p className="text-white/70 max-w-3xl text-sm sm:text-base">
              Promote highly-rated parking spaces to the consumer browse page.
              The list below ranks approved listings by a weighted user rating
              (a Bayesian average that down-weights spaces with very few
              reviews), so the top of the table is what consumers should see
              first. Toggle individual spaces in or out of the curated set.
            </p>
          </div>
          <div className="text-sm text-white/70 text-right">
            <div>
              <span className="font-semibold text-white">
                {summary?.candidates ?? 0}
              </span>{' '}
              eligible spaces
            </div>
            <div>
              <span className="font-semibold text-emerald-300">{recommendedCount}</span>{' '}
              currently recommended
            </div>
          </div>
        </div>
      </div>

      <Card className="p-6 bg-white/5 border border-white/10">
        <form onSubmit={handleApply} className="grid grid-cols-1 lg:grid-cols-5" style={{ gap: '1rem' }}>
          <Input
            label="City"
            placeholder="e.g., Sydney"
            value={filterDraft.city}
            onChange={(e) =>
              setFilterDraft((prev) => ({ ...prev, city: e.target.value }))
            }
          />
          <Input
            label="State"
            placeholder="e.g., NSW"
            value={filterDraft.state}
            onChange={(e) =>
              setFilterDraft((prev) => ({ ...prev, state: e.target.value }))
            }
          />
          <Input
            label="Min reviews"
            type="number"
            min={1}
            value={filterDraft.minReviews}
            onChange={(e) =>
              setFilterDraft((prev) => ({ ...prev, minReviews: e.target.value }))
            }
          />
          <Input
            label="Prior weight (m)"
            type="number"
            min={0}
            value={filterDraft.priorWeight}
            onChange={(e) =>
              setFilterDraft((prev) => ({ ...prev, priorWeight: e.target.value }))
            }
          />
          <div className="flex flex-col justify-end" style={{ gap: '0.5rem' }}>
            <label className="inline-flex items-center text-sm text-white/80" style={{ gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={filterDraft.onlyRecommended}
                onChange={(e) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    onlyRecommended: e.target.checked,
                  }))
                }
              />
              Only show currently recommended
            </label>
            <div className="flex" style={{ gap: '0.5rem' }}>
              <Button type="submit" size="sm">
                Apply
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </div>
        </form>
        <p className="text-xs text-white/50 mt-3">
          Weighted rating = (v·R + m·C) / (v + m), where R is the average star
          rating, v is the number of reviews, C is the global mean (3.5), and m
          is the prior weight above. Higher prior weights give more reviews more
          influence.
        </p>
      </Card>

      <Card className="p-0 overflow-hidden border border-white/10 bg-white/5">
        {isLoading ? (
          <div className="p-6 text-white/70">Crunching ratings…</div>
        ) : isError ? (
          <div className="p-6 text-red-200">
            Failed to load recommendations. Please try again.
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-white/70">
            No reviewed spaces match these filters. Once consumers start leaving
            reviews, candidates will appear here automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-white/85">
              <thead>
                <tr className="border-b border-white/10 text-white/60 text-xs uppercase">
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Space</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Rate</th>
                  <th className="px-4 py-3 font-semibold">Rating</th>
                  <th className="px-4 py-3 font-semibold">Weighted</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const isPending = pendingRowId === row.space.id && toggle.isPending;
                  const isTopPick = row.space.id === topRowKey;
                  return (
                    <tr
                      key={row.space.id}
                      className="border-b border-white/5 hover:bg-white/[0.04] transition-colors"
                    >
                      <td className="px-4 py-4 text-white/60 font-mono text-xs">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center flex-wrap" style={{ gap: '0.5rem' }}>
                          <Link
                            href={`/admin/spaces/live/${row.space.id}`}
                            className="font-semibold text-white hover:text-blue-200"
                          >
                            {row.space.title}
                          </Link>
                          {isTopPick && row.space.isRecommended ? (
                            <span className="text-[10px] uppercase tracking-wide text-emerald-300">
                              · Top pick
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-white/55">
                          {row.provider
                            ? `${row.provider.fullName} · ${row.provider.email}`
                            : 'Provider unknown'}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-white/80 text-sm">
                        {[row.space.city, row.space.state].filter(Boolean).join(', ') ||
                          '—'}
                      </td>
                      <td className="px-4 py-4 text-white/80">
                        {formatRate(row.space.hourlyRate, row.space.currency)}
                        <span className="text-xs text-white/55"> /hr</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center text-white" style={{ gap: '0.375rem' }}>
                          <Star
                            width={14}
                            height={14}
                            strokeWidth={2}
                            style={{ color: '#facc15', fill: '#facc15' }}
                            aria-hidden
                          />
                          <span className="font-semibold">
                            {row.space.ratingAverage.toFixed(1)}
                          </span>
                          <span className="text-xs text-white/60">
                            ({row.space.ratingCount})
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm tabular-nums text-emerald-200 font-semibold">
                        {row.weightedRating.toFixed(2)}
                      </td>
                      <td className="px-4 py-4">
                        <RecommendBadge value={row.space.isRecommended} />
                        {row.space.recommendedAt ? (
                          <div className="text-[11px] text-white/45 mt-1">
                            Since {formatRecommendedAt(row.space.recommendedAt)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant={row.space.isRecommended ? 'outline' : 'primary'}
                            disabled={isPending}
                            onClick={() => handleToggle(row)}
                          >
                            {isPending
                              ? 'Saving…'
                              : row.space.isRecommended
                                ? 'Remove'
                                : 'Recommend'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function AdminRecommendationsPage() {
  return (
    <AuthGuard allowedRoles={['admin']}>
      <AdminRecommendationsPageContent />
    </AuthGuard>
  );
}
