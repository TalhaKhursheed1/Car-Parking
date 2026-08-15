import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { platformFeeAudDollars } from '@/lib/stripe/fees';
import {
  ensureBookingInvoiceNumberPersisted,
  findBookingById,
} from '@/lib/repositories/bookings';
import { findSpaceById } from '@/lib/repositories/spaces';
import { findUserById } from '@/lib/repositories/users';
import { findProviderProfileByUserId } from '@/lib/repositories/providerProfiles';
import { buildConsumerInvoicePdfBuffer } from '@/lib/invoices/buildConsumerInvoicePdf';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

export async function GET(
  req: Request,
  context: { params: Promise<{ bookingId: string }> },
) {
  const session = getSessionFromRequest<SessionPayload>(req);
  const userId = session?.user?.id;
  const role = session?.user?.role;

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (role !== 'consumer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let consumerObjectId: ObjectId;
  try {
    consumerObjectId = new ObjectId(userId);
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const { bookingId } = await context.params;
  const booking = await findBookingById(bookingId);
  if (!booking || !booking.consumerId.equals(consumerObjectId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (booking.status !== 'confirmed') {
    return NextResponse.json({ error: 'Invoice available after payment is confirmed' }, { status: 409 });
  }

  const invoiceNumber = await ensureBookingInvoiceNumberPersisted(bookingId);
  if (!invoiceNumber) {
    return NextResponse.json({ error: 'Could not prepare invoice' }, { status: 500 });
  }

  const [consumer, space, providerProfile] = await Promise.all([
    findUserById(booking.consumerId.toHexString()),
    findSpaceById(booking.spaceId.toHexString()),
    findProviderProfileByUserId(booking.providerId),
  ]);

  if (!consumer) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
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

  try {
    const pdfBuffer = await buildConsumerInvoicePdfBuffer({
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

    const safeName = invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Consumer invoice PDF failed', bookingId, error);
    return NextResponse.json({ error: 'Could not generate invoice' }, { status: 500 });
  }
}
