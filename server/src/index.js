// Entrada do Worker: rotas HTTP e os Durable Objects (Room e Lobby).
import { DurableObject } from 'cloudflare:workers';
import { RoomCore, LobbyCore, CORS, json, clean } from './core.js';

export class Room extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.core = new RoomCore(ctx, env); }
  fetch(req) { return this.core.fetch(req); }
  webSocketMessage(ws, msg) { return this.core.message(ws, msg); }
  webSocketClose(ws) { return this.core.close(ws); }
  webSocketError(ws) { return this.core.close(ws); }
}

export class Lobby extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.core = new LobbyCore(ctx); }
  fetch(req) { return this.core.fetch(req); }
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const u = new URL(req.url);
    const lobby = env.LOBBY.get(env.LOBBY.idFromName('main'));

    if (u.pathname === '/rooms' && req.method === 'GET') return lobby.fetch(new Request('https://lobby/list'));
    if (u.pathname === '/rooms' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      return lobby.fetch(new Request('https://lobby/create', { method: 'POST', body: JSON.stringify({ name: clean(body.name, 32) }) }));
    }

    const m = u.pathname.match(/^\/room\/([a-z0-9]{6,12})$/);
    if (m && req.headers.get('upgrade') === 'websocket') {
      const id = m[1];
      const ok = await (await lobby.fetch(new Request(`https://lobby/exists?id=${id}`))).json();
      if (!ok.ok) return json({ error: 'Sala não existe mais' }, 404);
      // repassa o id da sala para o Durable Object (mantém os cabeçalhos do upgrade)
      const fwd = new Request(`https://room/?id=${id}`, req);
      return env.ROOM.get(env.ROOM.idFromName(id)).fetch(fwd);
    }
    return json({ error: 'não encontrado' }, 404);
  },
};
