import { NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/auth/session";
import { findUserById } from "@/lib/repositories/users";

type SessionPayload = {
  user?: {
    id?: string;
  };
};

export async function GET(request: Request) {
  const session = getSessionFromRequest<SessionPayload>(request);

  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let user = null;
  try {
    user = await findUserById(userId);
  } catch (error) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json(
    {
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
    },
    { status: 200 },
  );
}

