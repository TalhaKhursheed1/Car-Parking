export type AdminLiveFilters = {
  page: number;
  city?: string;
  state?: string;
  status?: 'approved' | 'archived';
  provider?: string;
  search?: string;
};

export function parseAdminLiveFilters(params: URLSearchParams): AdminLiveFilters {
  const page = Math.max(Number(params.get('page')) || 1, 1);
  const statusParam = params.get('status');
  const status = statusParam === 'approved' || statusParam === 'archived' ? statusParam : undefined;

  return {
    page,
    city: params.get('city')?.trim() || undefined,
    state: params.get('state')?.trim() || undefined,
    status,
    provider: params.get('provider')?.trim() || undefined,
    search: params.get('search')?.trim() || undefined,
  };
}

export function buildAdminLiveQuery(filters: AdminLiveFilters): string {
  const params = new URLSearchParams();
  if (filters.city) params.set('city', filters.city);
  if (filters.state) params.set('state', filters.state);
  if (filters.status) params.set('status', filters.status);
  if (filters.provider) params.set('provider', filters.provider);
  if (filters.search) params.set('search', filters.search);
  if (filters.page > 1) params.set('page', String(filters.page));
  const query = params.toString();
  return query ? `?${query}` : '';
}

