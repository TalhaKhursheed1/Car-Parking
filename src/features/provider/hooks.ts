'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchProviderProfile,
  fetchProviderBookings,
  fetchProviderEarnings,
  fetchProviderActivity,
  updateProviderProfile,
  startProviderStripeOnboarding,
  openProviderStripeLoginLink,
  refreshProviderStripeBanking,
  updateProviderAccount,
  changeProviderPassword,
  fetchProviderSpace,
  fetchProviderSpaces,
  createProviderSpace,
  updateProviderSpace,
  toggleProviderSpaceActivation,
  deleteProviderSpace,
  ProviderProfile,
  ProviderSpace,
  ProviderSpaceSummary,
  ToggleSpaceActivationPayload,
  UpdateProviderProfilePayload,
  UpdateProviderAccountPayload,
  ChangeProviderPasswordPayload,
  ProviderEarningsReportFilter,
} from './api';

export const PROVIDER_PROFILE_QUERY_KEY = ['provider-profile'];
const PROVIDER_SPACES_QUERY_KEY = ['provider-spaces'];
const PROVIDER_BOOKINGS_QUERY_KEY = ['provider-bookings'];
const providerSpaceKey = (spaceId: string) => ['provider-space', spaceId];

const earningsKey = (from?: string, to?: string, filter?: ProviderEarningsReportFilter) =>
  ['provider', 'earnings', from ?? '', to ?? '', filter ?? 'paid'] as const;
const ACTIVITY_QUERY_KEY = ['provider', 'activity'] as const;

export function useProviderProfile() {
  return useQuery<{ profile: ProviderProfile }, Error>({
    queryKey: PROVIDER_PROFILE_QUERY_KEY,
    queryFn: fetchProviderProfile,
    retry: false,
  });
}

export function useProviderBookings(enabled: boolean) {
  return useQuery({
    queryKey: PROVIDER_BOOKINGS_QUERY_KEY,
    queryFn: async () => {
      const res = await fetchProviderBookings();
      return res.data;
    },
    enabled,
    retry: false,
  });
}

export function useProviderEarnings(
  from?: string,
  to?: string,
  enabled = true,
  filter: ProviderEarningsReportFilter = 'paid',
) {
  return useQuery({
    queryKey: earningsKey(from, to, filter),
    queryFn: () => fetchProviderEarnings({ from, to, filter }),
    retry: false,
    enabled,
  });
}

export function useProviderActivity(enabled: boolean) {
  return useQuery({
    queryKey: ACTIVITY_QUERY_KEY,
    queryFn: fetchProviderActivity,
    enabled,
    retry: false,
    refetchInterval: 120_000,
  });
}

export function useUpdateProviderProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProviderProfilePayload) => updateProviderProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDER_PROFILE_QUERY_KEY });
    },
  });
}

export function useProviderStripeOnboarding() {
  return useMutation({
    mutationFn: startProviderStripeOnboarding,
    onSuccess: (data) => {
      if (data.url) {
        window.location.assign(data.url);
      }
    },
  });
}

/**
 * Opens the Stripe Express dashboard in a new tab so the provider can
 * change their bank account, payout schedule, or verification details.
 */
export function useProviderStripeLoginLink() {
  return useMutation({
    mutationFn: openProviderStripeLoginLink,
    onSuccess: (data) => {
      if (data.url && typeof window !== 'undefined') {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
    },
  });
}

/**
 * Forces a sync of the provider's banking + verification snapshot from
 * Stripe and refreshes the cached profile so the UI reflects it.
 */
export function useRefreshProviderStripe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshProviderStripeBanking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDER_PROFILE_QUERY_KEY });
    },
  });
}

export function useUpdateProviderAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProviderAccountPayload) => updateProviderAccount(payload),
    onSuccess: () => {
      // Profile carries the email; the auth store reads the current
      // user from /api/auth/me, which we also invalidate so the
      // header / nav reflects the new name.
      queryClient.invalidateQueries({ queryKey: PROVIDER_PROFILE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export function useChangeProviderPassword() {
  return useMutation({
    mutationFn: (payload: ChangeProviderPasswordPayload) => changeProviderPassword(payload),
  });
}

export function useProviderSpaces() {
  return useQuery<ProviderSpaceSummary[], Error>({
    queryKey: PROVIDER_SPACES_QUERY_KEY,
    queryFn: async () => {
      const response = await fetchProviderSpaces();
      return response.data;
    },
  });
}

export function useProviderSpace(spaceId?: string) {
  return useQuery<ProviderSpace, Error>({
    queryKey: providerSpaceKey(spaceId ?? 'new'),
    queryFn: async () => {
      const response = await fetchProviderSpace(spaceId as string);
      return response.data;
    },
    enabled: Boolean(spaceId),
    retry: false,
  });
}

export function useCreateProviderSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProviderSpace,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PROVIDER_SPACES_QUERY_KEY });
      if (data?.data?.id) {
        queryClient.invalidateQueries({ queryKey: providerSpaceKey(data.data.id) });
      }
    },
  });
}

export function useUpdateProviderSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProviderSpace,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: PROVIDER_SPACES_QUERY_KEY });
      const spaceId = data?.data?.id ?? variables.id;
      if (spaceId) {
        queryClient.invalidateQueries({ queryKey: providerSpaceKey(spaceId) });
      }
    },
  });
}

export function useToggleProviderSpaceActivation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ToggleSpaceActivationPayload) => toggleProviderSpaceActivation(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PROVIDER_SPACES_QUERY_KEY });
      if (variables.spaceId) {
        queryClient.invalidateQueries({ queryKey: providerSpaceKey(variables.spaceId) });
      }
    },
  });
}

export function useDeleteProviderSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (spaceId: string) => deleteProviderSpace(spaceId),
    onSuccess: (_, spaceId) => {
      queryClient.invalidateQueries({ queryKey: PROVIDER_SPACES_QUERY_KEY });
      if (spaceId) {
        queryClient.removeQueries({ queryKey: providerSpaceKey(spaceId) });
      }
    },
  });
}

