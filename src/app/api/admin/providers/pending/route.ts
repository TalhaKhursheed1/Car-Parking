import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getSessionFromRequest } from "@/lib/auth/session";
import { listProviderProfilesByStatus } from "@/lib/repositories/providerProfiles";
import { findUserById } from "@/lib/repositories/users";

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

export async function GET(request: Request) {
  const session = getSessionFromRequest<SessionPayload>(request);
  const userRole = session?.user?.role;

  if (!session?.user?.id || userRole !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const pendingProfiles = await listProviderProfilesByStatus("pending");

    const enrichedProfiles = await Promise.all(
      pendingProfiles.map(async (profile) => {
        const userDoc = await findUserById(profile.userId.toString());

        return {
          profile: {
            id: profile._id?.toString() || null,
            userId: profile.userId.toString(),
            businessName: profile.businessName,
            contactName: profile.contactName,
            phone: profile.phone,
            address: profile.address,
            city: profile.city,
            state: profile.state,
            zipCode: profile.zipCode,
            taxId: profile.taxId,
            bankAccountLast4: profile.bankAccountLast4,
            businessType: profile.businessType,
            status: profile.status,
            createdAt: profile.createdAt.toISOString(),
            updatedAt: profile.updatedAt.toISOString(),
          },
          user: userDoc
            ? {
                id: userDoc._id.toString(),
                fullName: userDoc.fullName,
                email: userDoc.email,
              }
            : null,
        };
      }),
    );

    return NextResponse.json({ providers: enrichedProfiles });
  } catch (error) {
    console.error("Failed to load pending providers", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
