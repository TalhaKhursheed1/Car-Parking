import { NextResponse } from 'next/server';

import { checkSlotAvailability } from '@/lib/repositories/bookings';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: spaceId } = await context.params;
  const { searchParams } = new URL(request.url);
  const startRaw = searchParams.get('startAt');
  const endRaw = searchParams.get('endAt');

  if (!startRaw || !endRaw) {
    return NextResponse.json(
      { error: 'Query parameters startAt and endAt (ISO strings) are required' },
      { status: 400 },
    );
  }

  const startAt = new Date(startRaw);
  const endAt = new Date(endRaw);
  if (Number.isNaN(+startAt) || Number.isNaN(+endAt)) {
    return NextResponse.json({ error: 'startAt and endAt must be valid ISO date strings' }, { status: 400 });
  }

  try {
    const outcome = await checkSlotAvailability({ spaceId, startAt, endAt });

    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }

    const { result } = outcome;
    if (result.available) {
      return NextResponse.json({
        available: true,
        estimatedTotal: result.estimatedTotal,
        currency: result.currency,
        capacity: result.capacity,
        bookedUnits: result.bookedUnits,
        spotsRemaining: result.spotsRemaining,
      });
    }

    return NextResponse.json({
      available: false,
      reason: result.reason,
    });
  } catch (error) {
    console.error(`Availability check failed for space ${spaceId}`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
