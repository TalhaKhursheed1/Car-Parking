import { platformFeeAudDollars } from '@/lib/stripe/fees';
import { sendConsumerInvoiceEmail } from '@/lib/email/sendConsumerInvoiceEmail';
import {
  ensureBookingInvoiceGeneratedTimestamp,
  ensureBookingInvoiceNumberPersisted,
  findBookingById,
  markBookingInvoiceEmailSent,
  setBookingInvoiceEmailError,
} from '@/lib/repositories/bookings';
import { findSpaceById } from '@/lib/repositories/spaces';
import { findUserById } from '@/lib/repositories/users';
import { findProviderProfileByUserId } from '@/lib/repositories/providerProfiles';
import { buildConsumerInvoicePdfBuffer } from '@/lib/invoices/buildConsumerInvoicePdf';

/**
 * After Stripe confirms payment: generate invoice PDF, persist timestamps, email consumer.
 * Idempotent: skips email when invoiceEmailSentAt already set; safe on Stripe webhook retries.
 */
export async function finalizeConsumerBookingInvoice(bookingId: string): Promise<void> {
  const booking = await findBookingById(bookingId);
  if (!booking || booking.status !== 'confirmed') {
    return;
  }

  if (booking.invoiceEmailSentAt) {
    return;
  }

  const invoiceNumber = await ensureBookingInvoiceNumberPersisted(bookingId);
  if (!invoiceNumber) {
    console.warn('[invoice] could not assign invoice number', bookingId);
    return;
  }

  const [consumer, space, providerProfile] = await Promise.all([
    findUserById(booking.consumerId.toHexString()),
    findSpaceById(booking.spaceId.toHexString()),
    findProviderProfileByUserId(booking.providerId),
  ]);

  if (!consumer?.email) {
    console.warn('[invoice] consumer email missing', bookingId);
    await setBookingInvoiceEmailError(bookingId, 'Consumer email missing');
    return;
  }

  const providerLabel =
    providerProfile?.businessName?.trim() ||
    providerProfile?.contactName?.trim() ||
    'Parking provider';

  const platformFee =
    booking.platformFeeAmount != null && Number.isFinite(booking.platformFeeAmount)
      ? booking.platformFeeAmount
      : platformFeeAudDollars(booking.totalAmount);

  const addressParts = [space?.address, space?.city, space?.state, space?.zipCode].filter(Boolean);
  const spaceAddressLine = addressParts.length ? addressParts.join(', ') : undefined;

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await buildConsumerInvoicePdfBuffer({
      invoiceNumber,
      bookingId,
      paidAtIso: booking.updatedAt.toISOString(),
      rentalStartIso: booking.startAt.toISOString(),
      rentalEndIso: booking.endAt.toISOString(),
      consumerName: consumer.fullName?.trim() || 'Customer',
      consumerEmail: consumer.email,
      providerLabel,
      spaceTitle: space?.title?.trim() || 'Parking space',
      spaceAddressLine,
      totalAmount: booking.totalAmount,
      currency: booking.currency || 'AUD',
      platformFeeAmount: platformFee,
      stripeCheckoutSessionId: booking.stripeCheckoutSessionId ?? null,
    });
  } catch (err) {
    console.error('[invoice] PDF generation failed', bookingId, err);
    throw err;
  }

  await ensureBookingInvoiceGeneratedTimestamp(bookingId);

  const firstName = consumer.fullName?.trim()?.split(/\s+/)[0] || 'there';
  const sendResult = await sendConsumerInvoiceEmail({
    to: consumer.email,
    invoiceNumber,
    consumerFirstName: firstName,
    pdfBuffer,
    bookingId,
  });

  if (sendResult.ok) {
    await markBookingInvoiceEmailSent(bookingId);
  } else {
    console.warn('[invoice] email not sent', bookingId, sendResult.message);
    await setBookingInvoiceEmailError(bookingId, sendResult.message);
  }
}
