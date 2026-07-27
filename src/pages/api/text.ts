import type { APIRoute } from 'astro';

export const prerender = false;

// All editable copy lives in one JSON object in the photos bucket.
const TEXT_KEY = 'text.json';
const MAX_ID = 80;
const MAX_TEXT = 10_000;
const MAX_KEYS = 1000;

async function readAll(bucket: R2Bucket): Promise<Record<string, string>> {
  const obj = await bucket.get(TEXT_KEY);
  if (!obj) return {};
  try {
    return (await obj.json()) as Record<string, string>;
  } catch {
    return {};
  }
}

export const GET: APIRoute = async ({ locals }) => {
  const data = await readAll(locals.runtime.env.PHOTOS);
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};

// Merge one field (read-modify-write — R2 has no atomic patch). Edits are
// low-frequency, so the last-writer-wins race is acceptable for now.
export const PUT: APIRoute = async ({ request, locals }) => {
  const body = (await request.json().catch(() => null)) as { id?: unknown; text?: unknown } | null;
  if (!body || typeof body.id !== 'string' || typeof body.text !== 'string') {
    return new Response('Bad body', { status: 400 });
  }
  if (body.id.length > MAX_ID || body.text.length > MAX_TEXT) {
    return new Response('Too large', { status: 413 });
  }

  const bucket = locals.runtime.env.PHOTOS;
  const data = await readAll(bucket);
  if (!(body.id in data) && Object.keys(data).length >= MAX_KEYS) {
    return new Response('Too many entries', { status: 429 });
  }
  data[body.id] = body.text;

  await bucket.put(TEXT_KEY, JSON.stringify(data), {
    httpMetadata: { contentType: 'application/json' },
  });
  return Response.json({ ok: true });
};
