import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { listReviewsBySpaceId } from '@/lib/repositories/reviews';
import { findUsersByIds } from '@/lib/repositories/users';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const reviews = await listReviewsBySpaceId(id, 100);
    const consumerIds = [...new Set(reviews.map((r) => r.consumerId.toString()))]
      .map((value) => {
        try {
          return new ObjectId(value);
        } catch {
          return null;
        }
      })
      .filter((value): value is ObjectId => value !== null);
    const consumers = await findUsersByIds(consumerIds);
    const nameById = new Map(consumers.map((u) => [u._id!.toString(), u.fullName]));

    const data = reviews.map((r) => ({
      id: r._id!.toString(),
      bookingId: r.bookingId.toString(),
      spaceId: r.spaceId.toString(),
      consumerId: r.consumerId.toString(),
      consumerName: nameById.get(r.consumerId.toString()) ?? 'Consumer',
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error(`Failed to load reviews for space ${id}`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
