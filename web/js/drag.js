'use strict';
/* Elemental World — sistema de pegar, carregar, arrastar e lançar objetos (cadeiras, mesas, caixas, troncos, pedras...).
   Leves ficam levantados na frente do jogador; pesados são arrastados no chão e deixam o jogador mais lento.
   Objetos lançados causam dano e empilham sobre superfícies planas. */
(function () {
  const G = window.G, M = G.M, W = G.world, gfx = G.gfx, H = M.hex;
  const Dr = (G.drag = { items: [], held: null });
  const I = (px, py, pz, sx, sy, sz, ry) => M.trs(new Float32Array(16), px, py, pz, 0, ry || 0, 0, sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
  const KIND = {
    chair: { nome: 'Cadeira', r: 0.38, h: 0.95, m: 1 },
    stool: { nome: 'Banquinho', r: 0.32, h: 0.55, m: 1 },
    table: { nome: 'Mesa', r: 0.75, h: 0.8, m: 3, drag: true, flat: true },
    crate: { nome: 'Caixa', r: 0.5, h: 0.9, m: 2, flat: true },
    barrel: { nome: 'Barril', r: 0.45, h: 1.0, m: 2, flat: true },
    log: { nome: 'Tronco', r: 0.65, h: 0.55, m: 3, drag: true, flat: true },
    rock: { nome: 'Pedra', r: 0.55, h: 0.7, m: 4, drag: true, flat: true },
    jar: { nome: 'Jarro', r: 0.28, h: 0.6, m: 1 },
    sack: { nome: 'Saco', r: 0.4, h: 0.6, m: 1.5 },
  };
  Dr.KIND = KIND;
  const mesh = {};
  Dr.init = function () {
    const mk = (fn) => { const b = new gfx.MB(0.05); fn(b); return b.build(); };
    const wood = H('#9a6e40'), dark = H('#6a4a2a');
    mesh.chair = mk((b) => { b.box(I(0, 0.48, 0, 0.6, 0.08, 0.6), wood); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(I(x * 0.24, 0.22, z * 0.24, 0.07, 0.44, 0.07), dark); b.box(I(0, 0.8, -0.27, 0.6, 0.5, 0.07), wood); });
    mesh.stool = mk((b) => { b.cyl(I(0, 0.45, 0, 0.55, 0.08, 0.55), 8, 0.5, 0.5, wood, true, true); for (const a of [0, 2.1, 4.2]) b.box(I(Math.cos(a) * 0.15, 0.22, Math.sin(a) * 0.15, 0.07, 0.45, 0.07), dark); });
    mesh.table = mk((b) => { b.box(I(0, 0.76, 0, 1.5, 0.08, 1.0), wood); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(I(x * 0.65, 0.38, z * 0.4, 0.09, 0.76, 0.09), dark); });
    mesh.crate = mk((b) => { b.box(I(0, 0.45, 0, 0.9, 0.9, 0.9), H('#a87a45')); b.box(I(0, 0.45, 0, 0.95, 0.12, 0.95), dark); b.box(I(0, 0.45, 0, 0.12, 0.95, 0.95), dark); });
    mesh.barrel = mk((b) => { b.cyl(I(0, 0, 0, 0.9, 1, 0.9), 8, 0.5, 0.5, H('#8a5a34'), true, true); b.cyl(I(0, 0.2, 0, 0.95, 0.08, 0.95), 8, 0.5, 0.5, H('#3a3a40'), false, false); b.cyl(I(0, 0.72, 0, 0.95, 0.08, 0.95), 8, 0.5, 0.5, H('#3a3a40'), false, false); });
    mesh.log = mk((b) => { b.box(I(0, 0.28, 0, 2.0, 0.55, 0.55), H('#6e4c2c')); b.box(I(1.01, 0.28, 0, 0.04, 0.45, 0.45), H('#c8a070')); b.box(I(-1.01, 0.28, 0, 0.04, 0.45, 0.45), H('#c8a070')); });
    mesh.rock = mk((b) => { b.sphere(I(0, 0.34, 0, 1.0, 0.7, 0.9), 6, 4, H('#8d8a84')); b.sphere(I(0.35, 0.2, 0.3, 0.55, 0.4, 0.5), 5, 3, H('#9a968f')); });
    mesh.jar = mk((b) => { b.cyl(I(0, 0, 0, 0.5, 0.45, 0.5), 8, 0.5, 0.5, H('#b0663a'), true, true); b.cyl(I(0, 0.45, 0, 0.28, 0.15, 0.28), 8, 0.5, 0.5, H('#b0663a'), true, true); });
    mesh.sack = mk((b) => { b.sphere(I(0, 0.28, 0, 0.8, 0.56, 0.8), 6, 4, H('#c9b27a')); b.sphere(I(0, 0.58, 0, 0.25, 0.2, 0.25), 5, 3, H('#a8905a')); });
  };

  /* ---------- criação ---------- */
  function add(k, x, z, yaw) {
    const d = KIND[k]; if (W.groundY(x, z) < 0.9 || W.isLava(x, z) || W.waterDepth(x, z) > 0.05) return;
    const p = [x, z]; W.resolve(p, d.r); if (Math.hypot(p[0] - x, p[1] - z) > 0.8) return;
    const y = W.groundY(p[0], p[1]);
    Dr.items.push({ k, x: p[0], y, z: p[1], hx: p[0], hy: y, hz: p[1], yaw: yaw || 0, vx: 0, vy: 0, vz: 0, r: d.r, h: d.h, m: d.m, held: false, sleep: true, thrown: false, hits: new Set() });
  }
  Dr.addAt = function (k, x, y, z, dg) {
    const d = KIND[k]; Dr.items.push({ k, x, y, z, hx: x, hy: y, hz: z, yaw: Math.random() * 6, vx: 0, vy: 0, vz: 0, r: d.r, h: d.h, m: d.m, held: false, sleep: true, thrown: false, hits: new Set(), dg: !!dg });
  };
  Dr.spawn = function () {
    Dr.items.length = 0;
    const rng = M.seeded(W.SEED + 9090);
    for (const t of W.towns) {
      for (const h of (t.homes || []).slice(0, 5)) {
        const door = h.door || [h.x, h.z]; let ox = door[0] - t.x, oz = door[1] - t.z; const l = Math.hypot(ox, oz) || 1; ox /= l; oz /= l;
        const tx = door[0] + ox * 2.8, tz = door[1] + oz * 2.8, yaw = Math.atan2(ox, oz);
        add('table', tx, tz, yaw + 1.57); add('chair', tx - oz * 1.2, tz + ox * 1.2, yaw + 1.57); add('chair', tx + oz * 1.2, tz - ox * 1.2, yaw - 1.57);
        if (rng() < 0.6) add(rng() < 0.5 ? 'jar' : 'sack', tx + ox * 1.5, tz + oz * 1.5);
      }
      for (let i = 0; i < 4; i++) { const a = rng() * M.TAU, r = 4 + rng() * 3; add(rng() < 0.5 ? 'stool' : 'chair', t.x + Math.cos(a) * r, t.z + Math.sin(a) * r, rng() * 6); }
      for (let i = 0; i < 5; i++) { const a = rng() * M.TAU, r = 12 + rng() * 10; add(['crate', 'barrel', 'sack', 'jar'][Math.floor(rng() * 4)], t.x + Math.cos(a) * r, t.z + Math.sin(a) * r, rng() * 6); }
    }
    for (const p of W.pois) for (let i = 0; i < 3; i++) { const a = rng() * M.TAU, r = 3 + rng() * 5; add(['rock', 'log', 'crate', 'barrel'][Math.floor(rng() * 4)], p.x + Math.cos(a) * r, p.z + Math.sin(a) * r, rng() * 6); }
    for (const c of W.camps || []) for (let i = 0; i < 3; i++) { const a = rng() * M.TAU; add(['crate', 'barrel', 'log', 'sack'][Math.floor(rng() * 4)], c.x + Math.cos(a) * 4, c.z + Math.sin(a) * 4, rng() * 6); }
    for (let i = 0, n = 0; i < 700 && n < 70; i++) {
      const a = rng() * M.TAU, rd = 40 + rng() * 240, x = W.CENTER + Math.cos(a) * rd, z = W.CENTER + Math.sin(a) * rd, before = Dr.items.length;
      add(['rock', 'rock', 'log', 'log', 'crate', 'barrel'][Math.floor(rng() * 6)], x, z, rng() * 6); n += Dr.items.length - before;
    }
  };
  Dr.reset = function () {
    Dr.held = null;
    for (const it of Dr.items) { it.x = it.hx; it.y = it.hy; it.z = it.hz; it.vx = it.vy = it.vz = 0; it.held = false; it.sleep = true; it.thrown = false; }
  };
  const sb = G.structs.build;
  G.structs.build = async function (progress, tick) { await sb.call(this, progress, tick); Dr.spawn(); };

  /* ---------- física ---------- */
  function support(it, x, z, y) {
    let base = W.groundY(x, z);
    for (const o of Dr.items) {
      if (o === it || o.held || !KIND[o.k].flat) continue;
      if (Math.hypot(o.x - x, o.z - z) < o.r * 0.9 && o.y + o.h <= y + 0.4) base = Math.max(base, o.y + o.h);
    }
    return base;
  }
  const wake = (o) => { for (const q of Dr.items) if (q.sleep && !q.held && Math.hypot(q.x - o.x, q.z - o.z) < o.r + 0.4 && q.y > o.y + 0.2) q.sleep = false; };
  Dr.nearest = function () {
    const P = G.player, fx = Math.sin(G.cam.yaw), fz = Math.cos(G.cam.yaw); let best = null, bd = 3.1;
    for (const it of Dr.items) {
      if (it.held) continue; const dx = it.x - P.x, dz = it.z - P.z, d = Math.hypot(dx, dz) - it.r * 0.5;
      if (d > bd) continue; if (d > 0.9 && (dx * fx + dz * fz) / (Math.hypot(dx, dz) || 1) < 0.35) continue;
      bd = d; best = it; best.dist = d;
    }
    return best;
  };
  Dr.pick = function (it) {
    if (Dr.held || !it) return; Dr.held = it; it.held = true; it.sleep = false; it.thrown = false; wake(it); if (G.mp && G.mp.sync) G.mp.sync.onGrab(it);
    G.audio.sfx('pick'); G.ui.toast((KIND[it.k].drag ? 'Arrastando: ' : 'Segurando: ') + KIND[it.k].nome + ' (círculo = lançar)');
  };
  Dr.drop = function () {
    const it = Dr.held; if (!it) return; Dr.held = null; it.held = false; it.sleep = false; it.vx = it.vy = it.vz = 0; G.audio.sfx('pick'); if (G.mp && G.mp.sync) G.mp.sync.onRelease(it, 0, 0, 0, false);
  };
  Dr.throw = function (power) {
    const it = Dr.held; if (!it) return; Dr.held = null; it.held = false; it.sleep = false;
    const C = G.cam, pitch = C.fpMode ? C.fpPitch : 0.1, cp = Math.cos(pitch), sp = Math.sin(pitch);
    const sc = (KIND[it.k].drag ? 0.5 : 1) * (7 + 15 * power) / (0.6 + 0.25 * it.m);
    it.vx = Math.sin(C.yaw) * cp * sc; it.vz = Math.cos(C.yaw) * cp * sc; it.vy = sp * sc + 2.5; it.thrown = true; it.hits = new Set(); if (G.mp && G.mp.sync) G.mp.sync.onRelease(it, it.vx, it.vy, it.vz, true);
    G.audio.sfx('cast_ar'); G.audio.vibrate && G.audio.vibrate(15);
  };
  const st0 = G.prog.stats;
  G.prog.stats = function () { const r = st0.apply(this, arguments); if (Dr.held) r.speed *= Math.max(0.5, 1 - 0.12 * Dr.held.m); return r; };

  function nearAny(it) { // perto do host OU de outro jogador: senão o objeto congela no ar
    const P = G.player; if (Math.hypot(it.x - P.x, it.z - P.z) <= 80) return true;
    const px = G.mp && G.mp.proxies ? G.mp.proxies() : [];
    for (const q of px) if (q && Math.hypot(it.x - q.x, it.z - q.z) <= 80) return true;
    return false;
  }
  Dr.update = function (dt) {
    const cli = G.mp && G.mp.skipSim(); // multiplayer: só o host simula a física; o cliente só segura o próprio item
    const P = G.player, C = G.cam, h = Dr.held;
    if (h) {
      const pitch = C.fpMode ? C.fpPitch : 0, cp = Math.cos(pitch), sp = Math.sin(pitch), eye = C.fpMode ? C.eye : [P.x, P.y + 1.5, P.z];
      const dg = KIND[h.k].drag, d = dg ? 2.0 : 1.5;
      const p = [eye[0] + Math.sin(C.yaw) * cp * d, eye[2] + Math.cos(C.yaw) * cp * d];
      W.resolve(p, h.r * 0.8);
      const tx = p[0], tz = p[1], base = support(h, tx, tz, eye[1]);
      const ty = Math.max(base, dg ? base : eye[1] - 0.5 + sp * d);
      const k = 1 - Math.exp(-16 * dt);
      h.x += (tx - h.x) * k; h.z += (tz - h.z) * k; h.y += (ty - h.y) * k; h.yaw = M.lerpAng(h.yaw, C.yaw, k);
      if (Math.hypot(h.x - P.x, h.z - P.z) > 4.5 || !P.alive) Dr.drop();
    }
    if (cli) { if (h && G.mp.sync) G.mp.sync.sendHeld(h, dt); return; }
    for (const it of Dr.items) {
      if (it.held || it.sleep || !nearAny(it)) continue;
      it.vy -= 22 * dt; it.x += it.vx * dt; it.z += it.vz * dt; it.y += it.vy * dt;
      const p = [it.x, it.z];
      if (W.resolve(p, it.r)) { it.vx *= -0.3; it.vz *= -0.3; it.x = p[0]; it.z = p[1]; }
      const sp = Math.hypot(it.vx, it.vz);
      if (it.thrown && sp > 5) {
        const t = G.combat.hit(it.x, it.y + it.h * 0.5, it.z, it.r);
        if (t && !it.hits.has(t)) { it.hits.add(t); G.combat.deal(t, Math.min(60, it.m * sp * 1.1), { el: 'neutro', kb: 4, fx: it.x - it.vx, fz: it.z - it.vz }); G.audio.sfx('hit_terra'); G.fx.dust(it.x, it.y, it.z, 5); it.vx *= 0.3; it.vz *= 0.3; }
      } else if (sp < 3) it.thrown = false;
      const base = support(it, it.x, it.z, it.y);
      if (it.y <= base) {
        if (it.vy < -4) { G.fx.dust(it.x, base, it.z, 4); G.audio.sfx('hit_terra'); }
        it.y = base; it.vy = it.vy < -4 ? -it.vy * 0.25 : 0; const f = Math.max(0, 1 - 6 * dt); it.vx *= f; it.vz *= f;
        if (Math.hypot(it.vx, it.vz) < 0.15 && Math.abs(it.vy) < 0.5) { it.vx = it.vz = it.vy = 0; it.sleep = true; }
      }
      if (W.waterDepth(it.x, it.z) > 0.9) { G.fx.burst(it.x, W.SEA + 0.2, it.z, 8, [0.7, 0.85, 1], 2, 0.3, 0.5, false, 4); it.x = it.hx; it.y = it.hy; it.z = it.hz; it.vx = it.vy = it.vz = 0; it.sleep = true; }
    }
  };
  const _m = M.mat();
  Dr.draw = function () {
    const e = gfx.eye;
    for (const it of Dr.items) {
      const dx = it.x - e[0], dz = it.z - e[2]; if (dx * dx + dz * dz > 6400) continue;
      M.trs(_m, it.x, it.y, it.z, 0, it.yaw, 0, 1, 1, 1);
      gfx.draw(mesh[it.k], _m, { outline: 0.02 });
      if (!it.held) G.fx.imm(false, it.x, W.groundY(it.x, it.z) + 0.05, it.z, it.r * 2.2, 0, 0, 0, 0.22);
    }
  };
})();
