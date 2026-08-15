'use client';

import { apiFetch } from '@/lib/api-client';

type PendingSpace = {
  space: {
    id: string;
    title: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    hourlyRate: number;
    dailyRate?: number;
    currency: string;
    amenities: string[];
    status: 'pending' | 'approved' | 'rejected' | 'archived';
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    verificationNotes?: string | null;
  };
  provider: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  profile: {
    businessName?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  } | null;
};

type PendingSpacesResponse = {
  spaces: PendingSpace[];
};

type AdminSpaceDetailResponse = {
  space: {
    id: string;
    providerId: string;
    title: string;
    description: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: {
      type: 'Point';
      coordinates: [number, number];
    } | null;
    hourlyRate: number;
    dailyRate: number | null;
    currency: string;
    capacity: number | null;
    amenities: string[];
    images: string[];
    providerBadge: string | null;
    availabilityType: '24_7' | 'custom' | 'business_hours';
    customAvailability: Array<{
      day: string;
      startTime: string;
      endTime: string;
    }>;
    isActive: boolean;
    status: 'pending' | 'approved' | 'rejected' | 'archived';
    verificationNotes: string | null;
    approvedAt: string | null;
    approvedBy: string | null;
    ratingAverage: number;
    ratingCount: number;
    createdAt: string;
    updatedAt: string;
  };
  provider: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
  profile: {
    businessName: string;
    contactName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    payoutMethod: string;
    bankAccountLast4: string;
    taxId: string;
    businessType: string;
    status: string;
    verificationNotes: string;
    createdAt: string;
    updatedAt: string;
  } | null;
};

type UpdateSpaceStatusPayload = {
  spaceId: string;
  status: 'approved' | 'rejected';
  verificationNotes?: string;
  isActive?: boolean;
};

type UpdateSpaceStatusResponse = {
  success: boolean;
};

export type AdminLiveSpace = {
  space: {
    id: string;
    title: string;
    city?: string;
    state?: string;
    hourlyRate: number;
    dailyRate?: number | null;
    currency: string;
    status: 'pending' | 'approved' | 'rejected' | 'archived';
    isActive: boolean;
    updatedAt: string;
    createdAt: string;
    providerBadge?: string | null;
  };
  provider: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  profile: {
    businessName: string;
    city: string;
    state: string;
  } | null;
};

export type AdminLiveSpacesResponse = {
  data: AdminLiveSpace[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type UpdateAdminSpacePayload = {
  title?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  hourlyRate?: number;
  dailyRate?: number | null;
  currency?: string;
  status?: 'approved' | 'rejected' | 'archived';
  isActive?: boolean;
};

export type AdminLiveSpaceQuery = {
  page?: number;
  pageSize?: number;
  status?: 'approved' | 'archived';
  city?: string;
  state?: string;
  provider?: string;
  search?: string;
  isActive?: boolean;
};

export function fetchPendingSpaces() {
  return apiFetch<PendingSpacesResponse>('/api/admin/spaces/pending');
}

export function fetchAdminSpaceDetail(spaceId: string) {
  return apiFetch<AdminSpaceDetailResponse>(`/api/admin/spaces/${spaceId}`);
}

export function updateSpaceStatus({ spaceId, ...body }: UpdateSpaceStatusPayload) {
  return apiFetch<UpdateSpaceStatusResponse>(`/api/admin/spaces/${spaceId}`, {
    method: 'PATCH',
    body,
  });
}

export function fetchAdminLiveSpaces(params?: AdminLiveSpaceQuery) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.city) searchParams.set('city', params.city);
  if (params?.state) searchParams.set('state', params.state);
  if (params?.provider) searchParams.set('provider', params.provider);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));

  const queryString = searchParams.toString();
  const url = `/api/admin/spaces/live${queryString ? `?${queryString}` : ''}`;

  return apiFetch<AdminLiveSpacesResponse>(url);
}

export function updateAdminSpace(spaceId: string, payload: UpdateAdminSpacePayload) {
  return apiFetch<{ success: boolean }>(`/api/admin/spaces/${spaceId}`, {
    method: 'PATCH',
    body: payload,
  });
}

type SpacesCountResponse = {
  total: number;
};

export function fetchAllSpacesCount() {
  return apiFetch<SpacesCountResponse>('/api/admin/spaces/count');
}

export type {
  PendingSpace,
  UpdateSpaceStatusPayload,
  AdminSpaceDetailResponse,
  UpdateAdminSpacePayload,
};
