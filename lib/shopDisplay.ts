import type { IShopDetails } from "@/models/Shop";

/** Primary label for cards and headings (prefers configured shop name field). */
export function shopDisplayName(details: IShopDetails | null | undefined): string {
  if (!details || typeof details !== "object") return "Shop";
  const name = details.shopName;
  if (typeof name === "string" && name.trim()) return name.trim();
  for (const v of Object.values(details)) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "Shop";
}

export function formatShopDetailValue(
  value: string | string[] | undefined
): string {
  if (value == null) return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return value === "" ? "—" : value;
}
