import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { getSessionFromRequest } from '@/lib/auth/session';
import {
  findUserById,
  updateUserPassword,
} from '@/lib/repositories/users';
import { validateChangePasswordInput } from '@/lib/validation/password';

type SessionPayload = {
  user?: { id?: string; role?: string };
};

export async function POST(request: Request) {
  const session = getSessionFromRequest<SessionPayload>(request);
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId || role !== 'provider') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let userObjectId: ObjectId;
  try {
    userObjectId = new ObjectId(userId);
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = validateChangePasswordInput({
    currentPassword: typeof body.currentPassword === 'string' ? body.currentPassword : undefined,
    newPassword: typeof body.newPassword === 'string' ? body.newPassword : undefined,
    confirmPassword: typeof body.confirmPassword === 'string' ? body.confirmPassword : undefined,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error, field: validation.field }, { status: 400 });
  }

  const user = await findUserById(userObjectId.toHexString());
  if (!user || !user._id) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const currentMatches = await verifyPassword(
    validation.value.currentPassword,
    user.passwordHash,
  );
  if (!currentMatches) {
    return NextResponse.json(
      { error: 'Current password is incorrect.', field: 'currentPassword' },
      { status: 400 },
    );
  }

  const newHash = await hashPassword(validation.value.newPassword);
  await updateUserPassword(user._id, newHash);

  return NextResponse.json({ ok: true });
}
