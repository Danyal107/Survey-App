import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  adminNotConfiguredResponse,
  createAdminSessionToken,
  verifyAdminPassword,
} from "@/lib/adminAuth";

export async function POST(req: Request) {
  const configured = process.env.ADMIN_PASSWORD;
  if (typeof configured !== "string" || configured.length < 8) {
    return adminNotConfiguredResponse();
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const password =
    body &&
    typeof body === "object" &&
    "password" in body &&
    typeof (body as { password: unknown }).password === "string"
      ? (body as { password: string }).password
      : undefined;

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const token = createAdminSessionToken();
  if (!token) {
    return NextResponse.json(
      { error: "Could not create session. Set ADMIN_SESSION_SECRET or ADMIN_PASSWORD." },
      { status: 500 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return res;
}
