const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

/**
 * Returns a proxied/optimized URL for a dish image.
 * - Supabase storage URLs get image transform for thumbnails
 * - Google Drive URLs go through the proxy edge function
 * - Invalid values (bare filenames etc.) return null
 */
export function getProxiedImageUrl(url: string | null | undefined, size: 'thumbnail' | 'full' = 'thumbnail'): string | null {
  if (!url) return null;

  // If it's already a Supabase storage URL, use image transforms for thumbnails
  if (url.includes('supabase.co/storage/')) {
    if (size === 'thumbnail') {
      // Use Supabase Image Transforms: resize to 400px width, auto quality
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}width=400&quality=75`;
    }
    return url;
  }

  // If it's a Google Drive link, proxy it as fallback
  if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
    return `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/proxy-image?url=${encodeURIComponent(url)}`;
  }

  // Bare filenames or non-URL values → invalid
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return null;
  }

  return url;
}
