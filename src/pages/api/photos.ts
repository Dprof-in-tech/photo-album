import type { APIRoute } from 'astro';
import { metaToCrop, type StoredCrop } from '@/lib/r2';

export const prerender = false;

// Returns the full slot manifest: { [slotId]: {x, y, scale, iv} }. No image
// bytes — the album/photo-drop hydrate crop + fill state from this, then load
// each image lazily from /api/photo/[id]?v=iv. Also the poll target for
// cross-device sync.
export const GET: APIRoute = async ({ locals }) => {
  const bucket = locals.runtime.env.PHOTOS;
  const out: Record<string, StoredCrop> = {};

  let cursor: string | undefined;
  do {
    const list = await bucket.list({ include: ['customMetadata'], cursor });
    for (const o of list.objects) {
      out[o.key] = metaToCrop(o.customMetadata, o.uploaded.getTime());
    }
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);

  return new Response(JSON.stringify(out), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};
