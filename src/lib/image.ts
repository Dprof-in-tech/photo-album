// Encode an uploaded photo through a canvas so the store carries a right-sized
// webp, not the raw multi-MB original — but at PRINT quality, not screen quality.
//
// The book prints as 16×8in spreads. The stored resolution is decoupled from the
// slot's on-screen size (a phone-uploaded photo must be crisp on a full-page
// print even though the Photo Drop tile is tiny), so we cap by a fixed longest
// side instead:
//   4800px  = 300dpi across a full 16in full-bleed spread (photo-book standard),
//           ≈ 600dpi on a single 8in page. Smaller originals are kept as-is.
const MAX_DIM = 4800;

// webp quality. 0.92 keeps fine detail (faces, text on signs) clean without the
// bloat of near-lossless; a 3840px photo lands around 1–3 MB.
const QUALITY = 0.92;

// Raster formats only. SVG excluded (can carry script). GIF excluded (canvas
// re-encode keeps only the first frame — an animated GIF would silently freeze).
export const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];

function drawScaled(bitmap: ImageBitmap): HTMLCanvasElement {
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  // High-quality resampling so downscaled photos stay crisp, not soft.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas;
}

/** Downscale (never upscale) + re-encode an upload to print-quality webp bytes. */
export async function fileToWebpBlob(file: File): Promise<Blob> {
  // imageOrientation:'from-image' bakes in EXIF rotation so phone photos aren't
  // stored sideways (createImageBitmap ignores EXIF by default).
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const canvas = drawScaled(bitmap);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/webp', QUALITY)
    );
  } finally {
    bitmap.close?.();
  }
}
