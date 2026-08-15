import { ObjectId } from 'mongodb';

import { createConsumerNotification } from '@/lib/repositories/notifications';

function label(spaceTitle: string | null | undefined): string {
  return (spaceTitle && spaceTitle.trim()) || 'your parking space';
}

export async function notifyBookingCreatedPendingPayment(params: {
  bookingId: string;
  consumerId: ObjectId;
  spaceTitle?: string | null;
}): Promise<void> {
  const title = 'Booking created';
  const message = `Your booking for ${label(params.spaceTitle)} is pending payment. Complete checkout within 10 minutes.`;
  await createConsumerNotification({
    userId: params.consumerId,
    bookingId: params.bookingId,
    type: 'booking_created_pending_payment',
    title,
    message,
    dedupeKey: `booking_created:${params.bookingId}`,
  });
}

export async function notifyBookingConfirmed(params: {
  bookingId: string;
  consumerId: ObjectId;
  spaceTitle?: string | null;
}): Promise<void> {
  await createConsumerNotification({
    userId: params.consumerId,
    bookingId: params.bookingId,
    type: 'booking_confirmed',
    title: 'Booking confirmed',
    message: `Payment received for ${label(params.spaceTitle)}. Your booking is now confirmed.`,
    dedupeKey: `booking_confirmed:${params.bookingId}`,
  });
}

export async function notifyBookingCancelled(params: {
  bookingId: string;
  consumerId: ObjectId;
  spaceTitle?: string | null;
  reason?: 'consumer' | 'system_expired';
}): Promise<void> {
  const reasonText =
    params.reason === 'system_expired'
      ? 'The payment window ended before payment.'
      : 'The booking has been cancelled.';
  await createConsumerNotification({
    userId: params.consumerId,
    bookingId: params.bookingId,
    type: params.reason === 'system_expired' ? 'payment_expired' : 'booking_cancelled',
    title: params.reason === 'system_expired' ? 'Payment window ended' : 'Booking cancelled',
    message: `${reasonText} ${label(params.spaceTitle)} is no longer reserved.`,
    dedupeKey:
      params.reason === 'system_expired'
        ? `booking_expired:${params.bookingId}`
        : `booking_cancelled:${params.bookingId}`,
  });
}
