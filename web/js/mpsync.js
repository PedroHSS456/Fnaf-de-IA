'use strict';
/* Elemental World — sincronização do mundo no multiplayer (modelo host).
   O host (jogador que entrou primeiro) simula inimigos, objetos quebráveis e pedras, e envia snapshots.
   Os outros jogadores espelham esse estado e enviam os golpes ao host. A recompensa vai para quem matou.
   Sem conexão, nada disto age: o jogo continua single-player. */
(function () {
  const G = window.G, M = G.M, MP = G.mp, W = G.world, En = G.enemies, D = G.dynprops, Dr = G.drag, C = G.combat;
  const SY = (MP.sync = { snapT: 0, fullT: 0, last: new Map(), prevRows: new Map() });
  const r2 = (v) => Math.round(v * 100) / 100;
  const rid = () => Math.random().toString(36).slice(2, 9);
  const send = (m) => MP.send && MP.send(m);

  /* sanitiza o que vem da rede */
  const numIn = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? M.clamp(v, lo, hi) : undefined);
  function pick(o) {
    const r = {}; o = o || {};
    if (typeof o.el === 'string') r.el = o.el.slice(0, 8);
    for (const k of ['burn', 'slow', 'wet', 'stun', 'kb', 'up']) { const v = numIn(o[k], 0, 30); if (v !== undefined) r[k] = v; }
    for (const k of ['kx', 'kz']) { const v = numIn(o[k], -1, 1); if (v !== undefined) r[k] = v; }
    for (const k of ['fx', 'fz']) { const v = numIn(o[k], -3000, 3000); if (v !== undefined) r[k] = v; }
    return r;
  }

  /* ---- golpes: quem não é host envia o dano ao host ---- */
  const deal = C.deal;
  C.deal = function (t, d, o) {
    if (MP.state === 'on' && t && t.uid && t.hurt && !t.train && !MP.isHost()) { // bonecos de treino são locais: o dano é aplicado aqui
      const est = d * C.mult();
      send({ t: 'ev', to: 'host', k: 'hit', u: t.uid, d: r2(d), o: pick(o) });
      G.ui.dmgNum(t.x, t.y + (t.h || 1) + 0.3, t.z, Math.round(est), (o && o.el) || 'neutro');
      return est;
    }
    return deal.apply(this, arguments);
  };

  /* ---- recompensa: quem matou recebe XP e moedas (a fórmula é a do próprio jogador) ---- */
  SY.reward = function (pid, e) {
    send({ t: 'ev', to: pid, k: 'reward', lvl: e.lvl, xp: (e.def && e.def.xp) || 0, boss: !!e.boss, el: e.el || null, type: e.type || null, nome: String(e.nome || '').slice(0, 24) });
  };
  function applyReward(m) {
    const S = G.S; if (!S) return;
    const lvl = numIn(m.lvl, 1, 99) || 1;
    if (m.type === 'porco' || m.type === 'vaca') { const n = m.type === 'vaca' ? M.rint(2, 3) : M.rint(1, 2); G.items.add('carne_crua', n); G.ui.pick('+' + n + ' carne crua'); G.prog.addXp(5); G.quests && G.quests.event('kill', m.type); return; }
    if (m.boss) {
      const el = typeof m.el === 'string' ? m.el.slice(0, 8) : null;
      if (el) S.flags.masters[el] = true;
      S.pts += 2; G.prog.addXp(260 + lvl * 30); S.inv.coins += 80; S.inv.shard++;
      G.ui.banner('Mestre derrotado', String(m.nome || '')); G.ui.pick('+80 moedas, +1 fragmento');
      if (el) G.quests && G.quests.event('master', el);
    } else {
      const xp = (numIn(m.xp, 0, 500) || 0) * (1 + 0.18 * (lvl - 1)) * M.clamp(1 - 0.1 * (S.lvl - lvl), 0.3, 1);
      G.prog.addXp(xp);
      const c = Math.max(1, Math.round(M.rnd(1, 4) * Math.sqrt(lvl))); S.inv.coins += c; G.ui.pick('+' + c + ' moedas');
      if (Math.random() < 0.14) { S.inv.herb++; G.ui.pick('+1 erva'); }
      if (Math.random() < 0.04) { S.inv.ember++; G.ui.pick('+1 brasa'); }
    }
    S.stats.kills++; G.quests && G.quests.event('kill', typeof m.type === 'string' ? m.type : 'boss');
  }

  /* ---- host: aplica golpes recebidos ---- */
  function onHit(m) {
    if (typeof m.u !== 'string' || m.u.length > 12) return;
    const t = En.list.find((q) => q.uid === m.u) || D.list.find((q) => q.uid === m.u);
    if (!t || !t.alive) return;
    const d = numIn(m.d, 0, 500) || 0, o = pick(m.o); o.remote = m.from;
    const real = t.hurt(d, o);
    if (real > 0 && o.kb && o.fx != null && t.knock) {
      let dx = t.x - o.fx, dz = t.z - o.fz; const l = Math.hypot(dx, dz) || 1;
      t.knock(dx / l, dz / l, o.kb, o.up || 0);
    }
  }

  /* ---- host: monta o snapshot (só o que mudou; completo a cada 3 s) ---- */
  function build(dt) {
    SY.snapT -= dt; if (SY.snapT > 0) return null;
    SY.snapT = 0.25; SY.fullT -= 0.25;
    const full = SY.fullT <= 0; if (full) { SY.fullT = 3; SY.last.clear(); }
    const out = { t: 'snap', h: r2(G.env.hour), full: full ? 1 : 0, e: [], dd: [], rr: [], bd: Object.keys(MP.bossDead) };
    const put = (arr, key, row) => { const s = JSON.stringify(row); if (SY.last.get(key) !== s) { SY.last.set(key, s); arr.push(row); } };
    // inimigos que saíram da lista (morreram e foram removidos pelo host) recebem uma última linha com alive = 0
    const rows = new Map();
    for (const e of En.list) {
      if (!e.uid) continue;
      const row = [e.uid, e.boss ? 'B' + (e.arena ? e.arena.id : e.el) : e.type, e.lvl, r2(e.x), r2(e.z), Math.round(e.hp), e.hpMax, e.alive ? 1 : 0, e.state, e.camp ? En.camps.indexOf(e.camp) : -1, r2(e.yaw)];
      rows.set(e.uid, row); put(out.e, e.uid, row);
    }
    for (const [u, row] of SY.prevRows) if (!rows.has(u)) { const dead = row.slice(); dead[7] = 0; put(out.e, u, dead); SY.last.delete(u); }
    SY.prevRows = rows;
    for (const p of D.list) if (p.uid) put(out.dd, p.uid, [p.uid, r2(p.x), r2(p.z), p.alive ? 1 : 0, Math.round(p.hp)]);
    for (const it of Dr.items) { if (!it.uid) it.uid = rid(); put(out.rr, it.uid, [it.uid, it.k, r2(it.x), r2(it.y), r2(it.z), r2(it.yaw || 0)]); }
    out.np = G.npcs.list.map((n, i) => [i, r2(n.x), r2(n.z), r2(n.yaw || 0), n.inside ? 1 : 0]);
    return out;
  }

  /* ---- não-host: espelha o snapshot ---- */
  function removeEnemy(e) {
    e.alive = false;
    let i = En.list.indexOf(e); if (i >= 0) En.list.splice(i, 1);
    i = En.bosses.indexOf(e); if (i >= 0) En.bosses.splice(i, 1);
    if (e.camp) { const j = e.camp.members.indexOf(e); if (j >= 0) e.camp.members.splice(j, 1); }
  }
  function removeDyn(p) {
    p.alive = false; if (p.col) p.col.alive = false;
    let i = D.list.indexOf(p); if (i >= 0) D.list.splice(i, 1);
    i = W.dyn.indexOf(p.col); if (i >= 0) W.dyn.splice(i, 1);
    G.fx.burst(p.x, p.y + 0.6, p.z, 14, [0.7, 0.5, 0.3], 4, 0.4, 0.6, false, 4);
  }
  function apply(m) {
    if (typeof m.h === 'number' && m.h >= 0 && m.h < 24) G.env.hour = m.h; // mesmo horário do mundo (rotina dos NPCs)
    for (const r of m.np || []) { // NPCs: posição decidida pelo host
      const n = Array.isArray(r) && G.npcs.list[r[0]]; if (!n) continue;
      n.x = numIn(r[1], -5000, 5000) || 0; n.z = numIn(r[2], -5000, 5000) || 0; n.yaw = numIn(r[3], -1e3, 1e3) || 0; n.inside = !!r[4];
    }
    const seenE = new Set(), seenR = new Set();
    for (const r of m.e || []) {
      if (!Array.isArray(r) || typeof r[0] !== 'string') continue;
      const [u, ty, lvl, x, z, hp, hm, al, st, ci, yaw] = r; seenE.add(u);
      let e = En.list.find((q) => q.uid === u);
      if (!e) {
        if (!al) continue;
        try {
          if (typeof ty === 'string' && ty[0] === 'B') {
            const ar = W.arenas.find((a) => a.id === ty.slice(1)); if (!ar) continue;
            e = En.mkBoss(ar); e.arena = ar; En.bosses.push(e);
          } else e = En.mk(String(ty), x, z, numIn(lvl, 1, 20) || 1, null);
        } catch (err) { SY.lastErr = String(err && err.message || err); continue; }
        e.uid = u; e.mirror = true; e.x = x; e.z = z; e.y = W.groundY(x, z); e.yaw = yaw;
        En.list.push(e);
        const cp = ci >= 0 && En.camps[ci]; if (cp) { e.camp = cp; cp.spawned = true; if (!cp.members.includes(e)) cp.members.push(e); }
      }
      e.mirror = true; e.tx = x; e.tz = z; e.tyaw = yaw; e.hp = hp; e.hpMax = hm; e.state = st; e.alive = !!al;
      if (!al) removeEnemy(e);
    }
    if (m.full) for (let i = En.list.length - 1; i >= 0; i--) { const e = En.list[i]; if (e.mirror && !seenE.has(e.uid)) removeEnemy(e); }
    for (const r of m.dd || []) {
      const p = Array.isArray(r) && D.list.find((q) => q.uid === r[0]); if (!p) continue;
      p.x = r[1]; p.z = r[2]; p.hp = r[4]; if (!r[3] && p.alive) removeDyn(p);
    }
    for (const r of m.rr || []) {
      if (!Array.isArray(r) || typeof r[0] !== 'string') continue;
      let it = Dr.items.find((q) => q.uid === r[0]);
      if (!it) { Dr.addAt(String(r[1]), r[2], r[3], r[4]); it = Dr.items[Dr.items.length - 1]; it.uid = r[0]; }
      seenR.add(r[0]); if (Dr.held === it) continue; it.x = r[2]; it.y = r[3]; it.z = r[4]; it.yaw = r[5];
    }
    // remove as pedras locais que não são do host (criadas no início do jogo)
    for (let i = Dr.items.length - 1; i >= 0; i--) { const it = Dr.items[i]; if (!it.uid || (m.full && !seenR.has(it.uid))) Dr.items.splice(i, 1); }
    for (const b of m.bd || []) if (typeof b === 'string') MP.bossDead[b.slice(0, 8)] = true;
  }

  /* ---- entrada de mensagens ---- */
  SY.onMsg = function (m) {
    if (m.t === 'snap') { if (!MP.isHost()) apply(m); return; }
    if (m.t === 'ev') {
      if (m.k === 'hit' && MP.isHost()) onHit(m);
      else if (m.k === 'reward') applyReward(m);
      else if (m.k === 'hurt' || m.k === 'pvp') applyHurt(m);
      else if (m.k === 'al') SY.dead[m.from] = !m.v;
      else if (m.k === 'cast') castFx(m);
      else if (m.k === 'dum') ghostDum(m);
      else if (m.k === 'bn') { G.ui.banner(String(m.a || '').slice(0, 40), String(m.b || '').slice(0, 80)); if (m.c || m.x) G.events.onWin(m); }
      else if (MP.isHost() && (m.k === 'grab' || m.k === 'dpos' || m.k === 'rel')) onDrag(m);
    }
  };

  /* ---- alvos remotos: inimigos perseguem/ferem outros jogadores; fogo amigo ---- */
  SY.dead = {};
  const ffOn = () => !!(G.save && G.save.settings && G.save.settings.ff);
  const pxs = new Map(), pvp = new Map();
  function mkT(pid, kind) {
    return { pid, uid: undefined, alive: true, r: 0.45, h: 1.8, x: 0, y: 0, z: 0, vx: 0, vz: 0, iframes: 0, yaw: 0, knock() {},
      hurt(d, o) { if (kind === 'pvp' && !ffOn()) return 0; send({ t: 'ev', to: pid, k: kind, d: r2(d), o: pick(o) }); return d; } };
  }
  function list(map, kind) {
    const out = [];
    for (const [pid, r] of MP.players) {
      if (!r.seen) continue;
      let t = map.get(pid); if (!t) { t = mkT(pid, kind); map.set(pid, t); }
      t.x = r.x; t.y = r.y; t.z = r.z; t.alive = !SY.dead[pid]; out.push(t);
    }
    return out;
  }
  MP.proxies = () => (MP.state === 'on' ? list(pxs, 'hurt') : []);
  MP.pvpTargets = () => (MP.state === 'on' && ffOn() ? list(pvp, 'pvp').filter((t) => t.alive) : []);
  function applyHurt(m) {
    const P = G.player; if (!P || !P.alive) return;
    if (m.k === 'pvp' && !ffOn()) return;
    const d = numIn(m.d, 0, 400) || 0; if (!d) return;
    const o = pick(m.o);
    if (o.kx === undefined && o.fx !== undefined) { const dx = P.x - o.fx, dz = P.z - o.fz, l = Math.hypot(dx, dz) || 1; o.kx = dx / l; o.kz = dz / l; }
    P.hurt(d, o);
  }
  /* inimigo escolhe o alvo: quem o atacou por último, ou o jogador mais próximo */
  MP.withTarget = function (e, fn) {
    const px = MP.proxies(); const me = G.player;
    if (!px.length) return fn();
    if (e.state === 'idle' || e.state === 'return') e.aggroPid = null;
    let best = null;
    if (e.aggroPid && e.aggroPid !== 'me') { best = px.find((q) => q.pid === e.aggroPid) || null; if (!best) e.aggroPid = null; }
    if (!best && e.aggroPid !== 'me') {
      let bd = me.alive ? Math.hypot(me.x - e.x, me.z - e.z) : 1e9;
      for (const q of px) { if (!q.alive) continue; const d = Math.hypot(q.x - e.x, q.z - e.z); if (d < bd) { bd = d; best = q; } }
    }
    if (!best) return fn();
    G.player = best; try { fn(); } finally { G.player = me; }
  };

  /* ---- objetos carregados por outros jogadores ---- */
  SY.onGrab = (it) => { if (MP.state === 'on' && !MP.isHost() && it.uid) send({ t: 'ev', to: 'host', k: 'grab', u: it.uid }); };
  SY.onRelease = (it, vx, vy, vz, th) => { if (MP.state === 'on' && !MP.isHost() && it.uid) send({ t: 'ev', to: 'host', k: 'rel', u: it.uid, vx: r2(vx), vy: r2(vy), vz: r2(vz), th: th ? 1 : 0, x: r2(it.x), y: r2(it.y), z: r2(it.z) }); };
  let heldT = 0;
  SY.sendHeld = (it, dt) => { heldT -= dt; if (heldT > 0 || !it.uid) return; heldT = 0.1; send({ t: 'ev', to: 'host', k: 'dpos', u: it.uid, x: r2(it.x), y: r2(it.y), z: r2(it.z), yaw: r2(it.yaw || 0) }); };
  function onDrag(m) {
    const it = typeof m.u === 'string' ? Dr.items.find((q) => q.uid === m.u) : null; if (!it) return;
    if (m.k === 'grab') { if (!it.held) { it.held = true; it.owner = m.from; it.ownT = performance.now(); it.sleep = false; } return; }
    if (it.owner !== m.from) return;
    it.ownT = performance.now();
    const x = numIn(m.x, -3000, 3000), y = numIn(m.y, -200, 600), z = numIn(m.z, -3000, 3000);
    if (x !== undefined && y !== undefined && z !== undefined) { it.x = x; it.y = y; it.z = z; }
    if (m.k === 'dpos') { const w = numIn(m.yaw, -1e3, 1e3); if (w !== undefined) it.yaw = w; return; }
    it.held = false; it.owner = null; it.sleep = false;
    it.vx = numIn(m.vx, -60, 60) || 0; it.vy = numIn(m.vy, -60, 60) || 0; it.vz = numIn(m.vz, -60, 60) || 0;
    it.thrown = !!m.th; if (it.thrown) it.hits = new Set();
  }

  /* ---- ataques dos outros jogadores: efeito visual (o dano vem pelo golpe) ---- */
  const bt = G.bend.track;
  G.bend.track = function (it) {
    if (MP.state === 'on' && it) send({ t: 'ev', to: 'all', k: 'cast', el: String(it.el || '').slice(0, 8), sh: String(it.shape || '').slice(0, 10), yaw: r2(it.yaw || 0), ch: r2(it.charge || 0), sp: r2(it.speed || 0), ln: r2(it.len || 0), cv: r2(it.curve || 0), sd: it.side || 0, pw: r2(it.power || 1), rg: r2(it.range || 10), sz: r2(it.size || 1), tx: r2(it.tx || 0), tz: r2(it.tz || 0) });
    return bt.apply(this, arguments);
  };
  /* repete o poder de outro jogador só como visual (sem dano, sem paredes sólidas) */
  function replay(r, m) {
    const E = G.elements[m.el], B = G.bend, sh = B.SHAPES[m.sh], fn = E && E.shapes && E.shapes[m.sh];
    if (!fn || !sh) return false;
    const yaw = numIn(m.yaw, -1e3, 1e3) || 0, dx = Math.sin(yaw), dz = Math.cos(yaw), me = G.player;
    const pr = Object.create(me); pr.x = r.x; pr.y = r.y; pr.z = r.z; pr.yaw = yaw; pr.vx = pr.vz = 0; pr.el = () => m.el;
    const n = (v, lo, hi, d) => { const q = numIn(v, lo, hi); return q === undefined ? d : q; };
    const it = { el: m.el, shape: m.sh, yaw, dirx: dx, dirz: dz, x: r.x + dx * 0.7, y: r.y + 1.25, z: r.z + dz * 0.7, px: r.x, pz: r.z,
      charge: n(m.ch, 0, 1, 0.5), speed: n(m.sp, 0, 1, 0.6), len: n(m.ln, 0, 1, 0.6), curve: n(m.cv, -1, 1, 0), side: m.sd === -1 ? -1 : m.sd === 1 ? 1 : 0,
      power: n(m.pw, 0.3, 2, 1), range: n(m.rg, 1, 60, 10), size: n(m.sz, 0.3, 3, 1), target: null, cost: 0, quick: false,
      tx: n(m.tx, -3000, 3000, r.x + dx * 10), tz: n(m.tz, -3000, 3000, r.z + dz * 10), mul: 1, dmg: 0 };
    const np = B.projs.length, nz = B.zones.length, ns = B.structs.length, no = B.orbs.length;
    B.ghostMode = true; G.player = pr;
    try { fn(it); } catch (e) { SY.lastErr = String(e && e.message || e); return false; }
    finally { G.player = me; B.ghostMode = false; }
    B.orbs.length = no; // esferas seguradas seguem a mão do jogador local: não repetir
    for (let i = np; i < B.projs.length; i++) { B.projs[i].ghost = true; B.projs[i].dmg = 0; }
    for (let i = nz; i < B.zones.length; i++) { B.zones[i].ghost = true; B.zones[i].dps = 0; }
    for (let i = ns; i < B.structs.length; i++) { B.structs[i].solid = false; }
    return true;
  }
  /* bonecos de treino de outro jogador: aparecem para todos, mas só como visual */
  const ghostBy = new Map();
  SY.dummies = (l) => { if (MP.state === 'on' && !MP.isHost()) send({ t: 'ev', to: 'all', k: 'dum', l }); };
  function dropGhosts(pid) {
    for (const e of ghostBy.get(pid) || []) { const i = En.ghosts.indexOf(e); if (i >= 0) En.ghosts.splice(i, 1); }
    ghostBy.delete(pid);
  }
  function ghostDum(m) {
    dropGhosts(m.from);
    if (!Array.isArray(m.l)) return;
    const mine = [];
    for (const r of m.l.slice(0, 8)) {
      if (!Array.isArray(r)) continue;
      const x = numIn(r[0], -3000, 3000), z = numIn(r[1], -3000, 3000), yaw = numIn(r[2], -1e3, 1e3) || 0;
      if (x === undefined || z === undefined) continue;
      try {
        const e = En.mk('boneco', x, z, 1, null);
        e.x = x; e.z = z; e.y = W.groundY(x, z); e.yaw = yaw; e.alive = true; e.ghost = true; e.exp = performance.now() + 130000;
        En.ghosts.push(e); mine.push(e);
      } catch (err) { SY.lastErr = String(err && err.message || err); }
    }
    if (mine.length) ghostBy.set(m.from, mine);
  }
  function castFx(m) {
    const r = MP.players.get(m.from); if (!r || !r.seen) return;
    if (replay(r, m)) { G.audio.sfxAt ? G.audio.sfxAt('cast_' + (m.el || 'fogo'), r.x, r.z) : G.audio.sfx('cast_' + (m.el || 'fogo')); return; }
    const el = G.elements[m.el]; const col = (el && el.col) || [1, 1, 1], yaw = numIn(m.yaw, -1e3, 1e3) || 0;
    const big = m.sh === 'ring' || m.sh === 'slam';
    for (let i = 1; i <= (big ? 3 : 5); i++) {
      const d = big ? 0 : i * 1.6;
      G.fx.burst(r.x + Math.sin(yaw) * d, r.y + 1.1, r.z + Math.cos(yaw) * d, 8, col, 3, 0.4, 0.5, true, 0);
    }
    if (big) G.fx.ring(r.x, r.y + 0.4, r.z, 0.8, 30, col, true, 0.4);
    G.audio.sfx('cast_' + (el ? m.el : 'fogo'));
  }

  /* ---- por quadro ---- */
  SY.update = function (dt) {
    if (MP.state !== 'on') return;
    for (const e of En.ghosts) e.t = (e.t || 0) + dt;
    for (const [pid, l] of [...ghostBy]) if (!MP.players.has(pid) || (l[0] && performance.now() > l[0].exp)) dropGhosts(pid);
    const al = G.player.alive ? 1 : 0; if (al !== SY.al) { SY.al = al; send({ t: 'ev', to: 'all', k: 'al', v: al }); }
    if (MP.isHost()) {
      for (const e of En.list) e.mirror = false;
      for (const it of Dr.items) if (it.owner && performance.now() - it.ownT > 3000) { it.held = false; it.owner = null; }
      const m = build(dt); if (m) send(m);
    } else {
      const k = Math.min(1, dt * 8);
      for (const e of En.list) {
        if (!e.mirror || e.tx === undefined) continue;
        if (e.def && e.def.animal) { e.sndT = (e.sndT == null ? 3 : e.sndT) - dt; if (e.sndT <= 0) { e.sndT = 7 + Math.random() * 11; G.audio.sfxAt(e.def.snd, e.x, e.z); } }
        e.x += (e.tx - e.x) * k; e.z += (e.tz - e.z) * k; e.y = W.groundY(e.x, e.z);
        e.yaw = M.lerpAng(e.yaw, e.tyaw, Math.min(1, dt * 10));
      }
    }
  };

  /* ---- ao sair da sala: espelhos somem e o jogo volta a ser local ---- */
  SY.clear = function () {
    SY.dead = {}; SY.al = undefined; pxs.clear(); pvp.clear(); for (const pid of [...ghostBy.keys()]) dropGhosts(pid);
    for (let i = En.list.length - 1; i >= 0; i--) if (En.list[i].mirror) { En.list[i].alive = false; En.list.splice(i, 1); }
    for (let i = En.bosses.length - 1; i >= 0; i--) if (!En.list.includes(En.bosses[i])) En.bosses.splice(i, 1);
    for (const c of En.camps) { c.spawned = false; c.left = 0; c.members = []; }
    MP.bossDead = {};
  };
})();
