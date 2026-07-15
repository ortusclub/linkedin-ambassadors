import { put } from "@vercel/blob";
import { v4 as uuid } from "uuid";

// Hosts whose URLs are already permanent — never re-host these.
const PERMANENT_HOST = ".public.blob.vercel-storage.com";

/**
 * Re-host an external image URL onto our own Vercel Blob storage and return the
 * permanent URL. Used for profile photos, which are usually pasted/imported as
 * `media.licdn.com` links — LinkedIn signs those with an `e=` expiry token, so
 * after a few weeks they 403 and the image vanishes from our listings.
 *
 * - Empty / data: / already-on-Blob URLs are returned unchanged.
 * - On any fetch/upload failure we return the ORIGINAL url so a save never
 *   fails just because re-hosting hit a snag (the image may still work for now).
 */
export async function persistImageUrl(
  url: string | null | undefined
): Promise<string | null | undefined> {
  if (!url) return url;
  if (url.startsWith("data:")) return url;
  if (url.includes(PERMANENT_HOST)) return url;
  if (!/^https?:\/\//i.test(url)) return url;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`persistImageUrl: source returned ${res.status} for ${url}`);
      return url;
    }
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const ext = (contentType.split("/")[1] || "jpg").split(";")[0].replace("jpeg", "jpg");
    const blob = await put(`profile-${uuid()}.${ext}`, await res.arrayBuffer(), {
      access: "public",
      contentType,
    });
    return blob.url;
  } catch (err) {
    console.error("persistImageUrl failed, keeping original url:", err);
    return url;
  }
}
