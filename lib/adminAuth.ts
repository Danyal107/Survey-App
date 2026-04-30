import crypto from "crypto";
import { NextResponse } from "next/server";

export const ADMIN_COOKIE_NAME = "survey_admin_session";

const SESSION_MS = 8 * 60 * 60 * 1000;

function sessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    ""
  ).trim();
}

export function isAdminPasswordConfigured(): boolean {
  const p = process.env.ADMIN_PASSWORD;
  return typeof p === "string" && p.length >= 8;
}

export function timingSafeEqualString(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function verifyAdminPassword(plain: string | undefined): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !plain) return false;
  return timingSafeEqualString(plain, expected);
}

export function createAdminSessionToken(): string {
  const exp = Date.now() + SESSION_MS;
  const secret = sessionSecret();
  if (!secret) return "";
  const sig = crypto
    .createHmac("sha256", secret)
    .update(String(exp))
    .digest("hex");
  return `${exp}.${sig}`;
}

export function verifyAdminSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i <= 0) return false;
  const expStr = token.slice(0, i);
  const sig = token.slice(i + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const secret = sessionSecret();
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(expStr)
    .digest("hex");
  if (sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function getCookieFromHeader(
  cookieHeader: string | null,
  name: string
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k !== name) continue;
    return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

/** True if request has valid admin password header or signed session cookie. */
export function isAdminAuthorized(req: Request): boolean {
  const header = req.headers.get("x-admin-password");
  if (header && verifyAdminPassword(header)) return true;
  const token = getCookieFromHeader(
    req.headers.get("cookie"),
    ADMIN_COOKIE_NAME
  );
  return verifyAdminSessionToken(token);
}

export function adminNotConfiguredResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        "Server is missing ADMIN_PASSWORD (min 8 characters). Set it in .env.local.",
    },
    { status: 503 }
  );
}

export function adminUnauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Admin password required.", code: "ADMIN_REQUIRED" },
    { status: 401 }
  );
}

/** Returns a NextResponse to send if the request is not allowed, or `null` if OK. */
export function requireAdmin(req: Request): NextResponse | null {
  if (!isAdminPasswordConfigured()) {
    return adminNotConfiguredResponse();
  }
  if (!isAdminAuthorized(req)) {
    return adminUnauthorizedResponse();
  }
  return null;
}
