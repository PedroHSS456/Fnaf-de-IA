'use strict';
/* Elemental World — núcleo do sistema de dobra livre.
   Camadas separadas: gesto → intenção (BendIntent) → fonte/custo → elemento (forma) → entidades (física/colisão) → VFX/ambiente/feedback. */
(function () {
  const G = window.G; const M = G.M; const gfx = G.gfx; const W = G.world;
  const B = (G.bend = { projs: [], zones: [], structs: [], orbs: [], cd: {}, qcd: {}, recent: [], hold: null, lastWarn: 0 });
  G.elements = {};

  /* ---------- tabela de formas ---------- */
  B.SHAPES = {
    jab: { nome: 'Golpe', cost: 4, cd: 0.26, dmg: 9, range: 20 },
    charged: { nome: 'Carregado', cost: 14, cd: 0.9, dmg: 16, range: 28 },
    launch: { nome: 'Arremesso', cost: 12, cd: 0.45, dmg: 18, range: 26 },
    slam: { nome: 'Impacto no chão', cost: 20, cd: 0.9, dmg: 26, range: 13 },
    sweep: { nome: 'Varredura', cost: 14, cd: 0.6, dmg: 17, range: 8 },
    ring: { nome: 'Círculo', cost: 28, cd: 1.4, dmg: 22, range: 6 },
  };

  /* ---------- malhas primitivas brancas ---------- */
  const PR = {};
  const WH = [1, 1, 1];
  B.initMeshes = function () {
    const I = (px, py, pz, sx, sy, sz, ry, rx, rz) => M.trs(new Float32Array(16), px, py, pz, rx || 0, ry || 0, rz || 0, sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    let b = new gfx.MB(0.04); b.sphere(null, 6, 4, WH); PR.sphere = b.build();
    b = new gfx.MB(0.06); b.cone(null, 6, 0.5, WH, false); PR.spike = b.build();
    b = new gfx.MB(0.05); b.box(null, WH); PR.box = b.build();
    b = new gfx.MB(0.04); b.cyl(null, 8, 0.5, 0.5, WH, true, true); PR.cyl = b.build();
    b = new gfx.MB(0.05); b.box(I(0, 0, 0, 1, 0.12, 1), WH); PR.slab = b.build();
    b = new gfx.MB(0); b.disc(I(0, 0, 0, 1, 1, 1), 24, WH); PR.disc = b.build();
    b = new gfx.MB(0.1); b.sphere(null, 5, 3, WH); b.box(I(0.7, 0.1, 0.2, 0.6, 0.6, 0.6, 0.7, 0.3, 0.2), WH); PR.rock = b.build();
  };
  const _m = M.mat();
  B.prim = (k) => PR[k];
  B.drawPrim = function (k, x, y, z, sx, sy, sz, ry, rx, rz, tint, add, emis) {
    M.trs(_m, x, y, z, rx || 0, ry || 0, rz || 0, sx, sy, sz);
    gfx.draw(PR[k], _m, { tint, add, emis, outline: 0 });
  };

  /* ---------- ajuda para mira ---------- */
  B.autoAim = function (px, pz, yaw, shape) {
    let best = null, bd = 1e9; const dx = Math.sin(yaw), dz = Math.cos(yaw);
    for (const t of G.combat.all) {
      if (!t.alive || t.neutral) continue;
      const vx = t.x - px, vz = t.z - pz, d = Math.hypot(vx, vz); if (d > 28 || d < 0.5) continue;
      const cs = (vx * dx + vz * dz) / d; if (cs < 0.88) continue;
      const score = d * (2 - cs); if (score < bd) { bd = score; best = t; }
    }
    if (best) { const a = Math.atan2(best.x - px, best.z - pz); return { yaw: M.lerpAng(yaw, a, shape === 'sweep' || shape === 'ring' ? 0 : 0.8), target: best }; }
    return { yaw, target: null };
  };

  /* ---------- intenção ---------- */
  B.makeIntent = function (shape, g) {
    g = g || {};
    const P = G.player, st = G.prog.stats(), sh = B.SHAPES[shape], el = P.el();
    let yaw = G.cam.yaw + (g.yawOff || 0);
    const aim = B.autoAim(P.x, P.z, yaw, shape); yaw = aim.yaw;
    const charge = M.clamp(g.charge || 0, 0, 1), speed = M.clamp(g.speed == null ? 0.6 : g.speed, 0, 1), len = M.clamp(g.len == null ? 0.65 : g.len, 0, 1);
    const power = M.clamp(0.55 + 0.45 * charge + 0.35 * speed - (shape === 'jab' ? 0.15 : 0), 0.35, 1.5);
    let range = sh.range * (0.55 + 0.7 * len) * st.range;
    if (shape === 'jab' || shape === 'charged') range = sh.range * (0.8 + 0.4 * charge) * st.range;
    const dx = Math.sin(yaw), dz = Math.cos(yaw);
    const it = {
      el, shape, yaw, dirx: dx, dirz: dz, x: P.x + dx * 0.7, y: P.y + 1.25, z: P.z + dz * 0.7, px: P.x, pz: P.z,
      charge, speed, len, curve: M.clamp(g.curve || 0, -1, 1), side: g.side || 0, power, range, size: (0.75 + 0.75 * charge) * Math.sqrt(st.range),
      target: aim.target, cost: sh.cost * (0.6 + 0.7 * power) * (shape === 'charged' ? 1 + charge : 1), quick: !!g.quick, tx: 0, tz: 0, mul: 1,
    };
    if (aim.target && (shape === 'slam' || shape === 'charged')) { it.tx = aim.target.x; it.tz = aim.target.z; }
    else { it.tx = P.x + dx * range * (shape === 'slam' ? 0.9 : 1); it.tz = P.z + dz * range * (shape === 'slam' ? 0.9 : 1); }
    it.dmg = B.dmg(sh.dmg * (shape === 'charged' ? 1 + charge * 1.6 : 1), power);
    return it;
  };
  B.dmg = (base, power) => base * G.prog.stats().dmg * (0.7 + 0.5 * power);

  /* ---------- fonte ---------- */
  B.warn = function (msg) { const t = performance.now(); if (t - B.lastWarn > 1800) { B.lastWarn = t; G.ui.toast(msg, 'err'); } };
  B.nearFire = function () {
    const P = G.player; for (const f of W.fires) { if (Math.abs(f.x - P.x) < 6 && Math.abs(f.z - P.z) < 6) return true; }
    return false;
  };
  /* retorna {ok, mul, costMul, water} */
  B.source = function (el, it) {
    const P = G.player, S = G.S;
    if (el === 'agua') {
      const need = it.cost * 0.9;
      if (S.water < Math.min(6, need * 0.5)) { B.warn('Sem água! Chegue perto de um lago, neve ou chuva.'); return { ok: false }; }
      const mul = Math.min(1, S.water / need);
      return { ok: true, mul: 0.5 + 0.5 * mul, costMul: 0.55, water: need * mul };
    }
    if (el === 'terra') {
      if (P.swimming || P.depth > 0.8) { B.warn('A Terra precisa de chão firme.'); return { ok: false }; }
      return { ok: true, mul: P.grounded ? 1 : 0.6, costMul: 1 };
    }
    if (el === 'fogo') {
      if (P.swimming || P.depth > 0.8) { B.warn('O Fogo não acende dentro da água.'); return { ok: false }; }
      const rain = G.env.isRaining() ? 0.8 : 1; const near = B.nearFire();
      return { ok: true, mul: rain * (near ? 1.15 : 1), costMul: near ? 0.8 : 1 };
    }
    return { ok: true, mul: 1, costMul: 0.8 };
  };

  /* ---------- lançar ---------- */
  B.cast = function (it) {
    const P = G.player, S = G.S;
    if (!P.alive || P.stun > 0) return false;
    if ((B.cd[it.shape] || 0) > 0 && !it.quick) return false;
    const src = B.source(it.el, it); if (!src.ok) return false;
    const st = G.prog.stats();
    const cost = it.cost * st.cost * src.costMul;
    if (!P.spend(cost)) { B.warn('Chi insuficiente'); G.ui.flashChi(); return false; }
    if (src.water) S.water = Math.max(0, S.water - src.water);
    it.mul = src.mul; it.dmg *= src.mul;
    B.cd[it.shape] = B.SHAPES[it.shape].cd * (it.quick ? 0.5 : 1);
    P.pose(it.shape === 'ring' || it.shape === 'slam' ? 0.6 : 0.4, it.yaw);
    P.yaw = it.yaw;
    const E = G.elements[it.el]; const fn = E.shapes[it.shape];
    fn(it);
    G.audio.sfx('cast_' + it.el);
    G.audio.vibrate(it.shape === 'jab' ? 8 : 18);
    if (G.cam.kick && (it.shape === 'slam' || it.shape === 'ring' || it.shape === 'charged')) G.cam.kick(0.04 + 0.03 * it.power);
    B.track(it);
    if (P.avatarT > 0 && S.unlocked.length > 1) { // Estado Avatar: segundo elemento dispara junto
      const others = S.unlocked.filter((e) => e !== it.el); const o2 = M.pick(others);
      const it2 = Object.assign({}, it, { el: o2, dmg: it.dmg * 0.7, cost: 0 });
      const prev = G.elements[o2].shapes[it.shape]; if (prev) { it2.yaw += (Math.random() - 0.5) * 0.25; it2.dirx = Math.sin(it2.yaw); it2.dirz = Math.cos(it2.yaw); prev(it2); }
    }
    G.quests && G.quests.event('cast', { el: it.el, shape: it.shape });
    return true;
  };

  /* ---------- combos entre elementos (Avatar) e aprendizado ---------- */
  const COMBOS = {
    'agua+fogo': { nome: 'Vapor', run: (it) => comboSteam(it) },
    'fogo+terra': { nome: 'Magma', run: (it) => comboMagma(it) },
    'ar+fogo': { nome: 'Tempestade de Fogo', run: (it) => comboFirestorm(it) },
    'agua+terra': { nome: 'Lama', run: (it) => comboMud(it) },
    'agua+ar': { nome: 'Nevasca', run: (it) => comboBlizzard(it) },
    'ar+terra': { nome: 'Tempestade de Areia', run: (it) => comboSand(it) },
  };
  B.track = function (it) {
    const now = performance.now() / 1000, S = G.S, win = 3 + 0.8 * G.prog.rank('mestria');
    const prev = B.recent[B.recent.length - 1];
    B.recent.push({ el: it.el, t: now }); if (B.recent.length > 6) B.recent.shift();
    if (S.element !== 'avatar' || !prev || prev.el === it.el || now - prev.t > win || (B.comboCd || 0) > now) return;
    const key = [prev.el, it.el].sort().join('+'); const c = COMBOS[key]; if (!c) return;
    B.comboCd = now + 1.2; G.ui.banner('Combo: ' + c.nome, prev.el + ' + ' + it.el);
    c.run(it); G.audio.sfx('combo'); G.quests && G.quests.event('combo', key);
  };
  function cpos(it) { return [it.tx, it.tz]; }
  function comboSteam(it) {
    const [x, z] = cpos(it), y = W.groundY(x, z);
    B.zone({ x, z, r: 5, life: 3.2, el: 'agua', dps: 14, tick: 0.25, stun: 0.5, noFlashDmg: true, fxFn: (zn, dt) => { for (let i = 0; i < 3; i++) G.fx.p(false, zn.x + M.rnd(-4.5, 4.5), y + M.rnd(0.2, 1.5), zn.z + M.rnd(-4.5, 4.5), M.rnd(-0.3, 0.3), M.rnd(0.4, 1), M.rnd(-0.3, 0.3), 1.4, 1.2, 3, 0.95, 0.95, 1, 0.5, -0.3, 0.5); } });
    G.combat.area(x, y, z, 5.5, B.dmg(30, 1), { el: 'fogo', kb: 5, up: 2, stun: 1 }); G.cam.kick(0.12);
  }
  function comboMagma(it) {
    const [x, z] = cpos(it), y = W.groundY(x, z);
    G.combat.area(x, y, z, 5, B.dmg(42, 1), { el: 'fogo', kb: 8, up: 5, burn: 4 }); G.cam.kick(0.2);
    G.fx.burst(x, y + 0.5, z, 50, [1, 0.35, 0.05], 10, 0.8, 1, true, 6); G.fx.burst(x, y + 0.5, z, 25, [0.35, 0.28, 0.22], 8, 0.7, 1, false, 8);
    B.zone({ x, z, r: 3.8, life: 5, el: 'fogo', dps: 12, tick: 0.3, burn: 2, fxFn: (zn) => { G.fx.flame(zn.x + M.rnd(-3, 3), y + 0.1, zn.z + M.rnd(-3, 3), 1.1); } });
    G.inter.fire(x, z, 5, 1.5);
  }
  function comboFirestorm(it) {
    const x = G.player.x + it.dirx * 3, z = G.player.z + it.dirz * 3;
    B.zone({ x, z, r: 3.2, life: 3.6, el: 'fogo', dps: 20, tick: 0.2, burn: 2, vx: it.dirx * 6, vz: it.dirz * 6, pull: 6, fxFn: (zn) => { const y0 = W.groundY(zn.x, zn.z); for (let i = 0; i < 6; i++) { const h = M.rnd(0, 5), a = M.rnd(0, 6.28), rr = 0.6 + h * 0.35; G.fx.p(true, zn.x + Math.cos(a) * rr, y0 + h, zn.z + Math.sin(a) * rr, -Math.sin(a) * 6, 1, Math.cos(a) * 6, 0.5, 0.7, 0.2, 1, M.rnd(0.3, 0.6), 0.1, 0.9, 0, 0); } G.inter.fire(zn.x, zn.z, 2.5, 1); } });
  }
  function comboMud(it) {
    const [x, z] = cpos(it), y = W.groundY(x, z);
    B.zone({ x, z, r: 6, life: 6, el: 'terra', dps: 5, tick: 0.4, slow: 2.5, fxFn: (zn) => { if (Math.random() < 0.7) G.fx.p(false, zn.x + M.rnd(-5, 5), y + 0.2, zn.z + M.rnd(-5, 5), 0, M.rnd(0.5, 1.8), 0, 0.7, 0.5, 0.2, 0.35, 0.25, 0.15, 0.8, 3, 1); } });
    G.combat.area(x, y, z, 6, B.dmg(12, 1), { el: 'terra', slow: 3, kb: 2 });
  }
  function comboBlizzard(it) {
    const [x, z] = cpos(it), y = W.groundY(x, z);
    B.zone({ x, z, r: 6.5, life: 3.5, el: 'agua', dps: 16, tick: 0.25, slow: 2.5, fxFn: (zn) => { for (let i = 0; i < 6; i++) G.fx.p(true, zn.x + M.rnd(-6, 6), y + M.rnd(0.5, 4), zn.z + M.rnd(-6, 6), M.rnd(8, 12), -1, M.rnd(-4, 4), 0.6, 0.35, 0.1, 0.85, 0.95, 1, 0.8, 0, 0); } });
    G.combat.area(x, y, z, 6.5, B.dmg(25, 1), { el: 'agua', slow: 3, kb: 4 });
  }
  function comboSand(it) {
    const [x, z] = cpos(it), y = W.groundY(x, z);
    B.zone({ x, z, r: 5, life: 3.2, el: 'terra', dps: 15, tick: 0.2, pull: -4, stun: 0.3, fxFn: (zn) => { for (let i = 0; i < 5; i++) { const a = M.rnd(0, 6.28), rr = M.rnd(0.5, 5); G.fx.p(false, zn.x + Math.cos(a) * rr, y + M.rnd(0.2, 3), zn.z + Math.sin(a) * rr, -Math.sin(a) * 7, 0.5, Math.cos(a) * 7, 0.7, 0.8, 1.3, 0.8, 0.65, 0.4, 0.5, 0, 0); } } });
  }

  /* ---------- entidades ---------- */
  B.proj = function (o) {
    const p = Object.assign({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 0.4, life: 2, grav: 0, drag: 0, curve: 0, pierce: 0, dmg: 10, el: 'neutro', kb: 0, up: 0, homing: 0, size: 0.4, col: [1, 1, 1], mesh: 'sphere', stretch: 1, add: true, trail: null, onImpact: null, onHit: null, explode: 0, age: 0, status: {}, glow: 1, bounce: 0, fizzle: false }, o);
    p.hits = new Set(); if (B.ghostMode) { p.ghost = true; p.dmg = 0; p.homing = 0; } B.projs.push(p); return p;
  };
  B.zone = function (o) {
    const z = Object.assign({ x: 0, z: 0, r: 3, life: 3, el: 'neutro', dps: 0, tick: 0.25, t: 0, vx: 0, vz: 0, pull: 0, follow: false, fxFn: null, slow: 0, burn: 0, stun: 0, wet: 0, kb: 0, age: 0 }, o);
    if (B.ghostMode) { z.ghost = true; z.dps = 0; z.hit = 0; z.pull = 0; }
    B.zones.push(z); return z;
  };
  /* estrutura sólida (parede/pilar/espinho) */
  B.struct = function (o) {
    const s = Object.assign({ x: 0, z: 0, y: W.groundY(o.x, o.z), w: 1.2, h: 3, life: 8, hp: 80, rise: 0.25, t: 0, mesh: 'box', col: [0.7, 0.55, 0.3], ry: 0, shape: 'box', solid: true, add: null, el: 'terra', blocks: true, collide: null }, o);
    if (B.ghostMode) { s.solid = false; s.blocks = false; }
    if (s.solid) { s.collide = { t: 0, x: s.x, z: s.z, r: Math.max(0.5, s.w * 0.5), alive: true, tag: 'struct' }; W.dyn.push(s.collide); }
    B.structs.push(s); return s;
  };
  B.killStruct = function (s) {
    s.dead = true; if (s.collide) { s.collide.alive = false; const i = W.dyn.indexOf(s.collide); if (i >= 0) W.dyn.splice(i, 1); }
    G.fx.burst(s.x, s.y + s.h * 0.5, s.z, 14, s.col, 4, 0.4, 0.7, false, 8);
  };
  B.orb = function (o) { const b = Object.assign({ el: 'agua', size: 0.3, max: 1.2, t: 0, held: true, col: [0.3, 0.65, 1], mesh: 'sphere', dead: false }, o); B.orbs.push(b); return b; };

  /* explosão genérica de elemento */
  B.blast = function (el, x, y, z, r, d, o) {
    o = Object.assign({ el, kb: 6, up: 2 }, o || {});
    G.combat.area(x, y, z, r, d, o);
    G.cam.kick(Math.min(0.15, 0.02 + r * 0.012));
    const E = G.elements[el]; if (E && E.blastFx) E.blastFx(x, y, z, r);
    if (el === 'fogo') G.inter.fire(x, z, r, 1); else if (el === 'agua') G.inter.water(x, z, r);
    G.audio.sfx('boom_' + el);
  };

  B.update = function (dt) {
    for (const k in B.cd) if (B.cd[k] > 0) B.cd[k] -= dt;
    for (const k in B.qcd) if (B.qcd[k] > 0) B.qcd[k] -= dt;
    // projéteis
    const ps = B.projs;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]; let dead = false;
      p.age += dt; p.life -= dt;
      if (p.homing > 0) {
        let best = null, bd = 1e9; for (const t of G.combat.all) { if (!t.alive || t.neutral) continue; const d = Math.hypot(t.x - p.x, t.z - p.z); if (d < 16 && d < bd) { bd = d; best = t; } }
        if (best) { const sp = Math.hypot(p.vx, p.vy, p.vz), tx = best.x - p.x, ty = best.y + best.h * 0.5 - p.y, tz = best.z - p.z, l = Math.hypot(tx, ty, tz) || 1; const k = Math.min(1, p.homing * dt); p.vx += (tx / l * sp - p.vx) * k; p.vy += (ty / l * sp - p.vy) * k; p.vz += (tz / l * sp - p.vz) * k; }
      }
      if (p.curve) { const sp = Math.hypot(p.vx, p.vz) || 1; const k = p.curve * dt * 2.2; const nx = -p.vz / sp, nz = p.vx / sp; p.vx += nx * sp * k; p.vz += nz * sp * k; const s2 = Math.hypot(p.vx, p.vz) || 1; p.vx *= sp / s2; p.vz *= sp / s2; }
      p.vy -= p.grav * dt; if (p.drag) { const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d; p.vz *= d; }
      const sp = Math.hypot(p.vx, p.vy, p.vz), steps = Math.max(1, Math.ceil((sp * dt) / 0.7)), sdt = dt / steps;
      for (let s = 0; s < steps && !dead; s++) {
        p.x += p.vx * sdt; p.y += p.vy * sdt; p.z += p.vz * sdt;
        const t = p.ghost ? null : G.combat.hit(p.x, p.y, p.z, p.r);
        if (t && !p.hits.has(t)) {
          p.hits.add(t);
          const o = Object.assign({ el: p.el, kb: p.kb, up: p.up, fx: p.x - p.vx * 0.05, fz: p.z - p.vz * 0.05 }, p.status);
          G.combat.deal(t, p.dmg, o);
          if (p.onHit) p.onHit(p, t);
          G.audio.sfx('hit_' + p.el);
          if (p.pierce > 0) p.pierce--; else { dead = true; B.impact(p, t); }
          continue;
        }
        const gy = W.groundY(p.x, p.z);
        if (p.y < gy + 0.05) { if (p.bounce > 0) { p.y = gy + 0.06; p.vy = Math.abs(p.vy) * 0.5; p.bounce--; } else { dead = true; B.impact(p, null); } }
        else if (p.y < gy + 3.4 && W.solidAt(p.x, p.z, Math.min(p.r, 0.4))) { dead = true; B.impact(p, null); }
        else if (p.y < W.SEA && W.waterDepth(p.x, p.z) > 0.2 && (p.el === 'fogo')) { dead = true; G.fx.smoke(p.x, W.SEA + 0.2, p.z, 6, 0.8); }
      }
      if (!dead && p.life <= 0) { dead = true; if (p.explode > 0 || p.onImpact) B.impact(p, null); }
      if (!dead && p.trail) p.trail(p, dt);
      if (dead) ps.splice(i, 1);
    }
    // zonas
    const zs = B.zones;
    for (let i = zs.length - 1; i >= 0; i--) {
      const z = zs[i]; z.life -= dt; z.age += dt; z.t += dt;
      if (z.follow) { z.x = G.player.x; z.z = G.player.z; }
      z.x += z.vx * dt; z.z += z.vz * dt;
      if (z.fxFn) z.fxFn(z, dt);
      if (z.t >= z.tick && !z.ghost) {
        const step = z.t; z.t = 0;
        for (const t of G.combat.all) {
          if (!t.alive) continue; const d = Math.hypot(t.x - z.x, t.z - z.z); if (d > z.r + t.r) continue;
          if (z.hit) { if (!z.hs) z.hs = new Set(); if (z.hs.has(t)) continue; z.hs.add(t); G.combat.deal(t, z.hit, { el: z.el, fx: z.x - (z.vx || 0) * 0.1, fz: z.z - (z.vz || 0) * 0.1, kb: z.kb, up: z.up || 0, burn: z.burn, slow: z.slow, stun: z.stun, wet: z.wet }); }
          else if (z.dps) G.combat.deal(t, z.dps * step, { el: z.el, fx: z.x, fz: z.z, kb: z.kb, burn: z.burn, slow: z.slow, stun: z.stun, wet: z.wet });
          else { if (z.slow && t.slowT !== undefined) t.slowT = Math.max(t.slowT, z.slow); if (z.burn && t.burnT !== undefined) t.burnT = Math.max(t.burnT, z.burn); }
          if (z.pull && t.knock && d > 0.5) t.knock((z.x - t.x) / d * Math.sign(z.pull), (z.z - t.z) / d * Math.sign(z.pull), Math.abs(z.pull) * 0.5, 0.5);
        }
        if (z.onTick) z.onTick(z, step);
      }
      // bloqueia disparos inimigos dentro da zona de ar
      if (z.deflect) G.enemies.deflect(z.x, z.z, z.r + 0.6, z.deflect > 1);
      if (z.life <= 0) { if (z.onEnd) z.onEnd(z); zs.splice(i, 1); }
    }
    // estruturas
    const ss = B.structs;
    for (let i = ss.length - 1; i >= 0; i--) {
      const s = ss[i]; s.t += dt; s.life -= dt;
      if (s.life <= 0 || s.hp <= 0 || s.dead) { if (!s.dead) B.killStruct(s); ss.splice(i, 1); }
    }
    // orbes seguram posição
    for (let i = B.orbs.length - 1; i >= 0; i--) {
      const o = B.orbs[i]; if (o.dead) { B.orbs.splice(i, 1); continue; }
      o.t += dt; o.size = Math.min(o.max, o.size + dt * 0.9);
    }
  };

  B.handPos = function () {
    const P = G.player, a = P.yaw; return [P.x + Math.sin(a) * 0.75 + Math.cos(a) * 0.25, P.y + 1.25, P.z + Math.cos(a) * 0.75 - Math.sin(a) * 0.25];
  };

  B.draw = function () {
    const tmpT = [0, 0, 0], tmpA = [0, 0, 0];
    for (const p of B.projs) {
      if (p.mesh === 'none') continue;
      const sp = Math.hypot(p.vx, p.vy, p.vz) || 1, hd = Math.hypot(p.vx, p.vz);
      const ry = Math.atan2(p.vx, p.vz), rx = -Math.atan2(p.vy, hd);
      const c = p.col, g = p.glow;
      B.drawPrim(p.mesh, p.x, p.y, p.z, p.size * (p.sx || 1), p.size * (p.sy || 1), p.size * p.stretch, ry, rx, 0, [c[0] * 0.5, c[1] * 0.5, c[2] * 0.5], [c[0] * 0.55 * g, c[1] * 0.55 * g, c[2] * 0.55 * g]);
      if (p.add) G.fx.imm(true, p.x, p.y, p.z, p.size * 5, c[0], c[1], c[2], 0.28);
    }
    for (const s of B.structs) {
      const k = Math.min(1, s.t / s.rise), e = 1 - (1 - k) * (1 - k), fade = s.life < 1 ? Math.max(0, s.life) : 1;
      const hh = s.h * e * (s.life < 0.8 ? s.life / 0.8 : 1);
      if (hh <= 0.02) continue;
      const c = s.col;
      if (s.mesh === 'spike') B.drawPrim('spike', s.x, s.y - 0.1, s.z, s.w * 2, hh, s.w * 2, s.ry, 0, 0, c, s.add);
      else B.drawPrim(s.mesh, s.x, s.y + hh * 0.5 - 0.15, s.z, s.w, hh, s.sd || s.w, s.ry, 0, 0, c, s.add);
    }
    for (const o of B.orbs) {
      const h = o.pos || B.handPos(); const c = o.col;
      const wob = 1 + Math.sin(o.t * 9) * 0.06;
      B.drawPrim(o.mesh, h[0], h[1], h[2], o.size * wob, o.size * wob, o.size * wob, o.t, 0, 0, o.mesh === 'rock' ? c : [c[0] * 0.55, c[1] * 0.55, c[2] * 0.55], o.mesh === 'rock' ? [0.05, 0.04, 0.02] : [c[0] * 0.5, c[1] * 0.5, c[2] * 0.5]);
      if (o.mesh !== 'rock') G.fx.imm(true, h[0], h[1], h[2], o.size * 4.5, c[0], c[1], c[2], 0.3);
    }
  };

  B.impact = function (p, target) {
    if (p.ghost) { const E = G.elements[p.el]; G.fx.burst(p.x, p.y, p.z, 10, (E && E.col) || [1, 1, 1], 3, 0.4, 0.5, true, 0); return; }
    if (p.onImpact) p.onImpact(p, target);
    if (p.explode > 0) B.blast(p.el, p.x, Math.max(p.y, W.groundY(p.x, p.z)), p.z, p.explode, p.explodeDmg != null ? p.explodeDmg : p.dmg * 0.8, p.explodeOpts);
  };

  /* ---------- quick skills ---------- */
  B.castQuick = function (i) {
    const P = G.player, el = P.el(), E = G.elements[el], q = E.quick[i];
    if (!q || !P.alive || P.stun > 0) return false;
    const key = el + i;
    if ((B.qcd[key] || 0) > 0) { return false; }
    const it = B.makeIntent(q.shape, { charge: q.charge != null ? q.charge : 0.5, speed: 0.8, len: q.len != null ? q.len : 0.8, quick: true });
    it.cost = q.cost; it.quick = true; it.skill = q.id;
    const src = B.source(el, it); if (!src.ok) return false;
    const cost = q.cost * (1 + 0.15 * i) * G.prog.stats().cost * src.costMul;
    if (!P.spend(cost)) { B.warn('Chi insuficiente'); G.ui.flashChi(); return false; }
    if (src.water) G.S.water = Math.max(0, G.S.water - src.water);
    it.mul = src.mul; it.dmg *= src.mul * (q.dmgMul || 1);
    B.qcd[key] = q.cd; B.qcdMax = B.qcdMax || {}; B.qcdMax[key] = q.cd;
    P.pose(0.5, it.yaw); P.yaw = it.yaw;
    q.run(it);
    G.audio.sfx('cast_' + el); G.audio.vibrate(20);
    B.track(it);
    G.quests && G.quests.event('cast', { el, shape: q.shape, quick: true });
    return true;
  };

  /* ---------- segurar (sustentado) ---------- */
  B.holdStart = function () {
    const P = G.player, el = P.el(), E = G.elements[el];
    if (!P.alive || P.stun > 0 || !E.hold) return false;
    const it = B.makeIntent('charged', { charge: 0 });
    const src = B.source(el, it); if (!src.ok) return false;
    B.hold = { el, t: 0, charge: 0, st: {}, drain: E.hold.drain || 10, yawOff: 0 };
    if (E.hold.start) E.hold.start(B.hold, it);
    return true;
  };
  B.holdUpdate = function (dt, yawOff) {
    const h = B.hold; if (!h) return;
    const P = G.player, E = G.elements[h.el], S = G.S;
    h.t += dt; h.charge = Math.min(1, h.t / 1.6); h.yawOff = yawOff || 0;
    const st = G.prog.stats();
    const cost = h.drain * st.cost * dt;
    if (h.el === 'agua') { S.water = Math.max(0, S.water - h.drain * 0.7 * dt); if (S.water <= 0.5) { B.holdCancel(); return; } }
    if (!P.spend(cost)) { B.warn('Chi insuficiente'); G.ui.flashChi(); B.holdCancel(); return; }
    P.regenDelay = 0.5;
    const it = B.makeIntent('charged', { charge: h.charge, yawOff: h.yawOff });
    it.dt = dt;
    P.pose(0.15, it.yaw);
    E.hold.update(dt, it, h);
  };
  B.holdEnd = function (g) {
    const h = B.hold; if (!h) return; B.hold = null;
    const E = G.elements[h.el];
    const it = B.makeIntent('charged', Object.assign({ charge: h.charge }, g || {}));
    it.cost = 0;
    if (E.hold.end) E.hold.end(h, it);
    B.track(it);
    G.quests && G.quests.event('cast', { el: h.el, shape: 'hold' });
  };
  B.holdCancel = function () { const h = B.hold; B.hold = null; if (h) { const E = G.elements[h.el]; if (E.hold.cancel) E.hold.cancel(h); for (const o of B.orbs) if (o.held) o.dead = true; } };

  /* velocidade para mirar no alvo (ou reto) */
  B.aim = function (it, speed, srcY) {
    let vy = 0;
    if (it.target) { const t = it.target, d = Math.hypot(t.x - it.x, t.z - it.z) || 1; vy = ((t.y + t.h * 0.6 - (srcY == null ? it.y : srcY)) / d) * speed; vy = M.clamp(vy, -speed * 0.6, speed * 0.6); }
    const hs = Math.sqrt(Math.max(0, speed * speed - vy * vy));
    return [it.dirx * hs, vy, it.dirz * hs];
  };
  /* arco de partículas que "varre" durante ~0.28s (varredura) */
  B.arcFx = function (it, radius, emit, half) {
    half = half || 1.1; const side = it.side || 1;
    B.zone({ x: it.px, z: it.pz, r: 0.1, life: 0.28, dps: 0, tick: 99, fxFn: (z) => {
      const k = z.age / 0.28, a0 = it.yaw - side * half, a1 = it.yaw + side * half;
      for (let n = 0; n < 4; n++) { const kk = Math.max(0, k - n * 0.06), a = a0 + (a1 - a0) * kk, r = radius * (0.55 + 0.45 * Math.random()); emit(G.player.x + Math.sin(a) * r, G.player.y + 0.6 + Math.random() * 0.9, G.player.z + Math.cos(a) * r, Math.sin(a), Math.cos(a), kk); }
    } });
  };
  B.clear = function () { B.projs.length = 0; B.zones.length = 0; for (const s of B.structs) if (s.collide) { const i = W.dyn.indexOf(s.collide); if (i >= 0) W.dyn.splice(i, 1); } B.structs.length = 0; B.orbs.length = 0; B.hold = null; B.recent.length = 0; };
  B.isHolding = () => !!B.hold;
})();
