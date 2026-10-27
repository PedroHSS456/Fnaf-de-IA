// Testes da lógica do servidor com mocks do runtime do Cloudflare (WebSocketPair, Durable Object storage).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoomCore, LobbyCore, cleanLook, MAX_PLAYERS } from '../src/core.js';
// Node não aceita status 101 em Response; o runtime do Workers aceita. Shim só para o teste.
class FakeResponse {
  constructor(body, init = {}) { this.body = body; this.status = init.status ?? 200; this.webSocket = init.webSocket; this.headers = new Map(Object.entries(init.headers || {})); }
  async json() { return JSON.parse(this.body); }
}
globalThis.Response = FakeResponse;

class Sock {
  constructor() { this.inbox = []; this.peer = null; this.att = null; this.closed = null; }
  send(t) { if (this.closed) throw new Error('closed'); this.inbox.push(JSON.parse(t)); }
  close(code, reason) { this.closed = { code, reason }; }
  serializeAttachment(o) { this.att = JSON.parse(JSON.stringify(o)); }
  deserializeAttachment() { return this.att ? JSON.parse(JSON.stringify(this.att)) : null; }
}
globalThis.WebSocketPair = function () { const c = new Sock(), s = new Sock(); return [c, s]; };

function makeCtx(sockets) {
  return {
    sockets,
    acceptWebSocket(ws) { sockets.push(ws); },
    getWebSockets() { return sockets.slice(); },
  };
}
function makeEnv(lobbyRooms) {
  const lobby = new LobbyCore({ blockConcurrencyWhile: null, storage: { get: async () => lobbyRooms, put: async () => {} } });
  return {
    LOBBY: { idFromName: () => 'L', get: () => ({ fetch: (u, init) => lobby.fetch(typeof u === 'string' ? new Request(u, init) : u) }) },
  };
}
const wsReq = (id) => new Request(`https://room/?id=${id}`, { headers: { upgrade: 'websocket' } });
async function connect(room, sockets) {
  const r = await room.fetch(wsReq('abc123'));
  assert.equal(r.status, 101);
  const ws = sockets[sockets.length - 1];
  return ws;
}

test('hi -> welcome, join broadcast, state relay', async () => {
  const sockets = []; const env = makeEnv({});
  const room = new RoomCore(makeCtx(sockets), env);
  const a = await connect(room, sockets);
  await room.message(a, JSON.stringify({ t: 'hi', name: 'Ana', look: { el: 'fogo', skin: '#fff' } }));
  assert.equal(a.inbox.at(-1).t, 'welcome');
  const b = await connect(room, sockets);
  await room.message(b, JSON.stringify({ t: 'hi', name: 'Bruno', look: { el: 'ar' } }));
  assert.equal(b.inbox.at(-1).t, 'welcome');
  assert.equal(b.inbox.at(-1).players.length, 1);
  assert.equal(a.inbox.at(-1).t, 'join');
  assert.equal(a.inbox.at(-1).p.name, 'Bruno');
  await room.message(a, JSON.stringify({ t: 'st', x: 1.5, y: 0.2, z: -3, yaw: 0.4, sp: 4 }));
  const st = b.inbox.at(-1);
  assert.equal(st.t, 'st'); assert.equal(st.x, 1.5); assert.equal(st.z, -3);
  assert.equal(a.inbox.filter((m) => m.t === 'st').length, 0, 'não ecoa para o remetente');
});

test('valida coordenadas, descarta lixo e limita taxa', async () => {
  const sockets = []; const room = new RoomCore(makeCtx(sockets), makeEnv({}));
  const a = await connect(room, sockets); await room.message(a, JSON.stringify({ t: 'hi', name: 'A' }));
  const b = await connect(room, sockets); await room.message(b, JSON.stringify({ t: 'hi', name: 'B' }));
  const n0 = b.inbox.length;
  await room.message(a, JSON.stringify({ t: 'st', x: NaN, y: 0, z: 0, yaw: 0 }));
  await room.message(a, JSON.stringify({ t: 'st', x: 1e9, y: 0, z: 0, yaw: 0 }));
  await room.message(a, 'não é json');
  await room.message(a, JSON.stringify({ t: 'st', x: 0, y: 0, z: 0, yaw: 0, sp: 'x' }));
  assert.equal(b.inbox.length, n0 + 1, 'só a última mensagem válida passa (sp inválido vira 0)');
  for (let i = 0; i < 60; i++) await room.message(a, JSON.stringify({ t: 'st', x: i, y: 0, z: 0, yaw: 0 }));
  assert.ok(b.inbox.length - n0 - 1 <= 25, 'limite de 25 msg/s');
  await room.message(a, 'x'.repeat(5000));
});

test('sala cheia e saída avisam os demais', async () => {
  const sockets = []; const room = new RoomCore(makeCtx(sockets), makeEnv({}));
  const first = [];
  for (let i = 0; i < MAX_PLAYERS; i++) { const s = await connect(room, sockets); await room.message(s, JSON.stringify({ t: 'hi', name: 'P' + i })); first.push(s); }
  const extra = await room.fetch(wsReq('abc123'));
  assert.equal(extra.status, 409, 'sala cheia recusa a conexão antes do upgrade');
  const late = new Sock(); // corrida: socket que passou pela checagem ao mesmo tempo
  late.serializeAttachment({ pid: 'zzz', joined: false, name: 'x', look: { el: 'avatar' }, st: null, w: 0, n: 0 });
  await room.message(late, JSON.stringify({ t: 'hi', name: 'Tarde' }));
  assert.equal(late.inbox.at(-1).t, 'err');
  assert.equal(late.closed.code, 1000);
  await room.close(first[0]);
  assert.equal(first[1].inbox.at(-1).t, 'leave');
});

test('aparência é saneada', () => {
  const l = cleanLook({ el: 'lava', skin: '#abc', hair: { x: 1 }, hs: 2, c1: null, evil: '<script>' });
  assert.equal(l.el, 'avatar'); assert.equal(l.skin, '#abc'); assert.equal(l.hair, undefined);
  assert.equal(l.hs, 2); assert.equal(l.c1, null); assert.equal(l.evil, undefined);
});

test('lobby: cria, lista, conta e remove sala vazia', async () => {
  const lobby = new LobbyCore({ blockConcurrencyWhile: async (f) => f(), storage: { get: async () => undefined, put: async () => {} } });
  const c = await (await lobby.fetch(new Request('https://lobby/create', { method: 'POST', body: JSON.stringify({ name: '  Aventura dos Dobradores  ' }) }))).json();
  assert.equal(c.name, 'Aventura dos Dobradores');
  let list = await (await lobby.fetch(new Request('https://lobby/list'))).json();
  assert.equal(list.length, 0, 'sala sem jogadores não aparece');
  await lobby.fetch(new Request('https://lobby/count', { method: 'POST', body: JSON.stringify({ id: c.id, count: 2 }) }));
  list = await (await lobby.fetch(new Request('https://lobby/list'))).json();
  assert.equal(list[0].count, 2); assert.equal(list[0].max, MAX_PLAYERS);
  await lobby.fetch(new Request('https://lobby/count', { method: 'POST', body: JSON.stringify({ id: c.id, count: 0 }) }));
  assert.equal((await (await lobby.fetch(new Request(`https://lobby/exists?id=${c.id}`))).json()).ok, false);
});

test('contagem vai para a sala certa e sobrevive a reinício do objeto', async () => {
  const rooms = { abc123: { id: 'abc123', name: 'Sala', count: 0, created: Date.now() } };
  const lobby = new LobbyCore({ blockConcurrencyWhile: async (f) => f(), storage: { get: async () => rooms, put: async () => {} } });
  const env = { LOBBY: { idFromName: () => 'L', get: () => ({ fetch: (u, init) => lobby.fetch(typeof u === 'string' ? new Request(u, init) : u) }) } };
  const sockets = []; const room = new RoomCore(makeCtx(sockets), env);
  const a = await connect(room, sockets); await room.message(a, JSON.stringify({ t: 'hi', name: 'A' }));
  const list = await (await lobby.fetch(new Request('https://lobby/list'))).json();
  assert.equal(list[0].id, 'abc123'); assert.equal(list[0].count, 1);
  // simula hibernação: novo objeto de núcleo, mesmas conexões
  const room2 = new RoomCore(makeCtx(sockets), env);
  await room2.close(a);
  assert.equal((await (await lobby.fetch(new Request('https://lobby/list'))).json()).length, 0);
});

test('snapshot só do host; eventos vão para o destino com remetente', async () => {
  const sockets = []; const room = new RoomCore(makeCtx(sockets), makeEnv({}));
  const a = await connect(room, sockets); await room.message(a, JSON.stringify({ t: 'hi', name: 'Host' }));
  const b = await connect(room, sockets); await room.message(b, JSON.stringify({ t: 'hi', name: 'Amigo' }));
  const hostPid = a.deserializeAttachment().pid, friendPid = b.deserializeAttachment().pid;
  // snapshot do não-host é descartado; do host chega ao amigo
  await room.message(b, JSON.stringify({ t: 'snap', e: [] }));
  assert.equal(a.inbox.filter((m) => m.t === 'snap').length, 0);
  await room.message(a, JSON.stringify({ t: 'snap', e: [['x']] }));
  assert.equal(b.inbox.filter((m) => m.t === 'snap').length, 1);
  // golpe do amigo vai só para o host, com remetente
  await room.message(b, JSON.stringify({ t: 'ev', to: 'host', k: 'hit', u: 'e1', d: 5 }));
  const hitMsg = a.inbox.filter((m) => m.t === 'ev').at(-1);
  assert.equal(hitMsg.k, 'hit'); assert.equal(hitMsg.from, friendPid); assert.equal(hitMsg.to, undefined);
  // recompensa do host vai só para quem matou
  await room.message(a, JSON.stringify({ t: 'ev', to: friendPid, k: 'reward', xp: 10 }));
  assert.equal(b.inbox.filter((m) => m.t === 'ev' && m.k === 'reward').length, 1);
  assert.equal(a.inbox.filter((m) => m.t === 'ev' && m.k === 'reward').length, 0);
  // se o host sair, o próximo assume: agora o amigo pode enviar snapshot
  await room.close(a);
  const before = a.inbox.filter((m) => m.t === 'snap').length;
  await room.message(b, JSON.stringify({ t: 'snap', e: [] }));
  assert.equal(b.inbox.filter((m) => m.t === 'snap').length, 1, 'amigo recebeu o snapshot anterior, nenhum novo');
  assert.equal(a.inbox.filter((m) => m.t === 'snap').length, before, 'host que saiu não recebe');
  assert.ok(hostPid !== friendPid);
});

/* ---------- modo administrador / terror ---------- */
import { hashCode, MAX_FAILS } from '../src/core.js';
const TEST_SALT = '00112233445566778899aabbccddeeff';
async function adminEnv() {
  const env = makeEnv({});
  env.ADMIN_HASH = '1000:' + TEST_SALT + ':' + (await hashCode('codigo-de-teste', TEST_SALT, 1000));
  return env;
}
async function joinAs(room, sockets, name) {
  const ws = await connect(room, sockets);
  await room.message(ws, JSON.stringify({ t: 'hi', name }));
  return ws;
}
const last = (ws, t) => ws.inbox.filter((m) => m.t === t).at(-1);
const send = (room, ws, o) => room.message(ws, JSON.stringify(o));

test('auth: código certo libera, errado não; só admin em modo liga o terror', async () => {
  const sockets = []; const room = new RoomCore(makeCtx(sockets), await adminEnv());
  const adm = await joinAs(room, sockets, 'Adm'), p2 = await joinAs(room, sockets, 'Jogador');
  await send(room, adm, { t: 'auth', code: 'errado' });
  assert.equal(last(adm, 'auth').ok, false);
  adm.att.la = 0; await send(room, adm, { t: 'auth', code: 'codigo-de-teste' });
  assert.equal(last(adm, 'auth').ok, true);
  // sem entrar no modo admin, não liga o terror
  await send(room, adm, { t: 'adm', k: 'horror', on: true });
  assert.equal(last(adm, 'horror'), undefined);
  await send(room, adm, { t: 'adm', k: 'mode', on: true });
  assert.deepEqual(last(p2, 'admins').admin, [adm.att.pid]);
  assert.deepEqual(last(p2, 'admins').immune, [adm.att.pid]);
  // jogador comum não consegue ligar nem fingir ser admin
  await send(room, p2, { t: 'adm', k: 'mode', on: true });
  await send(room, p2, { t: 'adm', k: 'horror', on: true });
  assert.equal(last(adm, 'horror'), undefined);
  await send(room, adm, { t: 'adm', k: 'horror', on: true });
  assert.equal(last(p2, 'horror').on, true);
  assert.equal(last(adm, 'horror').on, true);
  // novo jogador já entra sabendo do terror
  const p3 = await joinAs(room, sockets, 'Novo');
  assert.equal(last(p3, 'welcome').horror, true);
  assert.deepEqual(last(p3, 'welcome').immune, [adm.att.pid]);
});

test('auth: bloqueia após tentativas erradas e nunca vaza o código', async () => {
  const sockets = []; const room = new RoomCore(makeCtx(sockets), await adminEnv());
  const a = await joinAs(room, sockets, 'A');
  for (let i = 0; i < MAX_FAILS; i++) { a.att.la = 0; await send(room, a, { t: 'auth', code: 'x' + i }); }
  assert.match(last(a, 'auth').msg, /Bloqueado/);
  a.att.la = 0; await send(room, a, { t: 'auth', code: 'codigo-de-teste' }); // mesmo o certo é recusado durante o bloqueio
  assert.equal(last(a, 'auth').ok, false);
  assert.ok(!JSON.stringify(a.inbox).includes('codigo-de-teste'));
  await send(room, a, { t: 'auth', code: 123 }); await send(room, a, { t: 'auth' }); // lixo não derruba o servidor
});

test('terror: frase secreta some do chat, dobras de comuns bloqueadas, termina sem admin', async () => {
  const sockets = []; const room = new RoomCore(makeCtx(sockets), await adminEnv());
  const adm = await joinAs(room, sockets, 'Adm'), p2 = await joinAs(room, sockets, 'Jogador');
  await send(room, p2, { t: 'ev', to: 'all', k: 'chat', m: 'they  will   CATCH you' });
  assert.equal(adm.inbox.filter((m) => m.k === 'chat').length, 0);
  await send(room, p2, { t: 'ev', to: 'all', k: 'chat', m: 'oi' });
  assert.equal(adm.inbox.filter((m) => m.k === 'chat').length, 1);
  await send(room, adm, { t: 'auth', code: 'codigo-de-teste' });
  await send(room, adm, { t: 'adm', k: 'mode', on: true });
  await send(room, adm, { t: 'adm', k: 'horror', on: true });
  await send(room, p2, { t: 'ev', to: 'all', k: 'cast', el: 'fogo' });
  assert.equal(adm.inbox.filter((m) => m.k === 'cast').length, 0, 'dobra de jogador comum é descartada');
  await send(room, adm, { t: 'ev', to: 'all', k: 'cast', el: 'fogo' });
  assert.equal(p2.inbox.filter((m) => m.k === 'cast').length, 1, 'admin pode dobrar');
  await room.close(adm); // o último admin sai: o evento termina sozinho
  assert.equal(last(p2, 'horror').on, false);
});
