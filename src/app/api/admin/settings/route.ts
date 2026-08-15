import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { getSystemSettings, updateSystemSettings } from '@/lib/repositories/systemSettings';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

type PatchBody = Partial<{
  siteName: string;
  maxBookingDays: number;
  maintenanceMode: boolean;
  autoApproveSpaces: boolean;
}>;

function requireAdmin(request: Request): { adminId: ObjectId } | NextResponse {
  const session = getSessionFromRequest<SessionPayload>(request);
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  try {
    return { adminId: new ObjectId(session.user.id) };
  } catch {
    return NextResponse.json({ error: 'Invalid admin id' }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const settings = await getSystemSettings();
  return NextResponse.json({
    settings: {
      siteName: settings.siteName,
      maxBookingDays: settings.maxBookingDays,
      maintenanceMode: settings.maintenanceMode,
      autoApproveSpaces: settings.autoApproveSpaces,
      updatedAt: settings.updatedAt.toISOString(),
      updatedBy: settings.updatedBy?.toString() ?? null,
    },
  });
}

export async function PATCH(request: Request) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const patch: PatchBody = {};
  if (body.siteName !== undefined) {
    if (typeof body.siteName !== 'string') {
      return NextResponse.json({ error: 'siteName must be a string' }, { status: 400 });
    }
    patch.siteName = body.siteName;
  }
  if (body.maxBookingDays !== undefined) {
    if (typeof body.maxBookingDays !== 'number' || !Number.isFinite(body.maxBookingDays)) {
      return NextResponse.json({ error: 'maxBookingDays must be a number' }, { status: 400 });
    }
    patch.maxBookingDays = body.maxBookingDays;
  }
  if (body.maintenanceMode !== undefined) {
    if (typeof body.maintenanceMode !== 'boolean') {
      return NextResponse.json({ error: 'maintenanceMode must be a boolean' }, { status: 400 });
    }
    patch.maintenanceMode = body.maintenanceMode;
  }
  if (body.autoApproveSpaces !== undefined) {
    if (typeof body.autoApproveSpaces !== 'boolean') {
      return NextResponse.json({ error: 'autoApproveSpaces must be a boolean' }, { status: 400 });
    }
    patch.autoApproveSpaces = body.autoApproveSpaces;
  }

  const settings = await updateSystemSettings(patch, auth.adminId);
  return NextResponse.json({
    settings: {
      siteName: settings.siteName,
      maxBookingDays: settings.maxBookingDays,
      maintenanceMode: settings.maintenanceMode,
      autoApproveSpaces: settings.autoApproveSpaces,
      updatedAt: settings.updatedAt.toISOString(),
      updatedBy: settings.updatedBy?.toString() ?? null,
    },
  });
}
