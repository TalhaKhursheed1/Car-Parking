import { NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/auth/session";
import { countUsers } from "@/lib/repositories/users";

type SessionPayload = {
  user?: {
    id?: string;
    role?: string;
  };
};

export async function GET(request: Request) {
  const session = getSessionFromRequest<SessionPayload>(request);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const total = await countUsers();
    return NextResponse.json({ total });
  } catch (error) {
    console.error("Failed to count users", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
