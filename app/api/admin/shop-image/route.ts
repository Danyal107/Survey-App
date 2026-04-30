import { requireAdmin } from "@/lib/adminAuth";
import {
  deleteShopImageFromRequest,
  putShopImageFromRequest,
} from "@/lib/shopImageHandlers";

export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return putShopImageFromRequest(req);
}

export async function DELETE(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return deleteShopImageFromRequest(req);
}
