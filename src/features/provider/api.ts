'use client';

import { apiFetch } from '@/lib/api-client';

export type StripeConnectSummary = {
  hasAccount: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  readyForPayments: boolean;
};

export type ProviderBankingSnapshot = {
  brand: string | null;
  last4: string | null;
  currency: string | null;
  country: string | null;
  syncedAt: string | null;
};

export type ProviderProfile = {
  id: string | null;
  userId: string;
  /** Email comes from the underlying user record - it's the login identifier. */
  email?: string | null;
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
  stripeConnect?: StripeConnectSummary;
  banking?: ProviderBankingSnapshot;
};

export type ProviderSpaceStatus = 'pending' | 'approved' | 'rejected' | 'archived';
export type ProviderSpaceAvailability = '24_7' | 'custom' | 'business_hours';

export type ProviderSpace = {
  id: string;
  title: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  coordinates?: {
    type: 'Point';
    coordinates: [number, number];
  };
  hourlyRate: number;
  dailyRate?: number;
  currency: string;
  capacity?: number;
  amenities: string[];
  availabilityType: ProviderSpaceAvailability;
  customAvailability: Array<{
    day: string;
    startTime: string;
    endTime: string;
  }>;
  images: string[];
  isActive: boolean;
  status: ProviderSpaceStatus;
  verificationNotes?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProviderProfileResponse = {
  profile: ProviderProfile;
};

type ProviderSpacesResponse = {
  data: ProviderSpaceSummary[];
};

type ProviderSpaceSummary = {
  id: string;
  title: string;
  city?: string;
  state?: string;
  hourlyRate: number;
  dailyRate?: number;
  currency: string;
  status: ProviderSpaceStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  images: string[];
};

type ProviderSpaceResponse = {
  data: ProviderSpace;
};

type CreateProviderSpacePayload = {
  title: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  hourlyRate: number;
  dailyRate?: number;
  currency?: string;
  capacity?: number;
  amenities?: string[];
  availabilityType?: ProviderSpaceAvailability;
  customAvailability?: ProviderSpace['customAvailability'];
  images?: string[];
  isActive?: boolean;
};

type UpdateProviderSpacePayload = CreateProviderSpacePayload & {
  id: string;
};

export type ToggleSpaceActivationPayload = {
  spaceId: string;
  isActive: boolean;
};

export type ProviderBookingPayment = {
  paidAt: string;
  customerTotalAud: number;
  platformFeeAud: number;
  providerShareAud: number;
  stripeCheckoutSessionId: string | null;
};

export type ProviderBookingRow = {
  id: string;
  spaceId: string;
  spaceTitle: string;
  consumerId: string;
  consumerName: string;
  startAt: string;
  endAt: string;
  status: 'pending_payment' | 'confirmed' | 'cancelled';
  totalAmount: number;
  currency: string;
  pricingMode: 'hourly';
  createdAt: string;
  cancelledAt: string | null;
  /** Present when status is confirmed: paid amount split (platform fee vs your share). */
  payment: ProviderBookingPayment | null;
};

type ProviderBookingsResponse = {
  data: ProviderBookingRow[];
};

export type UpdateProviderProfilePayload = {
  businessName?: string;
  contactName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  taxId?: string;
  businessType?: 'individual' | 'company';
};

export function fetchProviderProfile() {
  return apiFetch<ProviderProfileResponse>('/api/provider/profile');
}

export function fetchProviderBookings() {
  return apiFetch<ProviderBookingsResponse>('/api/provider/bookings');
}

export type ProviderEarningsTotals = {
  grossAud: number;
  platformCommissionAud: number;
  providerShareAud: number;
  estimatedStripeFeeAud: number;
};

export type ProviderEarningsReportFilter =
  | 'paid'
  | 'pending'
  | 'cancelled'
  | 'cancelled_unpaid'
  | 'cancelled_paid'
  | 'all';

export type ProviderEarningsRow = {
  bookingId: string;
  bookingStatus: 'confirmed' | 'pending_payment' | 'cancelled';
  cancelKind: 'none' | 'unpaid' | 'after_payment';
  relevantAt: string;
  paidAt: string;
  spaceTitle: string;
  consumerName: string;
  grossAud: number;
  platformCommissionAud: number;
  providerShareAud: number;
  estimatedStripeFeeAud: number;
  stripeCheckoutSessionId: string | null;
  currency: string;
};

export type ProviderEarningsResponse = {
  rows: ProviderEarningsRow[];
  totals: ProviderEarningsTotals;
  range: { from: string | null; to: string | null };
  filter: ProviderEarningsReportFilter;
  totalsHint: string | null;
};

export function fetchProviderEarnings(params?: {
  from?: string;
  to?: string;
  filter?: ProviderEarningsReportFilter;
}) {
  const search = new URLSearchParams();
  if (params?.from) search.set('from', params.from);
  if (params?.to) search.set('to', params.to);
  if (params?.filter) search.set('filter', params.filter);
  const q = search.toString();
  return apiFetch<ProviderEarningsResponse>(`/api/provider/earnings${q ? `?${q}` : ''}`);
}

export type ProviderActivityResponse = {
  activeListingCount: number;
  paidBookingsThisMonthCount: number;
  pendingPaymentCount: number;
  paidLast7DaysCount: number;
  recentPaid: Array<{
    bookingId: string;
    paidAt: string;
    spaceTitle: string;
    consumerName: string;
    providerShareAud: number;
    currency: string;
  }>;
};

export function fetchProviderActivity() {
  return apiFetch<ProviderActivityResponse>('/api/provider/activity');
}

export function updateProviderProfile(payload: UpdateProviderProfilePayload) {
  return apiFetch<ProviderProfileResponse>('/api/provider/profile', {
    method: 'PATCH',
    body: payload,
  });
}

export function startProviderStripeOnboarding() {
  return apiFetch<{ url: string }>('/api/provider/stripe/onboarding', {
    method: 'POST',
  });
}

export function openProviderStripeLoginLink() {
  return apiFetch<{ url: string }>('/api/provider/stripe/login-link', {
    method: 'POST',
  });
}

export type ProviderStripeRefreshResponse = {
  ok: true;
  snapshot: ProviderBankingSnapshot & {
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    syncedAt: string;
  };
};

export function refreshProviderStripeBanking() {
  return apiFetch<ProviderStripeRefreshResponse>('/api/provider/stripe/refresh', {
    method: 'POST',
  });
}

export type UpdateProviderAccountPayload = {
  fullName?: string;
  email?: string;
  currentPassword?: string;
};

export type UpdateProviderAccountResponse = {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: 'provider';
  };
  changed: boolean;
};

export function updateProviderAccount(payload: UpdateProviderAccountPayload) {
  return apiFetch<UpdateProviderAccountResponse>('/api/provider/account', {
    method: 'PATCH',
    body: payload,
  });
}

export type ChangeProviderPasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
};

export function changeProviderPassword(payload: ChangeProviderPasswordPayload) {
  return apiFetch<{ ok: true }>('/api/provider/password', {
    method: 'POST',
    body: payload,
  });
}

export function fetchProviderSpaces() {
  return apiFetch<ProviderSpacesResponse>('/api/provider/spaces');
}

export function fetchProviderSpace(spaceId: string) {
  return apiFetch<ProviderSpaceResponse>(`/api/provider/spaces/${spaceId}`);
}

export function createProviderSpace(payload: CreateProviderSpacePayload) {
  return apiFetch<ProviderSpaceResponse>('/api/provider/spaces', {
    method: 'POST',
    body: payload,
  });
}

export function updateProviderSpace(payload: UpdateProviderSpacePayload) {
  const { id, ...body } = payload;
  return apiFetch<ProviderSpaceResponse>(`/api/provider/spaces/${id}`, {
    method: 'PATCH',
    body,
  });
}

export function toggleProviderSpaceActivation({ spaceId, isActive }: ToggleSpaceActivationPayload) {
  return apiFetch<{ success: boolean }>(`/api/provider/spaces/${spaceId}/activate`, {
    method: 'POST',
    body: { isActive },
  });
}

export function deleteProviderSpace(spaceId: string) {
  return apiFetch<{ success: boolean }>(`/api/provider/spaces/${spaceId}`, {
    method: 'DELETE',
  });
}

export type { ProviderSpaceSummary };

