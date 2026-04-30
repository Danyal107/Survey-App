/** Path prefix used by `/api/upload/shop-image` — only these blobs may be submitted or deleted via the API. */
export const SHOP_IMAGE_BLOB_PATH_MARKER = "/survey-app/shop-images/";

/** Hard cap per response to keep payloads and storage reasonable. */
export const MAX_SHOP_IMAGES_PER_RESPONSE = 200;

/** True for public URLs served from this app’s Vercel Blob store. */
export function isVercelBlobPublicUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname.endsWith(".public.blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

/** Shop images we accept in responses and allow deleting (same prefix as uploads). */
export function isAppShopImageBlobUrl(url: string): boolean {
  if (!isVercelBlobPublicUrl(url)) return false;
  try {
    return new URL(url).pathname.includes(SHOP_IMAGE_BLOB_PATH_MARKER);
  } catch {
    return false;
  }
}
