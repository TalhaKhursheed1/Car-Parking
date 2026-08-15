import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import { findSpaceById, updateSpace, Space } from '@/lib/repositories/spaces';
import { isValidPersonOrPlaceName } from '@/lib/validation/registerForm';
import {
  isValidNumericPostcode,
  isValidSpaceTitle,
  isValidStateField,
} from '@/lib/validation/spaceForm';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

type SessionResolver = (request: Request) => SessionPayload | null | undefined;

type UpdateSpaceBody = Partial<{
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  hourlyRate: number;
  dailyRate: number;
  currency: string;
  capacity: number;
  amenities: string[];
  availabilityType: Space['availabilityType'];
  customAvailability: Space['customAvailability'];
  images: string[];
  isActive: boolean;
}>;

type ApiResponse<T> = NextResponse<{ data?: T; error?: string }>;

type SpaceDetails = {
  id: string;
  title: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  coordinates?: Space['coordinates'];
  hourlyRate: number;
  dailyRate?: number;
  currency: string;
  capacity?: number;
  amenities: string[];
  availabilityType: Space['availabilityType'];
  customAvailability: Space['customAvailability'];
  images: string[];
  isActive: boolean;
  status: Space['status'];
  verificationNotes?: string | null;
  createdAt: string;
  updatedAt: string;
};

const MIN_IMAGES = 2;

const PROVIDER_SPACE_AVAILABILITY: Space['availabilityType'] = '24_7';
const PROVIDER_SPACE_CAPACITY = 1;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function sanitizeStringArray(values?: string[]): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);
}

function sanitizeImages(values?: string[]): string[] {
  return sanitizeStringArray(values);
}

function requireProviderSession(
  request: Request,
  resolveSession: SessionResolver = getSessionFromRequest,
): { providerId: ObjectId } | ApiResponse<never> {
  const session = resolveSession(request) as SessionPayload | null | undefined;

  if (!session?.user?.id || session.user.role !== 'provider') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  try {
    return { providerId: new ObjectId(session.user.id) };
  } catch {
    return NextResponse.json({ error: 'Invalid provider id' }, { status: 400 });
  }
}

function serializeSpace(space: Space): SpaceDetails {
  return {
    id: space._id?.toString() ?? '',
    title: space.title,
    description: space.description,
    address: space.address,
    city: space.city,
    state: space.state,
    zipCode: space.zipCode,
    coordinates: space.coordinates,
    hourlyRate: space.hourlyRate,
    dailyRate: space.dailyRate,
    currency: space.currency,
    capacity: space.capacity,
    amenities: space.amenities ?? [],
    availabilityType: space.availabilityType,
    customAvailability: space.customAvailability ?? [],
    images: space.images ?? [],
    isActive: space.isActive,
    status: space.status,
    verificationNotes: space.verificationNotes ?? null,
    createdAt: space.createdAt.toISOString(),
    updatedAt: space.updatedAt.toISOString(),
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ spaceId: string }> },
): Promise<ApiResponse<SpaceDetails>> {
  const sessionResult = requireProviderSession(request);
  if (sessionResult instanceof NextResponse) {
    return sessionResult;
  }

  const { spaceId } = await context.params;

  try {
    const space = await findSpaceById(spaceId);

    if (!space || !space.providerId.equals(sessionResult.providerId)) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    return NextResponse.json({ data: serializeSpace(space) });
  } catch (error) {
    console.error('Failed to load provider space', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ spaceId: string }> },
): Promise<ApiResponse<SpaceDetails>> {
  const sessionResult = requireProviderSession(request);
  if (sessionResult instanceof NextResponse) {
    return sessionResult;
  }

  const { spaceId } = await context.params;

  let payload: UpdateSpaceBody;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const existing = await findSpaceById(spaceId);
    if (!existing || !existing.providerId.equals(sessionResult.providerId)) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    const title = (payload.title !== undefined ? payload.title.trim() : existing.title) ?? '';
    if (!title) {
      return badRequest('Title is required');
    }
    if (!isValidSpaceTitle(title)) {
      return badRequest('Title must be 2-120 characters');
    }

    const address = (payload.address !== undefined ? payload.address.trim() : existing.address) ?? '';
    if (!address) {
      return badRequest('Street address is required');
    }
    if (address.length < 5) {
      return badRequest('Street address must be at least 5 characters');
    }

    const city = (payload.city !== undefined ? payload.city.trim() : existing.city) ?? '';
    if (!city) {
      return badRequest('City is required');
    }
    if (!isValidPersonOrPlaceName(city)) {
      return badRequest('City must be 2-50 letters (spaces, hyphens, apostrophes allowed)');
    }

    const description =
      payload.description !== undefined
        ? payload.description.trim()
        : (existing.description?.trim() ?? '');
    if (!description) {
      return badRequest('Description is required');
    }

    const state = (payload.state !== undefined ? payload.state.trim() : existing.state) ?? '';
    if (!state) {
      return badRequest('State is required');
    }
    if (!isValidStateField(state)) {
      return badRequest('State must be 2-50 characters');
    }

    const zipCode =
      payload.zipCode !== undefined
        ? payload.zipCode.trim()
        : (existing.zipCode?.trim() ?? '');
    if (zipCode && !isValidNumericPostcode(zipCode)) {
      return badRequest('Postcode must be 4-10 digits only');
    }

    const hourlyRate = payload.hourlyRate ?? existing.hourlyRate;
    if (typeof hourlyRate !== 'number' || hourlyRate <= 0) {
      return badRequest('Hourly rate must be greater than zero');
    }

    const dailyRate = payload.dailyRate ?? existing.dailyRate;
    if (dailyRate !== undefined && dailyRate !== null && dailyRate <= 0) {
      return badRequest('Daily rate must be greater than zero');
    }

    const currency = (payload.currency ?? existing.currency ?? 'AUD').toUpperCase();

    const amenities = payload.amenities ? sanitizeStringArray(payload.amenities) : sanitizeStringArray(existing.amenities);
    const images = payload.images ? sanitizeImages(payload.images) : sanitizeImages(existing.images);
    if (images.length < MIN_IMAGES) {
      return badRequest('Please keep at least two images of the space.');
    }

    const coordinates =
      payload.latitude !== undefined && payload.longitude !== undefined
        ? {
            type: 'Point' as const,
            coordinates: [payload.longitude, payload.latitude] as [number, number],
          }
        : existing.coordinates;

    const updates: Partial<Space> = {
      title,
      description,
      address,
      city,
      state,
      zipCode: zipCode || undefined,
      coordinates,
      hourlyRate,
      dailyRate,
      currency,
      capacity: PROVIDER_SPACE_CAPACITY,
      amenities,
      availabilityType: PROVIDER_SPACE_AVAILABILITY,
      customAvailability: [],
      images,
      isActive: payload.isActive ?? existing.isActive,
    };

    await updateSpace(spaceId, updates);
    const updated = await findSpaceById(spaceId);

    return NextResponse.json({ data: serializeSpace(updated!) });
  } catch (error) {
    console.error('Failed to update provider space', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

type DeleteDependencies = {
  getSessionFromRequest: SessionResolver;
  findSpaceById: typeof findSpaceById;
  updateSpace: typeof updateSpace;
};

export function createProviderSpaceDeleteHandler({
  getSessionFromRequest: sessionResolver,
  findSpaceById: findSpaceByIdFn,
  updateSpace: updateSpaceFn,
}: DeleteDependencies) {
  return async function DELETE(
    request: Request,
    context: { params: Promise<{ spaceId: string }> },
  ) {
    const sessionResult = requireProviderSession(request, sessionResolver);
    if (sessionResult instanceof NextResponse) {
      return sessionResult;
    }

    const { spaceId } = await context.params;

    try {
      const space = await findSpaceByIdFn(spaceId);
      if (!space || !space.providerId.equals(sessionResult.providerId)) {
        return NextResponse.json({ error: 'Space not found' }, { status: 404 });
      }

      await updateSpaceFn(spaceId, {
        status: 'archived',
        isActive: false,
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Failed to delete provider space', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

export const DELETE = createProviderSpaceDeleteHandler({
  getSessionFromRequest,
  findSpaceById,
  updateSpace,
});
