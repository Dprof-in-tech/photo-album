import { DurableObject } from 'cloudflare:workers';

// A dumb fan-out relay: every connected client sends change notifications
// ({kind:'photo'|'text', ...}) and the room rebroadcasts them to all OTHER
// clients. Writes still go to R2 (authoritative); this just makes other devices
// apply the change instantly instead of waiting for the poll. Uses the
// hibernatable WebSocket API so the DO sleeps between messages (cheap on free tier).
export class SyncRoom extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('sync room', { status: 200 });
    }
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(sender: WebSocket, message: string | ArrayBuffer) {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== sender) {
        try {
          ws.send(message);
        } catch {
          /* drop broken socket silently */
        }
      }
    }
  }

  webSocketClose(ws: WebSocket, code: number) {
    try {
      ws.close(code);
    } catch {
      /* already closing */
    }
  }
}

interface Env {
  SYNC: DurableObjectNamespace<SyncRoom>;
  // Optional shared token (light abuse gate). If unset, the relay is open.
  SYNC_TOKEN?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (env.SYNC_TOKEN && url.searchParams.get('t') !== env.SYNC_TOKEN) {
      return new Response('forbidden', { status: 403 });
    }
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('realtime sync worker', { status: 200 });
    }

    // One shared room for the whole album.
    const stub = env.SYNC.get(env.SYNC.idFromName('album'));
    return stub.fetch(request);
  },
};
