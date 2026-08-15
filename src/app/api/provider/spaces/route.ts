import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getSessionFromRequest } from '@/lib/auth/session';
import {
  createSpace,
  ensureSpaceIndexes,
  listSpacesByProvider,
  Space,
} from '@/lib/repositories/spaces';
import { isValidPersonOrPlaceName } from '@/lib/validation/registerForm';
import {
  isValidNumericPostcode,
  isValidSpaceTitle,
  isValidStateField,
} from '@/lib/validation/spaceForm';
import {
  requireStripeConnectReadyForSpaceCreation as defaultRequireStripeConnectForSpace,
} from '@/lib/provider/stripeConnectSpaceGate';
import { getSystemSettings } from '@/lib/repositories/systemSettings';
import { recordAdminActivity } from '@/lib/repositories/adminActivities';

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

type CreateSpaceBody = Partial<{
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

type SpaceSummary = {
  id: string;
  title: string;
  city?: string;
  state?: string;
  hourlyRate: number;
  dailyRate?: number;
  currency: string;
  status: Space['status'];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  images: string[];
};

const MIN_IMAGES = 2;

/** Provider-created spaces are always 24/7, single vehicle, no custom schedule. */
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

type SessionResolver = (request: Request) => SessionPayload | null | undefined;

function requireProviderSession(
  request: Request,
  resolveSession: SessionResolver = getSessionFromRequest,
): { providerId: ObjectId } | ApiResponse<never> {
  const session = resolveSession(request);

  if (!session?.user?.id || session.user.role !== 'provider') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  try {
    return { providerId: new ObjectId(session.user.id) };
  } catch {
    return NextResponse.json({ error: 'Invalid provider id' }, { status: 400 });
  }
}

function serializeSpace(space: Space): SpaceSummary {
  return {
    id: space._id?.toString() ?? '',
    title: space.title,
    city: space.city,
    state: space.state,
    hourlyRate: space.hourlyRate,
    dailyRate: space.dailyRate,
    currency: space.currency,
    status: space.status,
    isActive: space.isActive,
    createdAt: space.createdAt.toISOString(),
    updatedAt: space.updatedAt.toISOString(),
    images: space.images ?? [],
  };
}

export async function GET(request: Request): Promise<ApiResponse<SpaceSummary[]>> {
  const sessionResult = requireProviderSession(request);
  if (sessionResult instanceof NextResponse) {
    return sessionResult;
  }

  try {
    await ensureSpaceIndexes();
    const spaces = await listSpacesByProvider(sessionResult.providerId);
    const visibleSpaces = spaces.filter((space) => space.status !== 'archived');
    return NextResponse.json({ data: visibleSpaces.map(serializeSpace) });
  } catch (error) {
    console.error('Failed to list provider spaces', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

type CreateSpaceDependencies = {
  getSessionFromRequest: SessionResolver;
  ensureSpaceIndexes: typeof ensureSpaceIndexes;
  createSpace: typeof createSpace;
  /** Optional override for tests. */
  requireStripeConnectReadyForSpaceCreation?: (
    providerId: ObjectId,
  ) => Promise<NextResponse | null>;
};

export function createProviderSpacesPostHandler({
  getSessionFromRequest: sessionResolver,
  ensureSpaceIndexes: ensureIndexes,
  createSpace: createSpaceFn,
  requireStripeConnectReadyForSpaceCreation: stripeConnectGate = defaultRequireStripeConnectForSpace,
}: CreateSpaceDependencies) {
  return async function POST(request: Request): Promise<ApiResponse<SpaceSummary>> {
    const sessionResult = requireProviderSession(request, sessionResolver);
  if (sessionResult instanceof NextResponse) {
    return sessionResult;
  }

  const connectGate = await stripeConnectGate(sessionResult.providerId);
  if (connectGate) {
    return connectGate as ApiResponse<SpaceSummary>;
  }

  let payload: CreateSpaceBody;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

    const title = payload.title?.trim();
    if (!title) {
      return badRequest('Title is required');
    }
    if (!isValidSpaceTitle(title)) {
      return badRequest('Title must be 2-120 characters');
    }
    if (typeof payload.hourlyRate !== 'number' || payload.hourlyRate <= 0) {
      return badRequest('Hourly rate must be greater than zero');
    }

    const address = payload.address?.trim();
    if (!address) {
      return badRequest('Street address is required');
    }
    if (address.length < 5) {
      return badRequest('Street address must be at least 5 characters');
    }

    const city = payload.city?.trim();
    if (!city) {
      return badRequest('City is required');
    }
    if (!isValidPersonOrPlaceName(city)) {
      return badRequest('City must be 2-50 letters (spaces, hyphens, apostrophes allowed)');
    }

    const state = payload.state?.trim();
    if (!state) {
      return badRequest('State is required');
    }
    if (!isValidStateField(state)) {
      return badRequest('State must be 2-50 characters');
    }

    const zipCode = payload.zipCode?.trim();
    if (zipCode && !isValidNumericPostcode(zipCode)) {
      return badRequest('Postcode must be 4-10 digits only');
    }

    const description = payload.description?.trim();
    if (!description) {
      return badRequest('Description is required');
    }

    if (payload.dailyRate !== undefined && payload.dailyRate !== null) {
      if (typeof payload.dailyRate !== 'number' || payload.dailyRate <= 0) {
        return badRequest('Daily rate must be greater than zero');
      }
    }

    const images = sanitizeImages(payload.images);
    if (images.length < MIN_IMAGES) {
      return badRequest('Please upload at least two images of the space.');
    }

    const amenities = sanitizeStringArray(payload.amenities);
    const systemSettings = await getSystemSettings();
    if (systemSettings.maintenanceMode) {
      return NextResponse.json(
        { error: 'Listing updates are temporarily unavailable while maintenance is in progress.' },
        { status: 503 },
      );
    }

    const coordinates =
      payload.latitude !== undefined && payload.longitude !== undefined
        ? {
            type: 'Point' as const,
            coordinates: [payload.longitude, payload.latitude] as [number, number],
          }
        : undefined;

    try {
      await ensureIndexes();
      const created = await createSpaceFn({
      providerId: sessionResult.providerId,
        title,
      description,
        address,
        city,
      state,
      zipCode: zipCode || undefined,
        coordinates,
      hourlyRate: payload.hourlyRate,
      dailyRate: payload.dailyRate,
        currency: (payload.currency ?? 'AUD').toUpperCase(),
        capacity: PROVIDER_SPACE_CAPACITY,
        amenities,
        images,
        availabilityType: PROVIDER_SPACE_AVAILABILITY,
        customAvailability: [],
      isActive: payload.isActive ?? false,
      status: systemSettings.autoApproveSpaces ? 'approved' : 'pending',
      verificationNotes: null,
      ratingAverage: 0,
      ratingCount: 0,
    });

    await recordProviderSpaceCreatedActivity(created._id?.toString() ?? '', created.title);
    return NextResponse.json({ data: serializeSpace(created) }, { status: 201 });
  } catch (error) {
    console.error('Failed to create provider space', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  };
}

async function recordProviderSpaceCreatedActivity(spaceId: string, title: string): Promise<void> {
  try {
    await recordAdminActivity({
      type: 'provider_space_created',
      actorLabel: 'Provider',
      actionLabel: 'Added a new space listing',
      contextLabel: title,
      status: 'info',
      entityId: spaceId,
    });
  } catch (error) {
    console.warn('[admin_activity] provider_space_created failed', error);
  }
}

export const POST = createProviderSpacesPostHandler({
  getSessionFromRequest,
  ensureSpaceIndexes,
  createSpace,
});
