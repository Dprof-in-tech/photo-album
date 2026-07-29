// Browser-only photo store — the `local` twin of the R2-backed PhotoStore.
// Photos live entirely on the visitor's device in IndexedDB; nothing is ever
// uploaded to a server, so the public build carries zero storage/cost/privacy
// liability. Same public surface as PhotoStore (see PhotoStoreApi in store.ts)
// so ImageSlot / AlbumApp / FlipBook / useProgress don't change.
//
// Cross-tab sync (same browser) is kept via BroadcastChannel; there's no
// cross-device sync because there's no server holding the data — that's the
// whole point of this mode.

import type { Crop, SlotValue, PhotoStoreApi } from './store';

export const DB_NAME = 'school-memories';
const DB_VERSION = 1;
export const STORE = 'photos';
const CHANNEL = 'school-memories-photos-local';
const DEFAULT_CROP: Crop = { x: 0, y: 0, scale: 1 };

// What we persist per slot in IndexedDB.
interface Record_ {
  blob: Blob;
  crop: Crop;
  iv: number;
}
// In-memory cache entry: crop + version + a live object URL for the blob.
interface Entry {
  crop: Crop;
  iv: number;
  url: string;
}

type Listener = (id: string, value: SlotValue | null) => void;
type Remote = { id: string } | { id: string; removed: true };

// ── tiny IndexedDB helpers (also reused by the backup export/import) ─────────
export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function loadAll(db: IDBDatabase): Promise<Array<[string, Record_]>> {
  return new Promise((resolve, reject) => {
    const out: Array<[string, Record_]> = [];
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) {
        out.push([String(cur.key), cur.value as Record_]);
        cur.continue();
      } else resolve(out);
    };
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db: IDBDatabase, id: string): Promise<Record_ | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as Record_ | undefined);
    req.onerror = () => reject(req.error);
  });
}

export function idbPut(db: IDBDatabase, id: string, rec: Record_): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(rec, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbDelete(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

class LocalPhotoStore implements PhotoStoreApi {
  private cache: Record<string, Entry> = {};
  private loaded = false;
  private loadP: Promise<void> | null = null;
  private listeners = new Set<Listener>();
  private channel: BroadcastChannel | null = null;
  private db: IDBDatabase | null = null;

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (e) => void this.applyRemote(e.data as Remote);
    }
  }

  /** Hydrate the in-memory cache from IndexedDB once. */
  load(): Promise<void> {
    if (this.loadP) return this.loadP;
    this.loadP = (async () => {
      await this.ensureDb();
      if (this.db) {
        try {
          for (const [id, rec] of await loadAll(this.db)) {
            this.cache[id] = { crop: rec.crop, iv: rec.iv, url: URL.createObjectURL(rec.blob) };
          }
        } catch {
          /* ignore — start empty */
        }
      }
      this.loaded = true;
    })();
    return this.loadP;
  }

  isLoaded() {
    return this.loaded;
  }

  get(id: string): SlotValue | null {
    const e = this.cache[id];
    return e ? { url: e.url, crop: e.crop } : null;
  }

  getAll(): Record<string, SlotValue> {
    const out: Record<string, SlotValue> = {};
    for (const id in this.cache) out[id] = this.get(id)!;
    return out;
  }

  filledCount(ids?: string[]): number {
    if (ids) return ids.filter((id) => !!this.cache[id]).length;
    return Object.keys(this.cache).length;
  }

  async upload(id: string, blob: Blob, crop: Crop = DEFAULT_CROP): Promise<void> {
    await this.ensureDb();
    const prev = this.cache[id];
    const iv = (prev?.iv ?? 0) + 1;
    if (this.db) await idbPut(this.db, id, { blob, crop, iv });
    if (prev) URL.revokeObjectURL(prev.url);
    this.cache[id] = { crop, iv, url: URL.createObjectURL(blob) };
    this.emit(id);
    this.channel?.postMessage({ id } as Remote); // other tabs re-read from IDB
  }

  async setCrop(id: string, crop: Crop): Promise<void> {
    const e = this.cache[id];
    if (!e) return;
    this.cache[id] = { ...e, crop }; // optimistic; keeps the same object URL
    this.emit(id);
    await this.ensureDb();
    if (this.db) {
      const rec = await idbGet(this.db, id);
      if (rec) await idbPut(this.db, id, { ...rec, crop });
    }
    this.channel?.postMessage({ id } as Remote);
  }

  async remove(id: string): Promise<void> {
    const e = this.cache[id];
    if (e) URL.revokeObjectURL(e.url);
    delete this.cache[id];
    this.emit(id);
    await this.ensureDb();
    if (this.db) await idbDelete(this.db, id);
    this.channel?.postMessage({ id, removed: true } as Remote);
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ── internals ──────────────────────────────────────────────────────────────
  private async ensureDb() {
    if (this.db || typeof indexedDB === 'undefined') return;
    try {
      this.db = await openDb();
    } catch {
      /* stays null — cache-only fallback */
    }
  }

  /** A sibling tab changed a slot: re-read that one entry from IDB. */
  private async applyRemote(msg: Remote) {
    if (!msg || typeof msg.id !== 'string') return;
    if ('removed' in msg) {
      const e = this.cache[msg.id];
      if (e) {
        URL.revokeObjectURL(e.url);
        delete this.cache[msg.id];
        this.emit(msg.id);
      }
      return;
    }
    await this.ensureDb();
    if (!this.db) return;
    const rec = await idbGet(this.db, msg.id);
    if (!rec) return;
    const prev = this.cache[msg.id];
    if (prev) URL.revokeObjectURL(prev.url);
    this.cache[msg.id] = { crop: rec.crop, iv: rec.iv, url: URL.createObjectURL(rec.blob) };
    this.emit(msg.id);
  }

  private emit(id: string) {
    const v = this.get(id);
    this.listeners.forEach((fn) => fn(id, v));
  }
}

export { LocalPhotoStore };
