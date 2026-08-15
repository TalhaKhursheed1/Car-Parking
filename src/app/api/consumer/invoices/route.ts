import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { listBookingsByConsumer } from '@/lib/repositories/bookings';
import { findSpacesByIds } from '@/lib/repositories/spaces';
import { findProviderProfilesByUserIds } from '@/lib/repositories/providerProfiles';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

export async function GET(req: Request) {
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

  try {
    const bookings = await listBookingsByConsumer(consumerObjectId);
    const confirmed = bookings.filter((b) => b.status === 'confirmed').sort((a, b) => {
      const tb = b.updatedAt.getTime();
      const ta = a.updatedAt.getTime();
      return tb - ta;
    });

    const spaceIds = [...new Set(confirmed.map((b) => b.spaceId.toString()))].map((id) => new ObjectId(id));
    const providerIds = [...new Set(confirmed.map((b) => b.providerId.toString()))].map((id) => new ObjectId(id));

    const [spaces, profiles] = await Promise.all([
      findSpacesByIds(spaceIds),
      findProviderProfilesByUserIds(providerIds),
    ]);

    const spaceTitleById = new Map(spaces.map((s) => [s._id!.toString(), s.title]));
    const providerLabelById = new Map(
      profiles.map((p) => [
        p.userId.toHexString(),
        p.businessName?.trim() || p.contactName?.trim() || 'Provider',
      ]),
    );

    const data = confirmed.map((b) => ({
      bookingId: b._id!.toString(),
      invoiceNumber: b.invoiceNumber ?? null,
      invoiceGeneratedAt: b.invoiceGeneratedAt ? b.invoiceGeneratedAt.toISOString() : null,
      invoiceEmailSentAt: b.invoiceEmailSentAt ? b.invoiceEmailSentAt.toISOString() : null,
      spaceTitle: spaceTitleById.get(b.spaceId.toString()) ?? 'Space',
      providerLabel: providerLabelById.get(b.providerId.toHexString()) ?? 'Provider',
      totalAmount: b.totalAmount,
      currency: b.currency,
      paidAt: (b.invoiceGeneratedAt ?? b.updatedAt).toISOString(),
      rentalStartAt: b.startAt.toISOString(),
      rentalEndAt: b.endAt.toISOString(),
      pdfUrl: `/api/consumer/invoices/${b._id!.toString()}/pdf`,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to list consumer invoices', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
