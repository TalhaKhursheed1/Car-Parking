'use client';

import { apiFetch } from '@/lib/api-client';

export type IncomeReportRow = {
  bookingId: string;
  paidAt: string;
  spaceTitle: string;
  consumerName: string;
  providerLabel: string;
  grossAud: number;
  platformCommissionAud: number;
  providerShareAud: number;
  estimatedStripeFeeAud: number;
  stripeCheckoutSessionId: string | null;
  currency: string;
};

export type AdminIncomeResponse = {
  rows: IncomeReportRow[];
  totals: {
    grossAud: number;
    platformCommissionAud: number;
    providerShareAud: number;
    estimatedStripeFeeAud: number;
  };
  range: { from: string | null; to: string | null };
};

export async function fetchAdminIncome(params: { from?: string; to?: string }): Promise<AdminIncomeResponse> {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  const q = search.toString();
  return apiFetch<AdminIncomeResponse>(`/api/admin/income${q ? `?${q}` : ''}`);
}

export type AdminPlatformIncomeSummary = {
  platformCommissionAud: number;
  confirmedBookingCount: number;
};

export async function fetchAdminPlatformIncomeSummary(): Promise<AdminPlatformIncomeSummary> {
  return apiFetch<AdminPlatformIncomeSummary>('/api/admin/stats/platform-income');
}

export type AdminActiveBookingsSummary = {
  activeCount: number;
};

export async function fetchAdminActiveBookingsSummary(): Promise<AdminActiveBookingsSummary> {
  return apiFetch<AdminActiveBookingsSummary>('/api/admin/stats/active-bookings');
}
