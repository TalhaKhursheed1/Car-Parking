'use client';

import { apiFetch } from '@/lib/api-client';

export type AdminActivityRow = {
  id: string;
  type: string;
  actorLabel: string;
  actionLabel: string;
  contextLabel: string | null;
  status: 'success' | 'warning' | 'error' | 'info';
  entityId: string | null;
  createdAt: string;
};

export type AdminActivitiesResponse = {
  data: AdminActivityRow[];
  total: number;
  offset: number;
  limit: number;
};

export function fetchAdminActivities(params?: { limit?: number; offset?: number }) {
  const q = new URLSearchParams();
  if (params?.limit !== undefined) q.set('limit', String(params.limit));
  if (params?.offset !== undefined) q.set('offset', String(params.offset));
  return apiFetch<AdminActivitiesResponse>(`/api/admin/activities${q.toString() ? `?${q.toString()}` : ''}`);
}
