'use strict';
/* Elemental World — Catacumbas do Eco: dungeon com armadilha (ondas), puzzle de braseiros, puzzle de peso e chefe com fases.
   O interior fica numa área própria do mapa (canto oceânico), com chão, paredes e teto próprios. A entrada fica no mundo aberto. */
(function () {
  const G = window.G, M = G.M, W = G.world, gfx = G.gfx, H = M.hex;
  const Dg = (G.dungeon = { inside: false, gates: [], plates: [], minions: [], boss: null, phase: 0, bt: 3, trap: { started: false, list: [] }, guards: {} });
  const OX = 40, OZ = 40, Y0 = 24, H5 = 5.2;
  const inBox = (x, z) => x > OX - 13 && x < OX + 13 && z > OZ - 3 && z < OZ + 96;
  Dg.inBox = inBox;
  const I = (px, py, pz, sx, sy, sz, ry) => M.trs(new Float32Array(16), px, py, pz, 0, ry || 0, 0, sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
  const gy0 = W.groundY, wd0 = W.waterDepth, lv0 = W.isLava;
  W.groundY = (x, z) => (Dg.active && inBox(x, z) ? Y0 : gy0(x, z));
  W.waterDepth = (x, z) => (Dg.active && inBox(x, z) ? 0 : wd0(x, z));
  W.isLava = (x, z) => (Dg.active && inBox(x, z) ? false : lv0(x, z));
  const fz0 = W.freeZone; W.freeZone = (x, z) => inBox(x, z) || (fz0 && fz0(x, z));
  const DF = () => (G.S.flags.dg = G.S.flags.dg || {});
  const wx = (u) => OX + u, wz = (v) => OZ + v;
  let solid = null, glow = null, gateMesh = null, plateMesh = null, entr = null;

  /* ---------- construção ---------- */
  const ROOMS = [
    ['entry', -7, 0, 7, 8, 1, 1], ['A', -9, 12, 9, 28, 1, 1], ['B', -8, 32, 8, 46, 1, 1], ['C', -8, 50, 8, 64, 1, 1], ['boss', -11, 68, 11, 92, 1, 0],
  ];
  const CORR = [[8, 12], [28, 32], [46, 50], [64, 68]];
  Dg.build = function () {
    const S = new gfx.MB(0.05), GL = new gfx.MB(0);
    const stone = H('#6b6761'), dark = H('#4a4742'), floor = H('#59564f'), rune = H('#58e8d8');
    const wallH = (v, u0, u1) => { if (u1 - u0 < 0.1) return; S.box(I(wx((u0 + u1) / 2), Y0 + H5 / 2, wz(v), u1 - u0, H5, 0.8), stone); W.addBox(wx(u0), wz(v) - 0.4, wx(u1), wz(v) + 0.4, 'dg'); };
    const wallV = (u, v0, v1) => { S.box(I(wx(u), Y0 + H5 / 2, wz((v0 + v1) / 2), 0.8, H5, v1 - v0), stone); W.addBox(wx(u) - 0.4, wz(v0), wx(u) + 0.4, wz(v1), 'dg'); };
    const slab = (u0, v0, u1, v1, c) => {
      const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, w = u1 - u0, d = v1 - v0;
      S.box(I(wx(cu), Y0 - 0.4, wz(cv), w + 0.8, 0.8, d), c || floor); S.box(I(wx(cu), Y0 + H5 + 0.3, wz(cv), w + 1.6, 0.6, d + 0.6), dark);
    };
    const pillar = (u, v) => { S.box(I(wx(u), Y0 + H5 / 2, wz(v), 1.3, H5, 1.3), H('#7a766f')); S.box(I(wx(u), Y0 + 0.3, wz(v), 1.8, 0.6, 1.8), dark); W.addCircle(wx(u), wz(v), 0.85, 'dg'); };
    const torch = (u, v) => { const x = wx(u), z = wz(v); S.box(I(x, Y0 + 2.2, z, 0.2, 0.5, 0.2), H('#3a2a1a')); GL.box(I(x, Y0 + 2.65, z, 0.3, 0.4, 0.3), H('#ffb050')); W.fires.push({ x, y: Y0 + 2.7, z, s: 0.9 }); };
    for (const [, u0, v0, u1, v1, so, no] of ROOMS) {
      slab(u0, v0, u1, v1); wallV(u0, v0, v1); wallV(u1, v0, v1);
      if (so) { wallH(v0, u0, -2); wallH(v0, 2, u1); } else wallH(v0, u0, u1);
      if (no) { wallH(v1, u0, -2); wallH(v1, 2, u1); } else wallH(v1, u0, u1);
      S.box(I(wx(0), Y0 + 0.03, wz((v0 + v1) / 2), 3, 0.06, v1 - v0 - 1), H('#3d4a66'));
    }
    for (const [v0, v1] of CORR) { slab(-2, v0, 2, v1); wallV(-2, v0, v1); wallV(2, v0, v1); }
    for (const [u, v] of [[-6.5, 2], [6.5, 2], [-6.5, 6], [6.5, 6], [-8.5, 16], [8.5, 16], [-8.5, 24], [8.5, 24], [-7.5, 36], [7.5, 36], [-7.5, 42], [7.5, 42], [-7.5, 54], [7.5, 54], [-7.5, 60], [7.5, 60], [-10.5, 72], [10.5, 72], [-10.5, 80], [10.5, 80], [-10.5, 88], [10.5, 88], [-2.4, 10], [2.4, 10], [-2.4, 30], [2.4, 30], [-2.4, 48], [2.4, 48], [-2.4, 66], [2.4, 66]]) torch(u, v);
    for (const [u, v] of [[-5, 18], [5, 18], [-5, 22], [5, 22], [-4, 60], [4, 60], [-6, 74], [6, 74], [-6, 86], [6, 86], [0, 80]]) { if (v === 80 && u === 0) continue; pillar(u, v); }
    // braseiros da sala B
    for (let i = 0; i < 3; i++) {
      const u = -5 + i * 5, v = 44, x = wx(u), z = wz(v);
      S.cyl(I(x, Y0, z, 0.35, 0.9, 0.35), 6, 0.5, 0.5, H('#4a4650'), true, false); S.cyl(I(x, Y0 + 0.85, z, 0.95, 0.28, 0.95), 8, 0.5, 0.5, H('#3a3640'), true, true);
      W.addCircle(x, z, 0.5, 'dg'); W.objs.push({ id: 'br_cat_' + i, kind: 'brazier', group: 'catacumba', x, z, y: Y0, lit: false, rr: 2.4 });
    }
    // baú do chefe e altar
    S.box(I(wx(0), Y0 + 0.3, wz(89), 0.9, 0.6, 0.6), H('#7a4e2a')); S.box(I(wx(0), Y0 + 0.68, wz(89), 0.94, 0.18, 0.64), H('#8a5a30')); S.box(I(wx(0), Y0 + 0.45, wz(89.31), 0.16, 0.2, 0.04), H('#e0c040'));
    W.chests.push({ id: 'c_catacumba', x: wx(0), z: wz(89), loot: 'ruin', art: 'art_cat', needs: 'catacumba_boss' });
    for (const r of [-8, 8]) GL.box(I(wx(r), Y0 + 0.04, wz(76), 3.2, 0.05, 0.3), rune);
    solid = S.build(); glow = GL.build();
    // grades e placas (dinâmicas)
    let b = new gfx.MB(0.04); b.box(I(0, 3.3, 0, 4.4, 0.4, 0.5), H('#2c2a2e')); for (let i = 0; i < 8; i++) b.box(I(-1.75 + i * 0.5, 1.6, 0, 0.14, 3.2, 0.2), H('#3a383e')); gateMesh = b.build();
    b = new gfx.MB(0.04); b.box(I(0, 0.06, 0, 1.8, 0.12, 1.8), H('#8a8680')); b.box(I(0, 0.13, 0, 1.2, 0.05, 1.2), H('#e8c060')); plateMesh = b.build();
    for (const [id, v, open] of [['Ain', 12.2, true], ['Aout', 28.2, false], ['B', 46.2, false], ['C', 64.2, false], ['boss', 68.2, true]]) {
      Dg.gates.push({ id, v, open, p: open ? 1 : 0, col: W.addBox(wx(-2), wz(v) - 0.4, wx(2), wz(v) + 0.4, 'gate') });
    }
    Dg.plates = [{ u: -4, v: 57, on: false, k: 0 }, { u: 4, v: 57, on: false, k: 0 }];
    // objetos de saída/entrada
    W.objs.push({ id: 'dexit0', kind: 'dexit', x: wx(0), z: wz(1.2), y: Y0, rr: 2.6 });
    buildEntrance();
  };

  function buildEntrance() {
    const rng = M.seeded(W.SEED + 5151);
    for (let i = 0; i < 1500; i++) {
      const a = rng() * M.TAU, rd = 60 + rng() * 170, x = W.CENTER + Math.cos(a) * rd, z = W.CENTER + Math.sin(a) * rd, reg = W.regionAt(x, z);
      if (i < 900 && reg !== 'hub') continue;
      const y = W.groundY(x, z); if (y < 1.8 || y > 30 || W.isLava(x, z) || W.waterDepth(x, z) > 0.05) continue;
      let hi = -1e9, lo = 1e9; for (const [dx, dz] of [[0, 0], [7, 0], [-7, 0], [0, 7], [0, -7]]) { const q = W.groundY(x + dx, z + dz); hi = Math.max(hi, q); lo = Math.min(lo, q); }
      if (hi - lo > 2.2) continue;
      if (W.towns.some((q) => Math.hypot(q.x - x, q.z - z) < q.R + 35) || W.pois.some((q) => Math.hypot(q.x - x, q.z - z) < 55) || (W.arenas || []).some((q) => Math.hypot(q.x - x, q.z - z) < 50)) continue;
      const S = W.mbSolid(x, z), GL = W.mbGlow(x, z), rock = H('#5d5953'), dk = H('#3d3a36');
      S.box(I(x, hi - 0.5, z, 16, 2.5, 9), dk);
      S.box(I(x, hi + 4, z + 1.5, 15, 8, 5), rock); S.box(I(x - 5, hi + 2.5, z + 0.5, 6, 5, 5, 0.3), rock); S.box(I(x + 5.5, hi + 3, z + 0.5, 5, 6, 5, -0.4), rock);
      S.box(I(x, hi + 5, z - 0.8, 6.4, 1.0, 1.6), H('#8c877e'));
      S.box(I(x - 2.7, hi + 2.2, z - 0.8, 1.2, 4.4, 1.4), H('#8c877e')); S.box(I(x + 2.7, hi + 2.2, z - 0.8, 1.2, 4.4, 1.4), H('#8c877e'));
      S.box(I(x, hi + 2.1, z - 0.6, 4.2, 4.2, 0.6), H('#121014'));
      GL.box(I(x, hi + 5.7, z - 1.0, 3.0, 0.35, 0.1), H('#58e8d8'));
      W.addBox(x - 3.4, z - 1.5, x - 2.0, z + 0.1, 'dg'); W.addBox(x + 2.0, z - 1.5, x + 3.4, z + 0.1, 'dg');
      for (const dx of [-3.6, 3.6]) { const tx = x + dx, tz = z - 2.2; S.box(I(tx, hi + 1.0, tz, 0.2, 2.0, 0.2), H('#3a2a1a')); W.fires.push({ x: tx, y: hi + 2.1, z: tz, s: 1.0 }); }
      // placa
      S.box(I(x + 5, hi + 0.7, z - 3, 0.12, 1.4, 0.12), H('#6a4a2a')); S.box(I(x + 5, hi + 1.3, z - 3, 1.2, 0.7, 0.1), H('#a07a48'));
      W.objs.push({ id: 'sign_cat', kind: 'sign', x: x + 5, z: z - 3, y: hi, title: 'Catacumbas do Eco', text: 'Aviso: abaixo desta pedra repousa um guardião esquecido. Armadilhas, braseiros e uma sala de pesos o aguardam. Recomendado: nível 6 ou mais, ervas e muito fôlego. A dificuldade segue a configuração do jogo.', rr: 2.4 });
      W.objs.push({ id: 'dungeon_door', kind: 'dungeon', x, z: z - 2.6, y: hi, rr: 3 });
      W.pois.push({ id: 'catacumbas', kind: 'dungeon', x, z, reg: 'hub', nome: 'Catacumbas do Eco' });
      entr = { x, z: z - 3.2, y: hi }; return;
    }
  }

  /* ---------- estado ---------- */
  const En = () => G.enemies;
  const lvl = () => Math.max(5, G.S.lvl + 1);
  function spawn(type, u, v, L) { const e = En().spawnAt(type, wx(u), wz(v), L || lvl()); e.dg = true; e.aggro = 40; e.state = 'chase'; return e; }
  function allDead(list) { return list.every((e) => !e.alive); }
  function setGate(id, open) { const g = Dg.gates.find((q) => q.id === id); if (g) g.open = open; }
  function initGates() {
    const df = DF();
    setGate('Ain', true); setGate('Aout', !!df.A); setGate('B', !!df.B); setGate('C', !!df.C); setGate('boss', true);
    for (const g of Dg.gates) { g.p = g.open ? 1 : 0; g.col.alive = !g.open; }
  }
  Dg.enter = function () {
    if (!entr) return;
    G.ui.fade(() => {
      if (G.S.flags.puzzles && G.S.flags.puzzles.catacumba_boss) { // refazer: o selo volta a ficar fechado e o baú volta a ser selado
        const f = G.extras.F(); G.S.flags.dg = {}; f.puzzles.catacumba_boss = false; delete f.chests.c_catacumba; G.quests && G.quests.event('dungeon');
      }
      Dg.active = true; Dg.inside = true; Dg.cleanupWorld();
      G.player.teleport(wx(0), wz(2.8), 0); G.cam.yaw = 0; G.cam.fpPitch = 0;
      G.ui.banner('Catacumbas do Eco', 'O ar é frio e cheira a pedra antiga.'); G.quests && G.quests.event('dungeon');
    });
  };
  Dg.exit = function () {
    G.ui.fade(() => { G.dungeon.cleanupWorld(); Dg.inside = false; G.player.teleport(entr.x, entr.z - 1, Math.PI); G.cam.yaw = Math.PI; G.main.save(); });
  };
  Dg.cleanupWorld = function () {
    for (const e of G.enemies.list) if (e.dg && e.alive) { e.alive = false; e.hp = 0; }
    Dg.init = false; Dg.boss = null; Dg.minions.length = 0; Dg.trap.started = false; Dg.trap.list = []; Dg.guards = {}; Dg.phase = 0; G.ui.setBoss(null);
  };
  function resetItems() {
    G.drag.items = G.drag.items.filter((i) => !i.dg);
    for (const [k, u, v] of [['rock', -6, 52.5], ['crate', 6, 52.5], ['rock', 0, 53.2], ['barrel', 3, 54.5]]) G.drag.addAt(k, wx(u), Y0, wz(v), true);
  }
  Dg.update = function (dt) {
    const P = G.player, df = DF(), was = Dg.inside;
    Dg.active = true; Dg.inside = inBox(P.x, P.z);
    if (was && !Dg.inside) Dg.cleanupWorld();
    if (!Dg.inside) return;
    if (!Dg.init) { Dg.init = true; initGates(); resetItems(); }
    const u = P.x - OX, v = P.z - OZ;
    for (const g of Dg.gates) { g.p += ((g.open ? 1 : 0) - g.p) * Math.min(1, dt * 3); g.col.alive = g.p < 0.6; }
    // Sala A: armadilha com ondas
    const t = Dg.trap;
    if (!df.A && !t.started && v > 14.5) {
      t.started = true; setGate('Ain', false); G.ui.banner('Armadilha!', 'As grades se fecham. Derrote todos para sair.'); G.cam.kick(0.08); G.audio.sfx('boss');
      t.list = [spawn('bandidopedra', -6, 24), spawn('bandidopedra', 6, 24), spawn('atirador', -7, 20), spawn('atirador', 7, 20), spawn('soldado', 0, 26)];
    }
    if (t.started && !df.A && allDead(t.list)) { df.A = true; setGate('Aout', true); setGate('Ain', true); G.ui.banner('As grades se abrem', 'Siga em frente.'); G.audio.sfx('quest'); G.prog.addXp(120); G.main.save(); }
    // Sala B: guardas e braseiros
    if (!df.B && v > 34 && !Dg.guards.B) Dg.guards.B = [spawn('soldado', -4, 41), spawn('soldado', 4, 41), spawn('arqueiro', 0, 44.5)];
    if (!df.B && G.S.flags.puzzles && G.S.flags.puzzles.catacumba) { df.B = true; setGate('B', true); G.ui.banner('Grade aberta', 'Os braseiros despertaram o caminho.'); G.main.save(); }
    // Sala C: placas de peso
    if (!df.C && v > 52 && !Dg.guards.C) Dg.guards.C = [spawn('atirador', -6, 61), spawn('atirador', 6, 61), spawn('bandidopedra', 0, 62)];
    let pressed = 0;
    for (const pl of Dg.plates) {
      const x = wx(pl.u), z = wz(pl.v);
      let on = Math.hypot(P.x - x, P.z - z) < 1.0;
      for (const it of G.drag.items) if (!on && it.alive !== false && !it.held && Math.hypot(it.x - x, it.z - z) < 0.9 && it.y < Y0 + 0.7) on = true;
      pl.on = on; pl.k += ((on ? 1 : 0) - pl.k) * Math.min(1, dt * 10); if (on) pressed++;
    }
    if (!df.C && pressed === Dg.plates.length) { df.C = true; setGate('C', true); G.ui.banner('Mecanismo ativado', 'Os pesos abriram a grade.'); G.audio.sfx('quest'); G.cam.kick(0.06); G.main.save(); }
    // Chefe
    if (!df.boss && !Dg.boss && v > 72) startBoss();
    if (Dg.boss) bossLogic(dt, P);
  };

  /* ---------- chefe: Guardião das Catacumbas ---------- */
  function startBoss() {
    const d = G.diff || { hp: 1 }, S = G.S;
    const b = spawn('golem', 0, 85, lvl());
    b.nome = 'Guardião das Catacumbas'; b.hpMax = b.hp = Math.round(760 * (1 + 0.05 * Math.max(0, S.lvl - 5))); b.dmg *= 1.3; b.scale = 2.3; b.r = 1.5; b.h = 5; b.aggro = 80;
    b.def = Object.assign({}, b.def, { heavy: true, spd: 3.0, cd: 2.2, atkR: 5, weak: 'agua', resist: null });
    Dg.boss = b; Dg.phase = 1; Dg.bt = 4; setGate('boss', false);
    G.ui.banner(b.nome, 'Desvie dos círculos vermelhos no chão'); G.audio.sfx('boss'); G.cam.kick(0.15);
  }
  function summon(n) { for (let i = 0; i < n; i++) { const m = spawn(i % 2 ? 'atirador' : 'bandidopedra', M.rnd(-7, 7), M.rnd(74, 86), lvl() - 1); Dg.minions.push(m); } }
  function bossLogic(dt, P) {
    const b = Dg.boss, df = DF();
    if (!b.alive) {
      df.boss = true; Dg.boss = null; setGate('boss', true); G.ui.setBoss(null);
      for (const m of Dg.minions) if (m.alive) { m.alive = false; m.hp = 0; }
      G.S.flags.puzzles = G.S.flags.puzzles || {}; G.S.flags.puzzles.catacumba_boss = true; G.quests && G.quests.event('dboss');
      G.ui.banner('Guardião derrotado', 'O baú das catacumbas se abriu.'); G.audio.sfx('quest'); G.cam.kick(0.12);
      G.prog.addXp(800); G.S.inv.coins += 250; G.S.pts += 2; G.S.inv.shard += 3; G.ui.pick('+250 moedas, +3 fragmentos, +2 pontos');
      G.quests.event('dungeon', 'catacumba'); W.objs.push({ id: 'dexit1', kind: 'dexit', x: wx(0), z: wz(91), y: Y0, rr: 2.6 });
      G.main.save(); return;
    }
    G.ui.setBoss(b);
    if (b.state === 'idle' || b.state === 'return') b.state = 'chase';
    const f = b.hp / b.hpMax, ph = f > 0.66 ? 1 : f > 0.33 ? 2 : 3;
    if (ph !== Dg.phase) { Dg.phase = ph; b.def.spd = 2.8 + ph * 0.5; G.ui.banner('O Guardião se enfurece!', ph === 2 ? 'Aliados invocados' : 'Fase final'); G.cam.kick(0.12); summon(ph === 2 ? 2 : 3); }
    Dg.bt -= dt;
    if (Dg.bt <= 0) {
      Dg.bt = ph === 1 ? 5.5 : ph === 2 ? 4.2 : 3.2;
      for (let i = 0; i < ph; i++) { const a = Math.random() * 6.28, r = i ? M.rnd(2, 4.5) : 0; G.enemies.telegraph(P.x + Math.cos(a) * r, P.z + Math.sin(a) * r, 2.4 + ph * 0.4, 1.2, b.dmg * 0.9, 'terra', {}); }
    }
  }

  /* ---------- iluminação, desenho ---------- */
  Dg.light = function () {
    if (!Dg.inside) return;
    const e = gfx.env;
    e.amb = [0.36, 0.37, 0.44]; e.sunCol = [0.35, 0.3, 0.26]; e.fogCol = [0.04, 0.04, 0.06]; e.fogNear = 10; e.fogFar = 70;
    e.top = e.hor = e.bot = [0.03, 0.03, 0.05]; e.stars = 0;
  };
  const _m = M.mat();
  Dg.draw = function () {
    const P = G.player; if (Math.abs(P.x - OX) > 140 || Math.abs(P.z - OZ - 46) > 160) return;
    if (solid) gfx.draw(solid, null, { outline: 0 }); if (glow) gfx.draw(glow, null, { emis: 1 });
    if (!Dg.inside && Math.hypot(P.x - OX, P.z - OZ - 40) > 90) return;
    for (const g of Dg.gates) { if (g.p > 0.97) continue; M.trs(_m, OX, Y0 + g.p * 4.6, OZ + g.v, 0, 0, 0, 1, 1, 1); gfx.draw(gateMesh, _m, {}); }
    for (const pl of Dg.plates) { M.trs(_m, wx(pl.u), Y0 - pl.k * 0.08, wz(pl.v), 0, 0, 0, 1, 1, 1); gfx.draw(plateMesh, _m, { tint: pl.on ? [0.6, 1, 0.7] : [1, 0.55, 0.45], emis: 0.35 + 0.4 * pl.k }); }
    if (DF().boss) G.fx.imm(true, wx(0), Y0 + 1.2, wz(91), 2.6 + Math.sin(performance.now() / 300) * 0.3, 0.4, 0.9, 1, 0.5);
  };
  Dg.entrance = () => entr;

  const sb = G.structs.build;
  G.structs.build = async function (progress, tick) { await sb.call(this, progress, tick); Dg.build(); };
})();
