'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createBooking,
  createBookingCheckoutSession,
  fetchConsumerBookings,
  fetchConsumerInvoices,
  cancelConsumerBooking,
  type CreateBookingPayload,
  type BookingDto,
} from './api';

export const CONSUMER_BOOKINGS_KEY = ['consumer-bookings'];
export const CONSUMER_INVOICES_KEY = ['consumer-invoices'];

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation<{ booking: BookingDto }, Error, CreateBookingPayload>({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONSUMER_BOOKINGS_KEY });
      queryClient.invalidateQueries({ queryKey: ['consumer-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['consumer-notifications-unread-count'] });
    },
  });
}

export function useConsumerBookings(enabled: boolean) {
  return useQuery({
    queryKey: CONSUMER_BOOKINGS_KEY,
    queryFn: async () => {
      const res = await fetchConsumerBookings();
      return res.data;
    },
    enabled,
    retry: false,
  });
}

export function useConsumerInvoices(enabled: boolean) {
  return useQuery({
    queryKey: CONSUMER_INVOICES_KEY,
    queryFn: async () => {
      const res = await fetchConsumerInvoices();
      return res.data;
    },
    enabled,
    retry: false,
  });
}

export function useCancelConsumerBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => cancelConsumerBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONSUMER_BOOKINGS_KEY });
      queryClient.invalidateQueries({ queryKey: ['consumer-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['consumer-notifications-unread-count'] });
    },
  });
}

export function useBookingCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => createBookingCheckoutSession(bookingId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CONSUMER_BOOKINGS_KEY });
      if (data.url) {
        window.location.assign(data.url);
      }
    },
  });
}
