'use client';

import { apiFetch } from '@/lib/api-client';

export type BookingDto = {
  id: string;
  spaceId: string;
  consumerId: string;
  providerId: string;
  startAt: string;
  endAt: string;
  status: 'pending_payment' | 'confirmed' | 'cancelled';
  totalAmount: number;
  currency: string;
  pricingMode: 'hourly';
  createdAt: string;
  updatedAt: string;
  /** ISO deadline to complete payment (US20). */
  paymentDueAt: string | null;
};

type CreateBookingResponse = {
  booking: BookingDto;
};

export type CreateBookingPayload = {
  spaceId: string;
  startAt: string;
  endAt: string;
};

export function createBooking(payload: CreateBookingPayload) {
  return apiFetch<CreateBookingResponse>('/api/bookings', {
    method: 'POST',
    body: payload,
  });
}

export type SlotAvailabilityResponse =
  | {
      available: true;
      estimatedTotal: number;
      currency: string;
      capacity: number;
      bookedUnits: number;
      spotsRemaining: number;
    }
  | { available: false; reason: string };

export type ConsumerBookingRow = {
  id: string;
  spaceId: string;
  spaceTitle: string;
  startAt: string;
  endAt: string;
  status: 'pending_payment' | 'confirmed' | 'cancelled';
  totalAmount: number;
  currency: string;
  pricingMode: 'hourly';
  createdAt: string;
  cancelledAt: string | null;
  invoiceNumber: string | null;
  invoiceGeneratedAt: string | null;
  invoiceEmailSentAt: string | null;
  invoiceEmailLastError: string | null;
  paymentDueAt: string | null;
};

export type ConsumerInvoiceRow = {
  bookingId: string;
  invoiceNumber: string | null;
  invoiceGeneratedAt: string | null;
  invoiceEmailSentAt: string | null;
  spaceTitle: string;
  providerLabel: string;
  totalAmount: number;
  currency: string;
  paidAt: string;
  rentalStartAt: string;
  rentalEndAt: string;
  pdfUrl: string;
};

type ConsumerBookingsResponse = {
  data: ConsumerBookingRow[];
};

export function fetchConsumerBookings() {
  return apiFetch<ConsumerBookingsResponse>('/api/consumer/bookings');
}

type ConsumerInvoicesResponse = {
  data: ConsumerInvoiceRow[];
};

export function fetchConsumerInvoices() {
  return apiFetch<ConsumerInvoicesResponse>('/api/consumer/invoices');
}

export function cancelConsumerBooking(bookingId: string) {
  return apiFetch<{ success: boolean; message: string }>(`/api/bookings/${bookingId}/cancel`, {
    method: 'POST',
  });
}

export type BookingCheckoutResponse = {
  url: string;
  expiresAt: number | null;
  paymentDueAt: string | null;
  reusedSession: boolean;
};

export function createBookingCheckoutSession(bookingId: string) {
  return apiFetch<BookingCheckoutResponse>(`/api/bookings/${encodeURIComponent(bookingId)}/checkout`, {
    method: 'POST',
  });
}

export async function fetchSlotAvailability(
  spaceId: string,
  startAtIso: string,
  endAtIso: string,
  signal?: AbortSignal,
): Promise<SlotAvailabilityResponse> {
  const params = new URLSearchParams({ startAt: startAtIso, endAt: endAtIso });
  const response = await fetch(`/api/spaces/${spaceId}/availability?${params.toString()}`, {
    credentials: 'include',
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload
        ? String((payload as { error: string }).error)
        : response.statusText;
    throw new Error(message);
  }
  return payload as SlotAvailabilityResponse;
}
