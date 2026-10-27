// Lógica do servidor de salas, independente do runtime (testável em Node).
// Mensagens são JSON. Cliente -> servidor: hi, look, st. Servidor -> cliente: hello, welcome, join, leave, look, st, err.

export const MAX_PLAYERS = 8;
export const MAX_MSG = 2048;      // bytes por mensagem
export const MAX_SNAP = 32768;    // snapshot do host (mundo compartilhado)
export const RATE = 25;           // mensagens por segundo, por conexão
export const MAX_ROOMS = 200;
const ELEMENTS = ['fogo', 'agua', 'terra', 'ar', 'avatar'];
const LOOK_KEYS = ['el', 'skin', 'hair', 'hs', 'c1', 'c2', 'c3', 'trim'];

export const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
};
export const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', ...CORS } });

const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
export const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, n);
export const randomId = (n) => {
  const a = new Uint8Array(n), chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  crypto.getRandomValues(a);
  return Array.from(a, (b) => chars[b % chars.length]).join('');
};

export function cleanLook(l) {
  const o = { el: 'avatar' };
  if (!l || typeof l !== 'object') return o;
  for (const k of LOOK_KEYS) {
    const v = l[k];
    if (v === null) o[k] = null;
    else if (typeof v === 'string' && v.length <= 16) o[k] = v;
    else if (typeof v === 'number' && Number.isFinite(v)) o[k] = v;
  }
  if (!ELEMENTS.includes(o.el)) o.el = 'avatar';
  return o;
}

/* ---------- Modo administrador (terror): o código nunca vai para o cliente ---------- */
export const PHRASE = 'THEY WILL CATCH YOU';
export const normPhrase = (s) => String(s ?? '').toUpperCase().replace(/\s+/g, ' ').trim();
// PBKDF2-SHA256 (100 mil voltas) com salt: só o hash fica aqui, nunca o código.
// Para trocar o código sem mexer no código-fonte, defina ADMIN_HASH no Cloudflare como "iterações:salt:hash"
// (gere com: node server/tools/gen-admin-hash.mjs NOVO_CODIGO).
const DEFAULT_ADMIN = '100000:4d385f71348895c27596a1434e29e9bd:f810c8cf75e14ef2c82a8fad80bbdcdedc9d3e677c798d6fbaf5f6f868cf0b22';
const hex2 = (x) => Uint8Array.from(x.match(/../g) || [], (b) => parseInt(b, 16));
const toHex = (u) => Array.from(u, (b) => b.toString(16).padStart(2, '0')).join('');
export async function hashCode(code, saltHex, iter) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits']);
  return toHex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: hex2(saltHex), iterations: iter }, key, 256)));
}
const safeEq = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
export const MAX_FAILS = 5, LOCK_MS = 5 * 60 * 1000;

/* ---------- Lobby: lista de salas ---------- */
export class LobbyCore {
  constructor(ctx) {
    this.ctx = ctx;
    this.rooms = null;
    this.ready = ctx.blockConcurrencyWhile ? ctx.blockConcurrencyWhile(async () => { this.rooms = (await ctx.storage.get('rooms')) || {}; }) : (this.rooms = {});
  }
  async save() { await this.ctx.storage.put('rooms', this.rooms); }
  async fetch(req) {
    await this.ready;
    const u = new URL(req.url);
    if (req.method === 'GET' && u.pathname === '/list') {
      const list = Object.values(this.rooms).filter((r) => r.count > 0)
        .sort((a, b) => b.created - a.created).slice(0, 50)
        .map((r) => ({ id: r.id, name: r.name, count: r.count, max: MAX_PLAYERS }));
      return json(list);
    }
    if (req.method === 'POST' && u.pathname === '/create') {
      const body = await req.json().catch(() => ({}));
      if (Object.keys(this.rooms).length >= MAX_ROOMS) return json({ error: 'Muitas salas abertas. Tente mais tarde.' }, 503);
      const id = randomId(8), name = clean(body.name, 32) || 'Sala';
      this.rooms[id] = { id, name, count: 0, created: Date.now() };
      await this.save();
      return json({ id, name });
    }
    if (req.method === 'POST' && u.pathname === '/count') {
      const b = await req.json().catch(() => ({}));
      const r = this.rooms[b.id];
      if (r) {
        r.count = Math.max(0, Math.min(MAX_PLAYERS, b.count | 0));
        if (r.count === 0) delete this.rooms[b.id];
        await this.save();
      }
      return json({ ok: true });
    }
    if (req.method === 'GET' && u.pathname === '/exists') return json({ ok: !!this.rooms[u.searchParams.get('id')] });
    return json({ error: 'não encontrado' }, 404);
  }
}

/* ---------- Room: uma partida ---------- */
export class RoomCore {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.bans = new Map(); this._h = undefined; }

  /* estado do terror da sala (sobrevive à hibernação do Durable Object) */
  async horrorOn() {
    if (this._h === undefined) { try { this._h = !!(await this.ctx.storage?.get?.('horror')); } catch (e) { this._h = false; } }
    return this._h;
  }
  async setHorror(v) { this._h = !!v; try { await this.ctx.storage?.put?.('horror', this._h); } catch (e) { /* sem storage: fica em memória */ } }
  inMode(a) { return !!(a && a.adm && a.mode); }
  adminList() {
    const admin = [], immune = [];
    for (const s of this.joined()) { const o = s.deserializeAttachment(); if (this.inMode(o)) { admin.push(o.pid); if (o.imm !== false) immune.push(o.pid); } }
    return { admin, immune };
  }
  broadcastAdmins() { this.broadcast({ t: 'admins', ...this.adminList() }); }
  async maybeEndHorror() {
    if (!(await this.horrorOn())) return;
    if (this.joined().some((s) => this.inMode(s.deserializeAttachment()))) return;
    await this.setHorror(false);
    this.broadcast({ t: 'horror', on: false, by: null });
  }

  lobby() { return this.env.LOBBY.get(this.env.LOBBY.idFromName('main')); }
  async reportCount(room, n) {
    try {
      await this.lobby().fetch('https://lobby/count', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: room, count: n }),
      });
    } catch (e) { /* lobby indisponível: a sala continua funcionando */ }
  }
  joined() { return this.ctx.getWebSockets().filter((s) => s.deserializeAttachment() && s.deserializeAttachment().joined); }
  /* host = jogador que entrou primeiro (menor seq); se ele sair, o próximo assume */
  hostSock() {
    let best = null, bseq = Infinity;
    for (const s of this.joined()) { const q = s.deserializeAttachment().seq; if (q < bseq) { bseq = q; best = s; } }
    return best;
  }
  sockByPid(pid) { return this.joined().find((s) => s.deserializeAttachment().pid === pid) || null; }
  broadcast(msg, except) {
    const text = JSON.stringify(msg);
    for (const s of this.joined()) if (s !== except) { try { s.send(text); } catch (e) { /* conexão morta */ } }
  }

  async fetch(req) {
    if (req.headers.get('upgrade') !== 'websocket') return new Response('esperado websocket', { status: 426 });
    const u = new URL(req.url);
    // o id da sala fica na própria conexão: sobrevive à hibernação do Durable Object
    const room = clean(u.searchParams.get('id'), 12);
    if (this.joined().length >= MAX_PLAYERS) return json({ error: 'Sala cheia' }, 409);
    const ip = clean(req.headers.get('cf-connecting-ip'), 45);
    const ban = this.bans.get(ip);
    if (ip && ban && ban.until > Date.now()) return json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, 429);
    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ pid: randomId(6), seq: Date.now() * 1000 + Math.floor(Math.random() * 1000), room, joined: false, name: 'Player', look: { el: 'avatar' }, st: null, w: 0, n: 0, ip, adm: false, mode: false, imm: true, fails: 0, la: 0, lock: 0 });
    server.send(JSON.stringify({ t: 'hello', pid: server.deserializeAttachment().pid }));
    return new Response(null, { status: 101, webSocket: client });
  }

  async message(ws, raw) {
    if (typeof raw !== 'string' || raw.length > (raw.startsWith('{"t":"snap"') ? MAX_SNAP : MAX_MSG)) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    const a = ws.deserializeAttachment();
    if (!a || !m || typeof m !== 'object') return;
    const now = Date.now();
    if (now - a.w > 1000) { a.w = now; a.n = 0; }
    if (++a.n > RATE) return; // limite de taxa: descarta excesso
    if (m.t === 'hi') {
      if (a.joined) return;
      const others = this.joined();
      if (others.length >= MAX_PLAYERS) { ws.send(JSON.stringify({ t: 'err', msg: 'Sala cheia.' })); ws.close(1000, 'full'); return; }
      a.name = clean(m.name, 16) || 'Player';
      a.look = cleanLook(m.look);
      a.joined = true;
      ws.serializeAttachment(a);
      const players = others.map((s) => { const o = s.deserializeAttachment(); return { pid: o.pid, name: o.name, look: o.look, seq: o.seq, ...(o.st || {}) }; });
      ws.send(JSON.stringify({ t: 'welcome', pid: a.pid, seq: a.seq, players, horror: await this.horrorOn(), ...this.adminList() }));
      this.broadcast({ t: 'join', p: { pid: a.pid, name: a.name, look: a.look, seq: a.seq } }, ws);
      await this.reportCount(a.room, this.joined().length);
      return;
    }
    if (!a.joined) return;
    if (m.t === 'auth') return this.auth(ws, m);
    if (m.t === 'adm') return this.admin(ws, m);
    if (m.t === 'st') {
      if (!(num(m.x, -2000, 2000) && num(m.z, -2000, 2000) && num(m.y, -200, 500) && num(m.yaw, -1e4, 1e4))) return;
      const sp = num(m.sp, 0, 30) ? m.sp : 0;
      a.st = { x: m.x, y: m.y, z: m.z, yaw: m.yaw, sp };
      ws.serializeAttachment(a);
      this.broadcast({ t: 'st', p: a.pid, ...a.st }, ws);
    } else if (m.t === 'snap') {
      // só o host envia o estado do mundo; os outros recebem
      const h = this.hostSock();
      if (!h || h !== ws) return;
      this.broadcast({ ...m, t: 'snap' }, ws);
    } else if (m.t === 'ev') {
      if (m.k === 'chat' && normPhrase(m.m) === PHRASE) return; // a frase secreta nunca chega ao chat
      if (m.k === 'hzent' && !this.inMode(a)) return; // só admin invoca a criatura
      if (m.k === 'fnafend' && !this.inMode(a)) return; // só admin encerra o FNAF de todos
      if (m.k === 'cast' && !this.inMode(a) && (await this.horrorOn())) return; // dobras bloqueadas durante o terror
      // evento direcionado: { to: 'host' | 'all' | pid, k, ... }; o servidor põe o remetente em 'from'
      const { to, ...rest } = m; const body = JSON.stringify({ ...rest, t: 'ev', from: a.pid });
      if (body.length > MAX_MSG) return;
      if (to === 'host') { const h = this.hostSock(); if (h && h !== ws) h.send(body); }
      else if (to === 'all') { for (const s of this.joined()) if (s !== ws) { try { s.send(body); } catch (e) { /* conexão morta */ } } }
      else if (typeof to === 'string') { const t = this.sockByPid(to); if (t && t !== ws) { try { t.send(body); } catch (e) { /* conexão morta */ } } }
    } else if (m.t === 'look') {
      a.look = cleanLook(m.look);
      ws.serializeAttachment(a);
      this.broadcast({ t: 'look', p: a.pid, look: a.look }, ws);
    }
  }

  async close(ws) {
    const a = ws.deserializeAttachment();
    if (!a || !a.joined) return;
    a.joined = false; ws.serializeAttachment(a);
    this.broadcast({ t: 'leave', p: a.pid });
    if (a.adm && a.mode) { this.broadcastAdmins(); await this.maybeEndHorror(); }
    await this.reportCount(a.room, this.joined().length);
  }

  /* ---------- autenticação e ações de administrador (tudo validado aqui) ---------- */
  async auth(ws, m) {
    const reply = (o) => { try { ws.send(JSON.stringify({ t: 'auth', ...o })); } catch (e) { /* conexão morta */ } };
    let a = ws.deserializeAttachment();
    const now = Date.now();
    if (a.adm) return reply({ ok: true, horror: await this.horrorOn(), ...this.adminList() });
    if (now < (a.lock || 0)) return reply({ ok: false, msg: 'Bloqueado. Aguarde ' + Math.ceil((a.lock - now) / 1000) + 's.' });
    if (now - (a.la || 0) < 1000) return;
    a.la = now; ws.serializeAttachment(a);
    const [it, salt, hash] = String(this.env?.ADMIN_HASH || DEFAULT_ADMIN).split(':');
    let ok = false;
    if (typeof m.code === 'string' && m.code.length > 0 && m.code.length <= 64) ok = safeEq(await hashCode(m.code, salt, +it), hash);
    a = ws.deserializeAttachment();
    if (ok) { a.adm = true; a.fails = 0; ws.serializeAttachment(a); return reply({ ok: true, horror: await this.horrorOn(), ...this.adminList() }); }
    a.fails = (a.fails || 0) + 1;
    if (a.fails >= MAX_FAILS) {
      const n = ((this.bans.get(a.ip) || {}).n || 0) + 1, ms = LOCK_MS * n;
      if (a.ip) this.bans.set(a.ip, { n, until: now + ms });
      a.lock = now + ms; a.fails = 0; ws.serializeAttachment(a);
      return reply({ ok: false, msg: 'Muitas tentativas. Bloqueado por ' + Math.round(ms / 60000) + ' min.' });
    }
    ws.serializeAttachment(a);
    reply({ ok: false, msg: 'Código incorreto.' });
  }
  async admin(ws, m) {
    const a = ws.deserializeAttachment();
    if (!a || !a.adm) return;
    if (m.k === 'mode') {
      a.mode = !!m.on; ws.serializeAttachment(a);
      ws.send(JSON.stringify({ t: 'adm', k: 'mode', on: a.mode }));
      this.broadcastAdmins();
      if (!a.mode) await this.maybeEndHorror();
    } else if (m.k === 'imm') {
      a.imm = !!m.on; ws.serializeAttachment(a); this.broadcastAdmins();
    } else if (m.k === 'horror' && a.mode) {
      await this.setHorror(!!m.on);
      this.broadcast({ t: 'horror', on: !!m.on, by: a.pid });
    }
  }
}
