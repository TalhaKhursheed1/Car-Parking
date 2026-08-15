import { serialize } from "cookie";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "parkspace_session";

export function createSessionResponse(
  payload: Record<string, unknown>,
  init?: ResponseInit,
): NextResponse {
  const cookie = serialize(SESSION_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  const response = NextResponse.json(payload, init);
  response.headers.set("Set-Cookie", cookie);
  return response;
}

export function clearSessionResponse(
  body: Record<string, unknown>,
  init?: ResponseInit,
): NextResponse {
  const cookie = serialize(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });

  const response = NextResponse.json(body, init);
  response.headers.set("Set-Cookie", cookie);
  return response;
}

export function getSessionFromRequest<T = Record<string, unknown>>(request: Request): T | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    }),
  );

  const sessionValue = cookies[SESSION_COOKIE];
  if (!sessionValue) return null;

  try {
    return JSON.parse(decodeURIComponent(sessionValue)) as T;
  } catch {
    return null;
  }
}

