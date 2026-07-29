// Shared editable-copy store — all captions/quotes/names live in ONE small JSON
// blob in R2 (`text.json`), keyed by text id. Mirrors the photo store's sync
// model: optimistic local cache, BroadcastChannel for same-browser tabs, and a
// poll for cross-device updates. This is what makes edited copy appear on other
// devices and in the print-to-PDF output.

import { getSync } from './sync';
import { CLOUD } from './mode';
import { LocalTextStore } from './local-text';

const CHANNEL = 'school-memories-text';
const POLL_BACKSTOP_MS = 30_000;
const POLL_FALLBACK_MS = 5_000;

type Listener = (id: string) => void;

// Backend-agnostic surface both the R2-backed TextStore (cloud) and the
// localStorage LocalTextStore (browser-only) satisfy.
export interface TextStoreApi {
  load(): Promise<void>;
  isLoaded(): boolean;
  get(id: string): string | null;
  set(id: string, text: string): void;
  subscribe(fn: Listener): () => void;
}

class TextStore implements TextStoreApi {
  private cache: Record<string, string> = {};
  private loaded = false;
  private loadP: Promise<void> | null = null;
  private listeners = new Set<Listener>();
  private channel: BroadcastChannel | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (e) => {
        const { id, text } = e.data as { id: string; text: string };
        this.cache[id] = text;
        this.emit(id);
      };
    }
    // Realtime: apply copy edits pushed from other devices via the relay.
    getSync().onMessage((m) => {
      if (m.kind !== 'text') return;
      const { id, text } = m as { id?: string; text?: string };
      if (typeof id !== 'string' || typeof text !== 'string') return;
      this.cache[id] = text;
      this.emit(id);
    });
  }

  load(): Promise<void> {
    if (this.loadP) return this.loadP;
    this.loadP = fetch('/api/text', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((m: Record<string, string>) => {
        this.cache = { ...m, ...this.cache }; // in-memory edits win over disk
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

  /** Saved override for id, or null if never edited (caller uses its default). */
  get(id: string): string | null {
    return id in this.cache ? this.cache[id] : null;
  }

  set(id: string, text: string) {
    if (this.cache[id] === text) return; // no-op — avoids needless PUTs on blur
    this.cache[id] = text;
    this.emit(id);
    this.channel?.postMessage({ id, text });
    getSync().send({ kind: 'text', id, text });
    fetch('/api/text', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, text }),
    }).catch(() => {
      /* poll will reconcile if this failed */
    });
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private startPolling() {
    if (this.pollTimer || typeof window === 'undefined') return;
    const interval = getSync().enabled() ? POLL_BACKSTOP_MS : POLL_FALLBACK_MS;
    this.pollTimer = setInterval(async () => {
      try {
        const next = (await fetch('/api/text', { cache: 'no-store' }).then((r) => r.json())) as Record<string, string>;
        for (const id in next) {
          if (this.cache[id] !== next[id]) {
            this.cache[id] = next[id];
            this.emit(id);
          }
        }
      } catch {}
    }, interval);
  }

  private emit(id: string) {
    this.listeners.forEach((fn) => fn(id));
  }
}

let _store: TextStoreApi | null = null;
export function getTextStore(): TextStoreApi {
  if (!_store) _store = CLOUD ? new TextStore() : new LocalTextStore();
  return _store;
}

export type { TextStore };
