import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractDriveFileId(url: string): string | null {
  const match1 = url.match(/\/file\/d\/([^/]+)/);
  if (match1) return match1[1];
  const match2 = url.match(/[?&]id=([^&]+)/);
  if (match2) return match2[1];
  const match3 = url.match(/open\?id=([^&]+)/);
  if (match3) return match3[1];
  return null;
}

const IMAGE_SIGNATURES: [number[], string][] = [
  [[0xFF, 0xD8, 0xFF], "image/jpeg"],
  [[0x89, 0x50, 0x4E, 0x47], "image/png"],
  [[0x52, 0x49, 0x46, 0x46], "image/webp"], // RIFF header for WebP
  [[0x47, 0x49, 0x46], "image/gif"],
];

function isValidImage(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  return IMAGE_SIGNATURES.some(([sig]) =>
    sig.every((b, i) => bytes[i] === b)
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Parse batch params
    let batchSize = 10;
    let offset = 0;
    try {
      const body = await req.json();
      if (body.batchSize) batchSize = Math.min(Math.max(body.batchSize, 1), 50);
      if (body.offset != null) offset = body.offset;
    } catch { /* no body is fine */ }

    // Count total remaining Drive images
    const { count: totalRemaining } = await supabase
      .from("dishes")
      .select("id", { count: "exact", head: true })
      .not("image_url", "is", null)
      .ilike("image_url", "%drive.google.com%");

    // Get batch of dishes with Google Drive URLs
    const { data: dishes, error: fetchError } = await supabase
      .from("dishes")
      .select("id, image_url")
      .not("image_url", "is", null)
      .ilike("image_url", "%drive.google.com%")
      .range(0, batchSize - 1);

    if (fetchError) throw fetchError;

    const results = {
      imported: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
      totalRemaining: totalRemaining ?? 0,
      batchSize,
      hasMore: false,
    };

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
          results.errors.push(`${dish.id}: Could not extract Drive file ID`);
          continue;
        }

        const downloadUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        const response = await fetch(downloadUrl, { redirect: "follow" });

        if (!response.ok) {
          results.failed++;
          results.errors.push(`${dish.id}: HTTP ${response.status}`);
          continue;
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) {
          results.failed++;
          results.errors.push(`${dish.id}: Not an image (content-type: ${contentType})`);
          await response.arrayBuffer(); // consume body
          continue;
        }

        const arrayBuf = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);

        if (!isValidImage(bytes)) {
          results.failed++;
          results.errors.push(`${dish.id}: Invalid image file signature`);
          continue;
        }

        if (bytes.length < 1000) {
          results.failed++;
          results.errors.push(`${dish.id}: Response too small (${bytes.length} bytes)`);
          continue;
        }

        const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
        const storagePath = `${dish.id}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("dish-images")
          .upload(storagePath, bytes, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          results.failed++;
          results.errors.push(`${dish.id}: Upload failed - ${uploadError.message}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("dish-images")
          .getPublicUrl(storagePath);

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

    // Check if there are more after this batch
    results.hasMore = (results.totalRemaining - results.imported - results.failed - results.skipped) > 0;

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
