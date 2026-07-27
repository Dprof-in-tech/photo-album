import type { APIRoute } from 'astro';
import { cropToMeta, isValidSlot, metaToCrop } from '@/lib/r2';

export const prerender = false;

// Update crop/framing WITHOUT changing the photo bytes. R2 has no metadata
// patch, so we read the object and re-put the same bytes with new crop metadata,
// preserving `iv` — the <img> URL (?v=iv) stays stable, so reframing doesn't
// trigger an image reload on the editing device.
export const PUT: APIRoute = async ({ params, request, locals }) => {
  if (!isValidSlot(params.id)) return new Response('Bad slot', { status: 400 });

  const body = (await request.json().catch(() => null)) as { x?: number; y?: number; scale?: number } | null;
  if (!body) return new Response('Bad body', { status: 400 });

  const bucket = locals.runtime.env.PHOTOS;
  const obj = await bucket.get(params.id);
  if (!obj) return new Response('Not found', { status: 404 });

  const prev = metaToCrop(obj.customMetadata, obj.uploaded.getTime());
  const x = Number.isFinite(body.x) ? (body.x as number) : prev.x;
  const y = Number.isFinite(body.y) ? (body.y as number) : prev.y;
  const scale = Number.isFinite(body.scale) ? (body.scale as number) : prev.scale;

  const bytes = await obj.arrayBuffer();
  await bucket.put(params.id, bytes, {
    httpMetadata: obj.httpMetadata,
    customMetadata: cropToMeta(x, y, scale, prev.iv),
  });

  return Response.json({ ok: true, iv: prev.iv, crop: { x, y, scale } });
};
