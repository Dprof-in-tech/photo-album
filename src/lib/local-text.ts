// Browser-only editable-copy store — the `local` twin of the R2-backed
// TextStore. All captions/quotes/names/settings/dates live in one JSON blob in
// localStorage, so they persist on the device with no server. Same public
// surface as TextStore (see TextStoreApi in text.ts). BroadcastChannel keeps
// sibling tabs in sync; there's no cross-device sync by design.

import type { TextStoreApi } from './text';

export const KEY = 'school-memories-text';
const CHANNEL = 'school-memories-text-local';

type Listener = (id: string) => void;

class LocalTextStore implements TextStoreApi {
  private cache: Record<string, string> = {};
  private loaded = false;
  private loadP: Promise<void> | null = null;
  private listeners = new Set<Listener>();
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (e) => {
        const { id, text } = e.data as { id: string; text: string };
        this.cache[id] = text;
        this.emit(id);
      };
    }
  }

  load(): Promise<void> {
    if (this.loadP) return this.loadP;
    this.loadP = new Promise<void>((resolve) => {
      try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
        if (raw) {
          const disk = JSON.parse(raw) as Record<string, string>;
          this.cache = { ...disk, ...this.cache }; // in-memory edits win over disk
        }
      } catch {
        /* ignore — start empty */
      }
      this.loaded = true;
      resolve();
    });
    return this.loadP;
  }

  isLoaded() {
    return this.loaded;
  }

  get(id: string): string | null {
    return id in this.cache ? this.cache[id] : null;
  }

  set(id: string, text: string) {
    if (this.cache[id] === text) return; // no-op — avoids needless writes on blur
    this.cache[id] = text;
    this.emit(id);
    this.persist();
    this.channel?.postMessage({ id, text });
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private persist() {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(this.cache));
    } catch {
      /* quota/private-mode — keep in memory */
    }
  }

  private emit(id: string) {
    this.listeners.forEach((fn) => fn(id));
  }
}

export { LocalTextStore };
