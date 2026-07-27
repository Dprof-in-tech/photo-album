// Realtime sync client — a thin WebSocket to the relay Worker. Both stores use
// it: they broadcast local changes with send() and apply remote ones via
// onMessage(). It's a NOTIFICATION channel only — R2 stays the source of truth.
//
// Disabled (no-op) when PUBLIC_SYNC_URL is unset, so the app still works via the
// poll backstop with no realtime Worker configured (e.g. plain local dev).

const SYNC_URL = import.meta.env.PUBLIC_SYNC_URL;
const SYNC_TOKEN = import.meta.env.PUBLIC_SYNC_TOKEN;
const MAX_BACKOFF = 30_000;

export interface SyncMessage {
  kind: string;
  [key: string]: unknown;
}
type Handler = (msg: SyncMessage) => void;

class SyncClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<Handler>();
  private queue: string[] = [];
  private backoff = 1000;
  private started = false;

  enabled(): boolean {
    return !!SYNC_URL && typeof WebSocket !== 'undefined';
  }

  /** Idempotent — first onMessage()/send() kicks it off. */
  start() {
    if (!this.enabled() || this.started) return;
    this.started = true;
    this.connect();
  }

  private connect() {
    const url = SYNC_TOKEN ? `${SYNC_URL}?t=${encodeURIComponent(SYNC_TOKEN)}` : (SYNC_URL as string);
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.reconnect();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.backoff = 1000;
      const pending = this.queue.splice(0);
      for (const m of pending) ws.send(m);
    };
    ws.onmessage = (e) => {
      let msg: SyncMessage;
      try {
        msg = JSON.parse(typeof e.data === 'string' ? e.data : '');
      } catch {
        return;
      }
      if (msg && typeof msg.kind === 'string') this.handlers.forEach((h) => h(msg));
    };
    ws.onclose = () => {
      this.ws = null;
      this.reconnect();
    };
    ws.onerror = () => {
      try {
        ws.close();
      } catch {}
    };
  }

  private reconnect() {
    if (!this.enabled()) return;
    const delay = this.backoff;
    this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF);
    setTimeout(() => this.connect(), delay);
  }

  send(msg: SyncMessage) {
    if (!this.enabled()) return;
    const s = JSON.stringify(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(s);
    else {
      this.queue.push(s);
      this.start();
    }
  }

  onMessage(handler: Handler): () => void {
    this.handlers.add(handler);
    this.start();
    return () => this.handlers.delete(handler);
  }
}

let _sync: SyncClient | null = null;
export function getSync(): SyncClient {
  if (!_sync) _sync = new SyncClient();
  return _sync;
}
