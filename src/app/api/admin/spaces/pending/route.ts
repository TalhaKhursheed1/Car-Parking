import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import {
  listSpacesByStatus,
  Space,
} from '@/lib/repositories/spaces';
import { findProviderProfileByUserId } from '@/lib/repositories/providerProfiles';
import { findUserById } from '@/lib/repositories/users';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

type PendingSpaceResponse = {
  spaces: Array<{
    space: {
      id: string;
      title: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      hourlyRate: number;
      dailyRate?: number;
      currency: string;
      amenities: string[];
      status: Space['status'];
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
      verificationNotes?: string | null;
    };
    provider: {
      id: string;
      fullName: string;
      email: string;
    } | null;
    profile: {
      businessName?: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    } | null;
  }>;
};

function requireAdminSession(request: Request): { adminId: ObjectId } | NextResponse<{ error: string }> {
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

export async function GET(request: Request): Promise<NextResponse<PendingSpaceResponse | { error: string }>> {
  const sessionResult = requireAdminSession(request);
  if (sessionResult instanceof NextResponse) {
    return sessionResult;
  }

  try {
    const pendingSpaces = await listSpacesByStatus('pending');

    const spacesWithProvider = await Promise.all(
      pendingSpaces.map(async (space) => {
        const providerIdString = space.providerId.toString();

        const providerUser = await findUserById(providerIdString);
        const providerProfile = await findProviderProfileByUserId(space.providerId);

        return {
          space: {
            id: space._id?.toString() ?? '',
            title: space.title,
            address: space.address,
            city: space.city,
            state: space.state,
            zipCode: space.zipCode,
            hourlyRate: space.hourlyRate,
            dailyRate: space.dailyRate,
            currency: space.currency,
            amenities: space.amenities ?? [],
            status: space.status,
            isActive: space.isActive,
            createdAt: space.createdAt.toISOString(),
            updatedAt: space.updatedAt.toISOString(),
            verificationNotes: space.verificationNotes ?? null,
          },
          provider: providerUser
            ? {
                id: providerUser._id.toString(),
                fullName: providerUser.fullName,
                email: providerUser.email,
              }
            : null,
          profile: providerProfile
            ? {
                businessName: providerProfile.businessName,
                phone: providerProfile.phone,
                address: providerProfile.address,
                city: providerProfile.city,
                state: providerProfile.state,
                zipCode: providerProfile.zipCode,
              }
            : null,
        };
      }),
    );

    return NextResponse.json({ spaces: spacesWithProvider });
  } catch (error) {
    console.error('Failed to load pending spaces', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
