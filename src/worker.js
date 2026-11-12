// Cloudflare Worker: liefert die Spielseiten aus und leitet WebSocket-
// Verbindungen an den Raum (Durable Object) der jeweiligen Klasse weiter.
import { DurableObject } from 'cloudflare:workers';
import { RoomLogic } from './room.js';

const KEEP_MS = 6 * 60 * 60 * 1000; // Raumdaten 6 Stunden nach der letzten Änderung löschen

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // Lebenszeichen der Handys beantworten, ohne den Raum aufzuwecken
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    this.logic = new RoomLogic({
      load: () => ctx.storage.get('s'),
      save: async s => { await ctx.storage.put('s', s); await ctx.storage.setAlarm(Date.now() + KEEP_MS); },
      wipe: async () => { await ctx.storage.deleteAlarm(); await ctx.storage.deleteAll(); },
      conns: () => ctx.getWebSockets().map(ws => this.wrap(ws)),
      setMeta: (conn, meta) => { conn.ws.serializeAttachment(meta); conn.meta = meta; },
      now: () => Date.now(),
    });
  }

  wrap(ws) {
    return {
      ws,
      meta: ws.deserializeAttachment() || {},
      sendRaw(str) { try { ws.send(str); } catch (e) {} },
      send(obj) { try { ws.send(JSON.stringify(obj)); } catch (e) {} },
      close(code, reason) { try { ws.close(code, reason); } catch (e) {} },
    };
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket erwartet', { status: 426 });
    const url = new URL(request.url);
    const code = url.pathname.split('/').pop();
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({});
    const q = Object.fromEntries(url.searchParams);
    q.code = code;
    await this.logic.open(this.wrap(server), q);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    if (typeof message !== 'string') return;
    await this.logic.message(this.wrap(ws), message);
  }

  async webSocketClose(ws, code, reason) {
    try { ws.close(code, reason); } catch (e) {}
    await this.logic.close(this.wrap(ws));
  }

  async webSocketError(ws) {
    await this.logic.close(this.wrap(ws));
  }

  async alarm() {
    const s = await this.ctx.storage.get('s');
    if (s && Date.now() - (s.updated || 0) < KEEP_MS - 60000) {
      await this.ctx.storage.setAlarm((s.updated || 0) + KEEP_MS);
      return;
    }
    for (const ws of this.ctx.getWebSockets()) { try { ws.close(4000, 'ended'); } catch (e) {} }
    await this.ctx.storage.deleteAll();
    this.logic.s = null;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/ws\/([A-Z0-9]{5})$/);
    if (m) {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket erwartet', { status: 426 });
      return env.ROOM.get(env.ROOM.idFromName(m[1])).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
