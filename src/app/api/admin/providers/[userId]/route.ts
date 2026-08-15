import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getSessionFromRequest } from "@/lib/auth/session";
import { updateProviderProfile } from "@/lib/repositories/providerProfiles";
import { recordAdminActivity } from "@/lib/repositories/adminActivities";

const ALLOWED_STATUSES = ["approved", "rejected"] as const;

type StatusPayload = {
  status?: "approved" | "rejected";
  verificationNotes?: string;
};

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const session = getSessionFromRequest<SessionPayload>(request);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { userId } = await context.params;

  let payload: StatusPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { status, verificationNotes } = payload;
  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    await updateProviderProfile(new ObjectId(userId), {
      status,
      verificationNotes,
    });

    await recordAdminActivity({
      type: status === "approved" ? "provider_account_approved" : "provider_account_rejected",
      actorLabel: "Admin",
      actionLabel: status === "approved" ? "Approved provider account" : "Rejected provider account",
      contextLabel: userId,
      status: status === "approved" ? "success" : "warning",
      entityId: userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update provider status", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
