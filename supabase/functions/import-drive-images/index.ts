import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractDriveFileId(url: string): string | null {
  // /file/d/FILE_ID/
  const match1 = url.match(/\/file\/d\/([^/]+)/);
  if (match1) return match1[1];
  // ?id=FILE_ID
  const match2 = url.match(/[?&]id=([^&]+)/);
  if (match2) return match2[1];
  // open?id=FILE_ID
  const match3 = url.match(/open\?id=([^&]+)/);
  if (match3) return match3[1];
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all dishes with Google Drive URLs
    const { data: dishes, error: fetchError } = await supabase
      .from("dishes")
      .select("id, image_url")
      .not("image_url", "is", null)
      .ilike("image_url", "%drive.google.com%");

    if (fetchError) throw fetchError;

    const results = { imported: 0, failed: 0, skipped: 0, errors: [] as string[] };

    if (!dishes || dishes.length === 0) {
      return new Response(JSON.stringify({ ...results, message: "No Google Drive images found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const dish of dishes) {
      try {
        const fileId = extractDriveFileId(dish.image_url!);
        if (!fileId) {
          results.skipped++;
          continue;
        }

        // Download from Google Drive - follow redirects
        const downloadUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        const response = await fetch(downloadUrl, { redirect: "follow" });

        if (!response.ok) {
          results.failed++;
          results.errors.push(`${dish.id}: HTTP ${response.status}`);
          continue;
        }

        const contentType = response.headers.get("content-type") || "image/jpeg";
        const blob = await response.blob();
        
        if (blob.size < 1000) {
          // Probably an error page, not an image
          results.failed++;
          results.errors.push(`${dish.id}: Response too small (${blob.size} bytes)`);
          continue;
        }

        const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
        const storagePath = `${dish.id}.${ext}`;

        // Upload to storage (upsert)
        const { error: uploadError } = await supabase.storage
          .from("dish-images")
          .upload(storagePath, blob, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          results.failed++;
          results.errors.push(`${dish.id}: Upload failed - ${uploadError.message}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("dish-images")
          .getPublicUrl(storagePath);

        // Update dish record
        const { error: updateError } = await supabase
          .from("dishes")
          .update({ image_url: urlData.publicUrl })
          .eq("id", dish.id);

        if (updateError) {
          results.failed++;
          results.errors.push(`${dish.id}: DB update failed - ${updateError.message}`);
          continue;
        }

        results.imported++;
      } catch (e) {
        results.failed++;
        results.errors.push(`${dish.id}: ${e.message}`);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
