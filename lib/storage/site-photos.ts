const BUCKET = "site_photos";

export function sitePhotoUrl(
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${path}`;
}

export const SITE_PHOTOS_BUCKET = BUCKET;
