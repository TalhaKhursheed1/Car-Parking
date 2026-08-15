import { NextResponse } from "next/server";

import { verifyPassword } from "@/lib/auth/password";
import { createSessionResponse } from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/repositories/users";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  let payload: LoginBody;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, password } = payload;

  if (!email || !password) {
    return NextResponse.json(
      { error: "email and password are required" },
      { status: 400 },
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return NextResponse.json(
      { error: "email cannot be empty" },
      { status: 400 },
    );
  }

  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  return createSessionResponse(
    {
      user: {
        id: user._id?.toString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    },
    { status: 200 },
  );
}

