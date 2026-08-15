'use client';

import { apiFetch } from '@/lib/api-client';

export type ConsumerNotificationDto = {
  id: string;
  type: 'booking_created_pending_payment' | 'booking_confirmed' | 'booking_cancelled' | 'payment_expired';
  title: string;
  message: string;
  bookingId: string | null;
  readAt: string | null;
  createdAt: string;
};

type ConsumerNotificationsResponse = {
  data: ConsumerNotificationDto[];
};

export function fetchConsumerNotifications(limit = 50) {
  const p = new URLSearchParams({ limit: String(limit) });
  return apiFetch<ConsumerNotificationsResponse>(`/api/consumer/notifications?${p.toString()}`);
}

export function fetchConsumerNotificationsUnreadCount() {
  return apiFetch<{ unread: number }>('/api/consumer/notifications/unread-count');
}

export function markConsumerNotificationRead(notificationId: string) {
  return apiFetch<{ success: boolean; updated: boolean }>(
    `/api/consumer/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: 'POST' },
  );
}

export function markAllConsumerNotificationsRead() {
  return apiFetch<{ success: boolean; updated: number }>('/api/consumer/notifications', {
    method: 'POST',
  });
}
