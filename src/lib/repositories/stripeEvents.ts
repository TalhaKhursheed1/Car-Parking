import { getDb } from '@/lib/db';

const COLLECTION = 'stripeWebhookEvents';

type StripeEventDoc = {
  _id: string;
  receivedAt: Date;
};

export async function tryClaimStripeWebhookEvent(eventId: string): Promise<boolean> {
  const db = await getDb();
  try {
    await db.collection<StripeEventDoc>(COLLECTION).insertOne({
      _id: eventId,
      receivedAt: new Date(),
    });
    return true;
  } catch (err: unknown) {
    const code = typeof err === 'object' && err !== null && 'code' in err ? (err as { code: number }).code : 0;
    if (code === 11000) return false;
    throw err;
  }
}

/** If handler throws after claim, release so Stripe retries can be processed. */
export async function releaseStripeWebhookEventClaim(eventId: string): Promise<void> {
  const db = await getDb();
  await db.collection<StripeEventDoc>(COLLECTION).deleteOne({ _id: eventId });
}
