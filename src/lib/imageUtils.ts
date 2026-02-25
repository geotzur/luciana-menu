const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

export function getProxiedImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // If it's a Google Drive link, proxy it
  if (url.includes('drive.google.com')) {
    return `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/proxy-image?url=${encodeURIComponent(url)}`;
  }

  return url;
}
