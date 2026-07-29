// Export / import the whole album as one self-contained file — the ownership
// story for the browser-only (`local`) build. Since nothing lives on a server,
// this file IS the user's backup and their way to move an album between
// browsers or devices. Photos (IndexedDB blobs) are inlined as data URLs and
// copy/settings (localStorage) as a plain map, so the result is one portable
// JSON with no external dependencies.

import { openDb, loadAll, idbPut } from './local-store';
import { KEY as TEXT_KEY } from './local-text';

const FORMAT = 'school-memories-album/v1';

interface Crop {
  x: number;
  y: number;
  scale: number;
}

export interface AlbumBackup {
  format: string;
  exportedAt: string;
  text: Record<string, string>;
  photos: Record<string, { crop: Crop; iv: number; data: string }>;
}

const DEFAULT_CROP: Crop = { x: 0, y: 0, scale: 1 };

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

const dataUrlToBlob = (u: string): Promise<Blob> => fetch(u).then((r) => r.blob());

/** Bundle all photos + copy into one downloadable JSON blob. */
export async function exportAlbum(): Promise<Blob> {
  let text: Record<string, string> = {};
  try {
    text = JSON.parse(localStorage.getItem(TEXT_KEY) || '{}');
  } catch {
    /* keep empty */
  }

  const photos: AlbumBackup['photos'] = {};
  try {
    const db = await openDb();
    for (const [id, rec] of await loadAll(db)) {
      photos[id] = { crop: rec.crop, iv: rec.iv, data: await blobToDataUrl(rec.blob) };
    }
  } catch {
    /* no photos / IDB unavailable — export copy only */
  }

  const backup: AlbumBackup = { format: FORMAT, exportedAt: new Date().toISOString(), text, photos };
  return new Blob([JSON.stringify(backup)], { type: 'application/json' });
}

/**
 * Restore an album from a previously-exported file. Copy is replaced wholesale;
 * photos are written by slot id (a slot present in the file overwrites, others
 * are left as-is). Caller should reload so the stores rehydrate from disk.
 */
export async function importAlbum(file: File): Promise<{ photos: number; text: number }> {
  let parsed: AlbumBackup;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("That file isn't valid JSON — pick an exported album backup.");
  }
  if (!parsed || typeof parsed !== 'object' || !String(parsed.format || '').startsWith('school-memories-album/')) {
    throw new Error("That doesn't look like an album backup file.");
  }

  const text = parsed.text && typeof parsed.text === 'object' ? parsed.text : {};
  try {
    localStorage.setItem(TEXT_KEY, JSON.stringify(text));
  } catch {
    /* quota/private mode */
  }

  const photos = parsed.photos && typeof parsed.photos === 'object' ? parsed.photos : {};
  let n = 0;
  const db = await openDb();
  for (const id in photos) {
    const p = photos[id];
    if (!p || typeof p.data !== 'string') continue;
    try {
      const blob = await dataUrlToBlob(p.data);
      await idbPut(db, id, { blob, crop: p.crop || DEFAULT_CROP, iv: p.iv || 1 });
      n++;
    } catch {
      /* skip a corrupt entry rather than abort the whole import */
    }
  }

  return { photos: n, text: Object.keys(text).length };
}
