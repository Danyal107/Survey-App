import { NextResponse } from "next/server";
import {
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  isAdminAuthorized,
  isAdminPasswordConfigured,
} from "@/lib/adminAuth";

export async function GET(req: Request) {
  if (!isAdminPasswordConfigured()) {
    return adminNotConfiguredResponse();
  }
  if (!isAdminAuthorized(req)) {
    return adminUnauthorizedResponse();
  }
  return NextResponse.json({ ok: true });
}
