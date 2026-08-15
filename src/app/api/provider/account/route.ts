import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { verifyPassword } from '@/lib/auth/password';
import {
  createSessionResponse,
  getSessionFromRequest,
} from '@/lib/auth/session';
import {
  findUserByEmail,
  findUserById,
  updateUserAccount,
} from '@/lib/repositories/users';
import { isValidEmail } from '@/lib/validation/registerForm';

type SessionPayload = {
  user?: { id?: string; role?: string; email?: string; fullName?: string };
};

/**
 * Updates the provider's user-level account info (full name / email).
 * Email changes require the current password to defeat session-hijack
 * attempts and we issue a fresh session cookie so the new email is
 * reflected immediately on the client.
 */
export async function PATCH(request: Request) {
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

  const rawFullName = typeof body.fullName === 'string' ? body.fullName.trim() : undefined;
  const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined;
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';

  if (rawFullName === undefined && rawEmail === undefined) {
    return NextResponse.json(
      { error: 'Provide fullName or email to update.' },
      { status: 400 },
    );
  }

  if (rawFullName !== undefined && rawFullName.length < 2) {
    return NextResponse.json(
      { error: 'Full name must be at least 2 characters.', field: 'fullName' },
      { status: 400 },
    );
  }
  if (rawEmail !== undefined && !isValidEmail(rawEmail)) {
    return NextResponse.json(
      { error: 'Email address is invalid.', field: 'email' },
      { status: 400 },
    );
  }

  const user = await findUserById(userObjectId.toHexString());
  if (!user || !user._id) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const emailChanging = rawEmail !== undefined && rawEmail !== user.email;
  if (emailChanging) {
    if (!currentPassword) {
      return NextResponse.json(
        {
          error: 'Current password is required to change your email.',
          field: 'currentPassword',
        },
        { status: 400 },
      );
    }
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: 'Current password is incorrect.', field: 'currentPassword' },
        { status: 400 },
      );
    }
    const existing = await findUserByEmail(rawEmail!);
    if (existing && existing._id?.toHexString() !== user._id.toHexString()) {
      return NextResponse.json(
        { error: 'Another account already uses this email.', field: 'email' },
        { status: 409 },
      );
    }
  }

  const updates: { fullName?: string; email?: string } = {};
  if (rawFullName !== undefined && rawFullName !== user.fullName) {
    updates.fullName = rawFullName;
  }
  if (emailChanging) {
    updates.email = rawEmail!;
  }

  if (!updates.fullName && !updates.email) {
    return NextResponse.json({
      user: {
        id: user._id.toHexString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
      changed: false,
    });
  }

  const refreshed = await updateUserAccount(user._id, updates);
  if (!refreshed || !refreshed._id) {
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
  }

  // Refresh the session cookie so the new email is reflected on the
  // next request without forcing a re-login.
  return createSessionResponse(
    {
      user: {
        id: refreshed._id.toHexString(),
        fullName: refreshed.fullName,
        email: refreshed.email,
        role: refreshed.role,
      },
      changed: true,
    },
    { status: 200 },
  );
}
