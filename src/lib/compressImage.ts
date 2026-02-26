/**
 * Compresses an image file using the native Canvas API.
 * No external dependencies needed — runs entirely in the browser.
 *
 * A 9504×6336 JPEG (~8 MB) → 1200×800 JPEG (~120-200 KB)
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  quality = 0.75
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Only downscale, never upscale
      const ratio = Math.min(maxWidth / img.width, 1);
      const width = Math.round(img.width * ratio);
      const height = Math.round(img.height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Use high-quality resampling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas toBlob failed"));
            return;
          }
          // Return as File so it works with Supabase upload
          const compressed = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
            type: "image/jpeg",
          });
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}
