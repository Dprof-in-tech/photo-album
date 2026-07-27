import type { APIRoute } from 'astro';
import { cropToMeta, isValidSlot } from '@/lib/r2';

export const prerender = false;

const num = (v: string | null, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// Stream the webp bytes. The URL is versioned (?v=iv), so it's safe to cache
// hard — a new upload changes iv and thus the URL.
export const GET: APIRoute = async ({ params, locals }) => {
  if (!isValidSlot(params.id)) return new Response('Bad slot', { status: 400 });
  const obj = await locals.runtime.env.PHOTOS.get(params.id);
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(obj.body, {
    headers: {
      'content-type': obj.httpMetadata?.contentType || 'image/webp',
      etag: obj.httpEtag,
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
};

// Upload (or replace) a photo. Body = webp bytes; crop passed via headers.
// A fresh upload resets the crop to the incoming values (default = centered).
export const PUT: APIRoute = async ({ params, request, locals }) => {
  if (!isValidSlot(params.id)) return new Response('Bad slot', { status: 400 });
  const buf = await request.arrayBuffer();
  if (!buf.byteLength) return new Response('Empty body', { status: 400 });

  const iv = Date.now();
  const x = num(request.headers.get('x-crop-x'), 0);
  const y = num(request.headers.get('x-crop-y'), 0);
  const scale = num(request.headers.get('x-crop-scale'), 1);

  await locals.runtime.env.PHOTOS.put(params.id, buf, {
    httpMetadata: { contentType: 'image/webp' },
    customMetadata: cropToMeta(x, y, scale, iv),
  });

  return Response.json({ ok: true, iv, crop: { x, y, scale } });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!isValidSlot(params.id)) return new Response('Bad slot', { status: 400 });
  await locals.runtime.env.PHOTOS.delete(params.id);
  return Response.json({ ok: true });
};
