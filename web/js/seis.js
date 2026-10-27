'use strict';
/* Elemental World — visão sísmica (Toph). O mundo é preto; passos, impactos e golpes lançam ondas roxas que correm pela
   superfície (distância 3D: sobem paredes e contornam pedras) e revelam o relevo por instantes. Cálculo todo no shader principal. */
(function () {
  const G = window.G, M = G.M, W = G.world, gfx = G.gfx;
  const S = (G.seis = { BLIND_CHANCE: 0.05, on: false, now: 0, load: 0, over: 0, stepD: 0, idleT: 0, waves: [] });
  const Z = (gfx.seis = { on: false, nw: 8, now: 0, int: 1, glow: 1, noise: 0, wp: new Float32Array(32), wt: new Float32Array(32) });
  const set = () => G.save.settings;
  const NWQ = [4, 6, 8];
  S.blind = () => !!(G.S && G.S.blind);
  S.hasTerra = () => { const s = G.S; return !!s && G.mastery.any('terra') && (s.element === 'terra' || s.element === 'avatar'); };
  S.unlocked = () => S.blind() || (S.hasTerra() && G.S.lvl >= 6);
  S.wanted = () => S.blind() || !!(G.S.flags && G.S.flags.seis);
  S.toggle = function () {
    if (!S.unlocked() || S.blind()) { G.ui.toast(S.blind() ? 'Você nasceu cego: a visão sísmica é permanente' : 'Visão sísmica bloqueada (Terra, nível 6)', 'err'); return; }
    G.S.flags.seis = !G.S.flags.seis; G.ui.toast(G.S.flags.seis ? 'Visão sísmica ligada' : 'Visão sísmica desligada'); G.audio.sfx('pick'); G.ui.refreshSeis && G.ui.refreshSeis();
  };
  const gY = (x, z) => W.groundY(x, z);

  S.emit = function (x, y, z, str, mul) {
    str = Math.min(1.3, str * (mul == null ? 1 : mul)); if (str < 0.06) return;
    const nw = NWQ[set().seisQ == null ? 2 : set().seisQ]; let slot = -1, worst = 1e9;
    for (let i = 0; i < nw; i++) {
      const w = S.waves[i]; if (!w || S.now - w.t > w.life) { slot = i; break; }
      const rem = w.str * (1 - (S.now - w.t) / w.life); if (rem < worst) { worst = rem; slot = i; }
    }
    if (slot < 0 || (S.waves[slot] && S.now - S.waves[slot].t <= S.waves[slot].life && worst > str)) return;
    S.waves[slot] = { x, y: y + 0.05, z, str, t: S.now, spd: 8 + 8 * str, life: 1.5 + 2.1 * str, maxR: 8 + 28 * str };
    S.load += str;
    if (S.load > 3.4 && S.over <= 0) { S.over = 2.2; G.ui.toast('Vibrações intensas: percepção confusa'); }
  };
  const ground = (x, z) => { const y = gY(x, z); return y < 1.8 ? 0.45 : 1; }; // areia/praia amortece

  S.update = function (dt) {
    const P = G.player;
    const want = !!G.S && S.unlocked() && S.wanted();
    if (want !== S.on) { S.on = want; document.body.classList.toggle('seis', want); if (want) G.ui.banner('Visão sísmica', 'Sinta as vibrações do chão'); }
    Z.on = S.on;
    if (G.S && S.hasTerra() && !S.blind() && G.S.lvl >= 6 && !G.S.flags.seisMsg) { G.S.flags.seisMsg = true; G.ui.banner('Visão sísmica desbloqueada', 'Ative no botão ao lado da tela'); G.ui.refreshSeis && G.ui.refreshSeis(); }
    if (!S.on) return;
    S.now += dt; S.load = Math.max(0, S.load - dt * 1.6); if (S.over > 0) S.over -= dt;
    const sp = Math.hypot(P.vx, P.vz), air = !P.grounded || P.swimming;
    if (P.swimming) { if (!S._w) { S._w = true; G.ui.toast('Água profunda corta a visão sísmica', 'err'); } } else S._w = false;
    if (!air) {
      if (sp > 0.8) { S.stepD += sp * dt; if (S.stepD > (sp > 6 ? 2.3 : 1.6)) { S.stepD = 0; S.emit(P.x, gY(P.x, P.z), P.z, 0.28 + 0.34 * Math.min(1, sp / 8), ground(P.x, P.z)); } }
      else { S.idleT -= dt; if (S.idleT <= 0) { S.idleT = 2.0; S.emit(P.x, gY(P.x, P.z), P.z, 0.2, ground(P.x, P.z)); } }
    }
    if (S.wasAir && !air) S.emit(P.x, gY(P.x, P.z), P.z, 0.55 + Math.min(0.7, -(S.lastVy || 0) * 0.05), ground(P.x, P.z));
    S.wasAir = air; S.lastVy = P.vy;
    // outros personagens
    for (const e of G.enemies.list) {
      if (!e.alive) continue; const dx = e.x - P.x, dz = e.z - P.z; if (dx * dx + dz * dz > 2500) continue;
      if (S.hidden(e)) continue;
      const mv = Math.hypot(e.vx || 0, e.vz || 0), big = e.def && e.def.heavy ? 1.6 : 1;
      e.seT = (e.seT || Math.random()) - dt;
      if (e.seT <= 0) { if (mv > 0.6) { e.seT = mv > 4.5 ? 0.38 : 0.6; S.emit(e.x, gY(e.x, e.z), e.z, (0.22 + 0.2 * Math.min(1, mv / 6)) * big, ground(e.x, e.z)); } else { e.seT = 2.6; S.emit(e.x, gY(e.x, e.z), e.z, 0.1 * big, ground(e.x, e.z)); } }
    }
    for (const n of G.npcs.list) {
      if (n.inside || !n.model) continue; const dx = n.x - P.x, dz = n.z - P.z; if (dx * dx + dz * dz > 1600) continue;
      const mv = Math.hypot(n.vx, n.vz); n.seT = (n.seT || Math.random()) - dt;
      if (n.seT <= 0) { n.seT = mv > 0.6 ? 0.6 : 3; S.emit(n.x, gY(n.x, n.z), n.z, mv > 0.6 ? 0.22 : 0.08, ground(n.x, n.z)); }
    }
    // envia ao shader
    Z.now = S.now; Z.nw = NWQ[set().seisQ == null ? 2 : set().seisQ];
    Z.int = set().seisInt == null ? 1 : set().seisInt; Z.glow = set().seisGlow == null ? 1 : set().seisGlow;
    Z.noise = S.over > 0 ? Math.min(1, S.over) * 0.8 : 0;
    Z.wp.fill(0); Z.wt.fill(0);
    for (let i = 0; i < Z.nw; i++) {
      const w = S.waves[i]; if (!w) { Z.wt[i * 4] = -999; Z.wt[i * 4 + 2] = 0; continue; }
      Z.wp.set([w.x, w.y, w.z, w.str], i * 4); Z.wt.set([w.t, w.spd, w.life, w.maxR], i * 4);
    }
  };
  /* personagens no ar não vibram no chão: não são percebidos */
  S.hidden = (e) => !!e.fly || e.y > gY(e.x, e.z) + 0.6;
  S.light = function () {
    if (!S.on) return;
    const e = gfx.env;
    e.top = [0, 0, 0]; e.hor = [0, 0, 0]; e.bot = [0, 0, 0]; e.stars = 0; e.cloud = [0, 0, 0]; e.fogCol = [0, 0, 0]; e.fogNear = 10; e.fogFar = 75;
  };
  /* ganchos: golpes e impactos */
  const cast = G.bend.cast; G.bend.cast = function (it) {
    const r = cast.apply(this, arguments);
    if (S.on) { const P = G.player, big = it && (it.shape === 'slam' || it.shape === 'ring' || it.shape === 'charged'); S.emit(P.x, gY(P.x, P.z), P.z, big ? 1.0 : (G.S.element === 'terra' || G.player.el() === 'terra' ? 0.55 : 0.3), 1); }
    return r;
  };
  const deal = G.combat.deal; G.combat.deal = function (t, d, o) {
    if (S.on && t && t !== G.player) S.emit(t.x, gY(t.x, t.z), t.z, Math.min(0.9, 0.25 + d / 70), ground(t.x, t.z));
    return deal.apply(this, arguments);
  };
  const hurt = G.player.hurt; G.player.hurt = function (d, o) { if (S.on) S.emit(G.player.x, gY(G.player.x, G.player.z), G.player.z, 0.5, 1); return hurt.apply(this, arguments); };
})();
