// Server-side helpers shared by the /api/photo* endpoints.
import { ALL_SLOT_IDS } from './slots';

const VALID = new Set(ALL_SLOT_IDS);

/** Only known slot ids may be written/read — prevents arbitrary bucket keys. */
export function isValidSlot(id: string | undefined): id is string {
  return !!id && VALID.has(id);
}

export interface StoredCrop {
  x: number;
  y: number;
  scale: number;
  /** image version — changes only when the photo BYTES change, so crop edits
   *  (which re-put the same bytes) don't bust the <img> cache. */
  iv: number;
}

/** Build the R2 customMetadata record (all values must be strings). */
export function cropToMeta(x: number, y: number, scale: number, iv: number): Record<string, string> {
  return { x: String(x), y: String(y), scale: String(scale), iv: String(iv) };
}

/** Parse an R2 customMetadata record back into numbers, with safe fallbacks. */
export function metaToCrop(m: Record<string, string> | undefined, uploadedMs: number): StoredCrop {
  const num = (v: string | undefined, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };
  return {
    x: num(m?.x, 0),
    y: num(m?.y, 0),
    scale: num(m?.scale, 1),
    iv: num(m?.iv, uploadedMs),
  };
}
