'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchConsumerNotifications,
  fetchConsumerNotificationsUnreadCount,
  markAllConsumerNotificationsRead,
  markConsumerNotificationRead,
} from './api';

export const CONSUMER_NOTIFICATIONS_KEY = ['consumer-notifications'];
export const CONSUMER_NOTIFICATIONS_UNREAD_KEY = ['consumer-notifications-unread-count'];

export function useConsumerNotifications(enabled: boolean, limit = 50) {
  return useQuery({
    queryKey: [...CONSUMER_NOTIFICATIONS_KEY, limit],
    queryFn: async () => {
      const res = await fetchConsumerNotifications(limit);
      return res.data;
    },
    enabled,
    retry: false,
    refetchOnWindowFocus: true,
  });
}

export function useConsumerNotificationsUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: CONSUMER_NOTIFICATIONS_UNREAD_KEY,
    queryFn: async () => {
      const res = await fetchConsumerNotificationsUnreadCount();
      return res.unread;
    },
    enabled,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: enabled ? 45_000 : false,
  });
}

export function useMarkConsumerNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => markConsumerNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONSUMER_NOTIFICATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: CONSUMER_NOTIFICATIONS_UNREAD_KEY });
    },
  });
}

export function useMarkAllConsumerNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllConsumerNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONSUMER_NOTIFICATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: CONSUMER_NOTIFICATIONS_UNREAD_KEY });
    },
  });
}
