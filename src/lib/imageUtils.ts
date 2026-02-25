const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

export function getProxiedImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // If it's already a Supabase storage URL, use directly (fast!)
  if (url.includes('supabase.co/storage/')) {
    return url;
  }

  // If it's a Google Drive link (any format), proxy it as fallback
  if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
    return `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/proxy-image?url=${encodeURIComponent(url)}`;
  }

  return url;
}
