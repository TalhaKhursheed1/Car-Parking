import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { listSpacesForAdmin, type AdminSpaceFilters } from '@/lib/repositories/spaces';
import { findUserById } from '@/lib/repositories/users';
import { findProviderProfileByUserId } from '@/lib/repositories/providerProfiles';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
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

export async function GET(request: Request) {
  const session = requireAdminSession(request);
  if (session instanceof NextResponse) {
    return session;
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const page = Math.max(Number(searchParams.get('page')) || 1, 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize')) || 20, 1), 100);
  const statusParam = searchParams.get('status');
  const status: AdminSpaceFilters['status'] =
    statusParam === 'approved' || statusParam === 'archived' ? statusParam : undefined;
  const filters: AdminSpaceFilters = {
    status,
    city: searchParams.get('city')?.trim() || undefined,
    state: searchParams.get('state')?.trim() || undefined,
    isActive:
      searchParams.get('isActive') === 'true'
        ? true
        : searchParams.get('isActive') === 'false'
          ? false
          : undefined,
    search: searchParams.get('search')?.trim() || undefined,
    providerQuery: searchParams.get('provider')?.trim() || undefined,
    page,
    pageSize,
  };

  try {
    const { spaces, total } = await listSpacesForAdmin(filters);

    const result = await Promise.all(
      spaces.map(async (space) => {
        const providerUser = await findUserById(space.providerId.toString());
        const profile = await findProviderProfileByUserId(space.providerId);

        return {
          space: {
            id: space._id?.toString() ?? '',
            title: space.title,
            city: space.city,
            state: space.state,
            hourlyRate: space.hourlyRate,
            dailyRate: space.dailyRate ?? null,
            currency: space.currency,
            status: space.status,
            isActive: space.isActive,
            updatedAt: space.updatedAt.toISOString(),
            createdAt: space.createdAt.toISOString(),
            providerBadge: space.providerBadge ?? null,
          },
          provider: providerUser
            ? {
                id: providerUser._id?.toString() ?? '',
                fullName: providerUser.fullName,
                email: providerUser.email,
              }
            : null,
          profile: profile
            ? {
                businessName: profile.businessName ?? '',
                city: profile.city ?? '',
                state: profile.state ?? '',
              }
            : null,
        };
      }),
    );

    return NextResponse.json({
      data: result,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Failed to list admin spaces', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

