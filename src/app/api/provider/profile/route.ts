import { NextResponse } from "next/server";
import { ObjectId, type WithId } from "mongodb";

import { getSessionFromRequest } from "@/lib/auth/session";
import {
  findProviderProfileByUserId,
  updateProviderProfile,
  type ProviderProfile,
} from "@/lib/repositories/providerProfiles";
import { findUserById } from "@/lib/repositories/users";
import { isValidPhoneDigits } from "@/lib/validation/registerForm";

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

function serializeProfile(profile: WithId<ProviderProfile>, email: string | null) {
  const chargesEnabled = profile.stripeConnectChargesEnabled === true;
  const detailsSubmitted = profile.stripeConnectDetailsSubmitted === true;
  return {
    id: profile._id?.toString() || null,
    userId: profile.userId.toString(),
    email,
    businessName: profile.businessName,
    contactName: profile.contactName,
    phone: profile.phone,
    address: profile.address,
    city: profile.city,
    state: profile.state,
    zipCode: profile.zipCode,
    taxId: profile.taxId,
    bankAccountLast4: profile.bankAccountLast4,
    status: profile.status,
    businessType: profile.businessType,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    stripeConnect: {
      hasAccount: Boolean(profile.stripeConnectAccountId),
      chargesEnabled,
      payoutsEnabled: profile.stripeConnectPayoutsEnabled === true,
      detailsSubmitted,
      readyForPayments: chargesEnabled && detailsSubmitted,
    },
    banking: {
      brand: profile.stripeBankBrand ?? null,
      last4: profile.stripeBankLast4 ?? profile.bankAccountLast4 ?? null,
      currency: profile.stripeBankCurrency ?? null,
      country: profile.stripeBankCountry ?? null,
      syncedAt: profile.stripeBankSyncedAt
        ? profile.stripeBankSyncedAt.toISOString()
        : null,
    },
  };
}

export async function GET(request: Request) {
  const session = getSessionFromRequest<SessionPayload>(request);
  const userId = session?.user?.id;
  const role = session?.user?.role;

  if (!userId || role !== "provider") {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const userObjectId = new ObjectId(userId);
    const [profile, user] = await Promise.all([
      findProviderProfileByUserId(userObjectId),
      findUserById(userId),
    ]);

    if (!profile) {
      return NextResponse.json(
        { error: "Provider profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { profile: serializeProfile(profile, user?.email ?? null) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to load provider profile", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

type UpdateProfileBody = {
  businessName?: string;
  contactName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  taxId?: string;
  businessType?: 'individual' | 'company';
};

export async function PATCH(request: Request) {
  const session = getSessionFromRequest<SessionPayload>(request);
  const userId = session?.user?.id;
  const role = session?.user?.role;

  if (!userId || role !== "provider") {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let payload: UpdateProfileBody;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Light-weight server-side validation so the client can't push values
  // that would round-trip as broken data (phone, business type).
  if (payload.phone !== undefined) {
    const trimmed = payload.phone.trim();
    if (trimmed && !isValidPhoneDigits(trimmed)) {
      return NextResponse.json(
        { error: 'Phone must be 10-15 digits only.', field: 'phone' },
        { status: 400 },
      );
    }
  }
  if (
    payload.businessType !== undefined &&
    payload.businessType !== 'individual' &&
    payload.businessType !== 'company'
  ) {
    return NextResponse.json(
      { error: "businessType must be either 'individual' or 'company'.", field: 'businessType' },
      { status: 400 },
    );
  }

  try {
    const userObjectId = new ObjectId(userId);
    const profile = await findProviderProfileByUserId(userObjectId);
    if (!profile) {
      return NextResponse.json(
        { error: "Provider profile not found" },
        { status: 404 },
      );
    }

    const updates: UpdateProfileBody = {};
    if (payload.businessName !== undefined) updates.businessName = payload.businessName.trim() || undefined;
    if (payload.contactName !== undefined) updates.contactName = payload.contactName.trim() || undefined;
    if (payload.phone !== undefined) updates.phone = payload.phone.trim() || undefined;
    if (payload.address !== undefined) updates.address = payload.address.trim() || undefined;
    if (payload.city !== undefined) updates.city = payload.city.trim() || undefined;
    if (payload.state !== undefined) updates.state = payload.state.trim() || undefined;
    if (payload.zipCode !== undefined) updates.zipCode = payload.zipCode.trim() || undefined;
    if (payload.taxId !== undefined) updates.taxId = payload.taxId.trim() || undefined;
    if (payload.businessType !== undefined) updates.businessType = payload.businessType;

    await updateProviderProfile(userObjectId, updates);

    const [updatedProfile, user] = await Promise.all([
      findProviderProfileByUserId(userObjectId),
      findUserById(userId),
    ]);

    if (!updatedProfile) {
      return NextResponse.json(
        { error: "Failed to retrieve updated profile" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { profile: serializeProfile(updatedProfile, user?.email ?? null) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to update provider profile", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
