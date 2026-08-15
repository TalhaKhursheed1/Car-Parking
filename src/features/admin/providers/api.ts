'use client';

import { apiFetch } from '@/lib/api-client';

export type PendingProvider = {
  profile: {
    id: string | null;
    userId: string;
    businessName?: string;
    contactName?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    taxId?: string;
    bankAccountLast4?: string;
    businessType?: 'individual' | 'company';
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    updatedAt: string;
  };
  user: {
    id: string;
    fullName: string;
    email: string;
  } | null;
};

type PendingProvidersResponse = {
  providers: PendingProvider[];
};

type UpdateProviderStatusPayload = {
  userId: string;
  status: 'approved' | 'rejected';
  verificationNotes?: string;
};

type UpdateProviderStatusResponse = {
  success: boolean;
};

export function fetchPendingProviders() {
  return apiFetch<PendingProvidersResponse>('/api/admin/providers/pending');
}

export function updateProviderStatus({ userId, status, verificationNotes }: UpdateProviderStatusPayload) {
  return apiFetch<UpdateProviderStatusResponse>(`/api/admin/providers/${userId}`, {
    method: 'PATCH',
    body: {
      status,
      verificationNotes,
    },
  });
}
