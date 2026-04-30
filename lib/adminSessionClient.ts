/** After cookie expiry, APIs return 401 with this code — reload so AdminGate shows again. */
export function reloadIfAdminSessionExpired(
  res: Response,
  body: unknown
): void {
  if (res.status !== 401) return;
  if (
    body &&
    typeof body === "object" &&
    "code" in body &&
    (body as { code: unknown }).code === "ADMIN_REQUIRED" &&
    typeof window !== "undefined"
  ) {
    window.location.reload();
  }
}
