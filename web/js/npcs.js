'use strict';
/* Elemental World — cidadãos com rotinas (casa, trabalho, praça) e marcadores de missão */
(function () {
  const G = window.G; const M = G.M; const W = G.world; const fx = G.fx;
  const N = (G.npcs = { list: [] });
  const SKINS = ['#e8c4a0', '#d8a878', '#c08c64', '#9a6a48', '#f0d0b0', '#7a5238'];
  const HAIRS = ['#2a1c14', '#4a3020', '#8a5a30', '#d8d0c8', '#1a1a1a', '#a03a20'];
  function build(def) {
    const r = M.seeded(def.seed);
    const i = +def.id.split('_')[1];
    const look = Object.assign(G.models.lookFor(def.reg === 'hub' ? 'terra' : def.reg), { skin: SKINS[Math.floor(r() * SKINS.length)], hair: HAIRS[Math.floor(r() * HAIRS.length)], hs: Math.floor(r() * 4) });
    if (def.reg === 'hub') { const cs = ['#8a5a3a', '#5a7a4a', '#7a6a9a', '#a07a3a']; look.c1 = cs[Math.floor(r() * 4)]; look.c2 = '#e8dcc0'; look.c3 = '#4a4038'; look.el = null; }
    if (def.role === 'ancião') { look.robe = true; look.weapon = 'staff'; look.hair = '#e8e8e8'; look.hs = 1; }
    else if (def.role === 'mercador') { look.pack = true; }
    else if (def.role === 'guarda') { look.helmet = true; look.helmetCol = '#7a7a82'; look.weapon = 'spear'; }
    return G.models.get('human', look);
  }
  N.build = build;
  N.init = function () { N.list.length = 0; for (const d of W.npcDefs) N.list.push({ def: d, x: d.home[0], z: d.home[1], y: W.groundY(d.home[0], d.home[1]), yaw: 0, inside: true, wp: null, model: null, t: Math.random() * 10, ph: 0, vx: 0, vz: 0, r: 0.45, h: 1.8 }); };
  function targetFor(n) {
    const h = G.env.hour, d = n.def;
    if (h >= 20.5 || h < 6) return { p: d.home, home: true };
    if (h < 8) return { p: d.home, home: false };
    if (h < 17) return { p: (Math.floor(h / 3 + d.seed) % 2) ? d.work : d.plaza, home: false };
    return { p: d.plaza, home: false };
  }
  N.update = function (dt) {
    const P = G.player;
    for (const n of N.list) {
      const dx0 = n.x - P.x, dz0 = n.z - P.z, far = dx0 * dx0 + dz0 * dz0 > 130 * 130;
      n.t += dt;
      if (far) continue;
      if (!n.model) n.model = build(n.def);
      if (G.mp && G.mp.skipSim()) { n.y = W.groundY(n.x, n.z); continue; } // multiplayer: o host decide onde cada NPC está
      const tg = targetFor(n);
      if (n.inside && !tg.home) { n.inside = false; n.x = n.def.home[0]; n.z = n.def.home[1]; }
      if (!n.inside) {
        let wx = 0, wz = 0;
        if (!n.wp || n.wpT <= 0) { n.wp = [tg.p[0] + M.rnd(-2.5, 2.5), tg.p[1] + M.rnd(-2.5, 2.5)]; n.wpT = M.rnd(4, 9); }
        n.wpT -= dt;
        const dx = n.wp[0] - n.x, dz = n.wp[1] - n.z, l = Math.hypot(dx, dz);
        const talking = n.talking;
        if (l > 0.7 && !talking) { const sp = 2.1; wx = dx / l * sp; wz = dz / l * sp; n.yaw = M.lerpAng(n.yaw, Math.atan2(dx, dz), Math.min(1, 8 * dt)); }
        else if (talking) n.yaw = M.lerpAng(n.yaw, Math.atan2(P.x - n.x, P.z - n.z), Math.min(1, 8 * dt));
        n.vx += (wx - n.vx) * Math.min(1, 8 * dt); n.vz += (wz - n.vz) * Math.min(1, 8 * dt);
        const p2 = [n.x + n.vx * dt, n.z + n.vz * dt]; W.resolve(p2, 0.45); n.x = p2[0]; n.z = p2[1]; n.y = W.groundY(n.x, n.z);
        n.ph += Math.hypot(n.vx, n.vz) * dt * 3.6;
        if (tg.home && Math.hypot(n.x - n.def.home[0], n.z - n.def.home[1]) < 1.8) n.inside = true;
      }
    }
  };
  N.draw = function () {
    const P = G.player;
    for (const n of N.list) {
      if (n.inside || !n.model) continue;
      const d2 = (n.x - P.x) ** 2 + (n.z - P.z) ** 2; if (d2 > 100 * 100) continue;
      G.models.draw(n.model, { x: n.x, y: n.y, z: n.z, yaw: n.yaw, scale: 1 }, { ph: n.ph, sp: Math.min(1, Math.hypot(n.vx, n.vz) / 2.5), t: n.t }, { outline: d2 < 2500 ? 0.03 : 0 });
      fx.imm(false, n.x, W.groundY(n.x, n.z) + 0.06, n.z, 1.2, 0.05, 0.05, 0.08, 0.28);
      if (G.quests.hasMark(n.def.id) && d2 < 60 * 60) { const b = Math.sin(n.t * 4) * 0.12; fx.imm(true, n.x, n.y + 2.6 + b, n.z, 1.5, 1, 0.85, 0.2, 0.95); fx.imm(true, n.x, n.y + 2.6 + b, n.z, 0.7, 1, 1, 0.8, 1); }
    }
  };
  N.near = function (x, z, r) {
    let best = null, bd = r * r;
    for (const n of N.list) { if (n.inside || !n.model) continue; const d = (n.x - x) ** 2 + (n.z - z) ** 2; if (d < bd) { bd = d; best = n; } }
    return best;
  };
})();
