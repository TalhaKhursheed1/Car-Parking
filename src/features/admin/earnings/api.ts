'use client';

import { apiFetch } from '@/lib/api-client';

export type EarningsGroupBy = 'day' | 'week' | 'month' | 'provider' | 'city';

export type EarningsBucket = {
  key: string;
  label: string;
  bookings: number;
  grossAud: number;
  platformCommissionAud: number;
  providerShareAud: number;
};

export type AdminEarningsReportResponse = {
  groupBy: EarningsGroupBy;
  rows: EarningsBucket[];
  totals: {
    bookings: number;
    grossAud: number;
    platformCommissionAud: number;
    providerShareAud: number;
  };
  range: { from: string | null; to: string | null };
  bookingCount: number;
};

export type EarningsFilters = {
  from?: string;
  to?: string;
  groupBy: EarningsGroupBy;
};

function toQuery(filters: EarningsFilters, format?: 'csv' | 'csv-detailed') {
  const search = new URLSearchParams();
  if (filters.from) search.set('from', filters.from);
  if (filters.to) search.set('to', filters.to);
  search.set('groupBy', filters.groupBy);
  if (format) search.set('format', format);
  return search.toString();
}

export async function fetchAdminEarningsReport(filters: EarningsFilters) {
  const q = toQuery(filters);
  return apiFetch<AdminEarningsReportResponse>(`/api/admin/reports/earnings?${q}`);
}

export function buildEarningsCsvUrl(
  filters: EarningsFilters,
  variant: 'csv' | 'csv-detailed' = 'csv',
): string {
  return `/api/admin/reports/earnings?${toQuery(filters, variant)}`;
}
