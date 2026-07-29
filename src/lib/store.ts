// Shared photo store — the single datastore both surfaces (Album + Photo Drop)
// key on by slot id. Backed by Cloudflare R2 through the /api/photo* endpoints,
// so an upload from a phone appears in the album on any device.
//
// Sync model:
//  - writes go straight to R2 and update the local cache optimistically;
//  - a BroadcastChannel mirrors changes to other tabs in THIS browser instantly;
//  - a poll of /api/photos (every POLL_MS) reconciles changes made on OTHER
//    devices. (A Durable Object + WebSocket would make this push-based; polling
//    is the low-complexity MVP and matches the prototype's 4s cadence.)
//
// The interface here is deliberately small and backend-agnostic — the R2 calls
// are the only cloud-specific part.

export interface Crop {
  x: number;
  y: number;
  scale: number;
}

export interface SlotValue {
  /** versioned image URL served from R2 via /api/photo/[id]?v=iv */
  url: string;
  crop: Crop;
}

// Internal cache entry: crop + image version (iv changes only when bytes change).
interface Entry {
  crop: Crop;
  iv: number;
}

import { getSync } from './sync';
import { CLOUD } from './mode';
import { LocalPhotoStore } from './local-store';

const CHANNEL = 'school-memories-photos';
// Poll is the cross-device backstop: slow when realtime WebSocket is on, fast
// when it isn't (so the app still syncs reasonably without a realtime Worker).
const POLL_BACKSTOP_MS = 30_000;
const POLL_FALLBACK_MS = 4_000;
const DEFAULT_CROP: Crop = { x: 0, y: 0, scale: 1 };

const photoUrl = (id: string, iv: number) => `/api/photo/${encodeURIComponent(id)}?v=${iv}`;
const sameCrop = (a: Crop, b: Crop) => a.x === b.x && a.y === b.y && a.scale === b.scale;

type Listener = (id: string, value: SlotValue | null) => void;
type Broadcast = { id: string; iv: number; crop: Crop } | { id: string; removed: true };

// Backend-agnostic surface both implementations satisfy: the R2-backed
// PhotoStore (cloud) and the IndexedDB LocalPhotoStore (browser-only). Consumers
// depend only on this, so getStore() can return either.
export interface PhotoStoreApi {
  load(): Promise<void>;
  isLoaded(): boolean;
  get(id: string): SlotValue | null;
  getAll(): Record<string, SlotValue>;
  filledCount(ids?: string[]): number;
  upload(id: string, blob: Blob, crop?: Crop): Promise<void>;
  setCrop(id: string, crop: Crop): Promise<void>;
  remove(id: string): Promise<void>;
  subscribe(fn: Listener): () => void;
}

class PhotoStore implements PhotoStoreApi {
  private cache: Record<string, Entry> = {};
  private loaded = false;
  private loadP: Promise<void> | null = null;
  private listeners = new Set<Listener>();
  private channel: BroadcastChannel | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (e) => this.applyRemote(e.data as Broadcast);
    }
    // Realtime: apply photo changes pushed from other devices via the relay.
    getSync().onMessage((m) => {
      if (m.kind !== 'photo') return;
      const { kind, ...rest } = m;
      void kind;
      this.applyRemote(rest as unknown as Broadcast);
    });
  }

  /** Hydrate the cache from R2 once, then start polling for remote changes. */
  load(): Promise<void> {
    if (this.loadP) return this.loadP;
    this.loadP = this.fetchManifest()
      .then((m) => {
        for (const id in m) this.cache[id] = m[id];
      })
      .catch(() => {})
      .then(() => {
        this.loaded = true;
        this.startPolling();
      });
    return this.loadP;
  }

  isLoaded() {
    return this.loaded;
  }

  get(id: string): SlotValue | null {
    const e = this.cache[id];
    return e ? { url: photoUrl(id, e.iv), crop: e.crop } : null;
  }

  getAll(): Record<string, SlotValue> {
    const out: Record<string, SlotValue> = {};
    for (const id in this.cache) out[id] = this.get(id)!;
    return out;
  }

  /** Count of filled slots, optionally restricted to a set of ids. */
  filledCount(ids?: string[]): number {
    if (ids) return ids.filter((id) => !!this.cache[id]).length;
    return Object.keys(this.cache).length;
  }

  /** Upload (or replace) a photo. Resets crop to `crop` (default centered). */
  async upload(id: string, blob: Blob, crop: Crop = DEFAULT_CROP): Promise<void> {
    const r = await fetch(photoBase(id), {
      method: 'PUT',
      headers: {
        'content-type': 'image/webp',
        'x-crop-x': String(crop.x),
        'x-crop-y': String(crop.y),
        'x-crop-scale': String(crop.scale),
      },
      body: blob,
    });
    if (!r.ok) throw new Error(`upload failed (${r.status})`);
    const { iv } = (await r.json()) as { iv: number };
    this.cache[id] = { crop, iv };
    this.emit(id);
    this.post({ id, iv, crop });
  }

  /** Persist a crop/framing change without re-uploading bytes. */
  async setCrop(id: string, crop: Crop): Promise<void> {
    const e = this.cache[id];
    if (!e) return;
    this.cache[id] = { crop, iv: e.iv }; // optimistic
    this.emit(id);
    this.post({ id, iv: e.iv, crop });
    try {
      await fetch(`${photoBase(id)}/crop`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(crop),
      });
    } catch {
      /* poll will reconcile if this failed */
    }
  }

  async remove(id: string): Promise<void> {
    delete this.cache[id];
    this.emit(id);
    this.post({ id, removed: true });
    try {
      await fetch(photoBase(id), { method: 'DELETE' });
    } catch {}
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ── internals ────────────────────────────────────────────────────────────
  private async fetchManifest(): Promise<Record<string, Entry>> {
    const r = await fetch('/api/photos', { cache: 'no-store' });
    if (!r.ok) return {};
    const raw = (await r.json()) as Record<string, { x: number; y: number; scale: number; iv: number }>;
    const out: Record<string, Entry> = {};
    for (const id in raw) {
      const { x, y, scale, iv } = raw[id];
      out[id] = { crop: { x, y, scale }, iv };
    }
    return out;
  }

  private startPolling() {
    if (this.pollTimer || typeof window === 'undefined') return;
    const interval = getSync().enabled() ? POLL_BACKSTOP_MS : POLL_FALLBACK_MS;
    this.pollTimer = setInterval(async () => {
      try {
        this.reconcile(await this.fetchManifest());
      } catch {}
    }, interval);
  }

  /** Merge a freshly-fetched manifest, emitting for anything that changed. */
  private reconcile(next: Record<string, Entry>) {
    for (const id in next) {
      const cur = this.cache[id];
      const n = next[id];
      if (!cur || cur.iv !== n.iv || !sameCrop(cur.crop, n.crop)) {
        this.cache[id] = n;
        this.emit(id);
      }
    }
    for (const id in this.cache) {
      if (!(id in next)) {
        delete this.cache[id];
        this.emit(id);
      }
    }
  }

  private applyRemote(msg: Broadcast) {
    if ('removed' in msg) {
      if (this.cache[msg.id]) {
        delete this.cache[msg.id];
        this.emit(msg.id);
      }
      return;
    }
    this.cache[msg.id] = { crop: msg.crop, iv: msg.iv };
    this.emit(msg.id);
  }

  private post(msg: Broadcast) {
    this.channel?.postMessage(msg);
    getSync().send({ kind: 'photo', ...msg });
  }

  private emit(id: string) {
    const v = this.get(id);
    this.listeners.forEach((fn) => fn(id, v));
  }
}

const photoBase = (id: string) => `/api/photo/${encodeURIComponent(id)}`;

let _store: PhotoStoreApi | null = null;
export function getStore(): PhotoStoreApi {
  if (!_store) _store = CLOUD ? new PhotoStore() : new LocalPhotoStore();
  return _store;
}

export type { PhotoStore };
