'use strict';
/* Elemental World — Dobra de AR: velocidade, liberdade, empurrões e tornados */
(function () {
  const G = window.G; const M = G.M; const B = G.bend; const W = G.world; const fx = G.fx;
  const COL = [0.85, 0.95, 1];
  const streak = (p) => { fx.p(false, p.x, p.y, p.z, M.rnd(-0.3, 0.3), M.rnd(-0.3, 0.3), M.rnd(-0.3, 0.3), 0.3, p.size * 1.2, 0.2, 0.95, 0.98, 1, 0.35, 0, 1); };
  const E = (G.elements.ar = { id: 'ar', nome: 'Ar', ico: '🌀', col: COL, desc: 'Liberdade e velocidade: empurrões, tornados e planar.', passiva: '+6% de velocidade, chi mais barato' });
  E.blastFx = function (x, y, z, r) {
    fx.ring(x, y + 0.4, z, 0.8, 30, [0.95, 0.98, 1], true, 0.4); fx.ring(x, y + 0.6, z, r * 0.6, 36, [0.9, 0.97, 1], true, 0.8);
    fx.burst(x, y + 0.6, z, 20, [0.95, 0.98, 1], r * 3, 0.4, 0.5, true, 0); fx.dust(x, y, z, 10, [0.85, 0.88, 0.9]);
  };
  const slash = (it, speed, extra) => { const v = B.aim(it, speed); return B.proj(Object.assign({ x: it.x, y: it.y, z: it.z, vx: v[0], vy: v[1], vz: v[2], r: 0.5, life: it.range / speed + 0.1, dmg: it.dmg, el: 'ar', size: 0.35, sx: 2.2, sy: 0.18, stretch: 0.9, col: COL, trail: streak, kb: 3, pierce: 1, curve: it.curve * 0.4, glow: 0.6 }, extra || {})); };
  function tornado(x, z, vx, vz, r, life, dmg, h) {
    B.zone({ x, z, r, life, vx, vz, el: 'ar', dps: dmg, tick: 0.2, pull: 7, kb: 3, up: 3, deflect: 2, fxFn: (zn) => {
      const y0 = W.groundY(zn.x, zn.z);
      for (let i = 0; i < 7; i++) { const hh = M.rnd(0, h), a = M.rnd(0, 6.28) + zn.age * 8, rr = (0.5 + hh * 0.28) * r / 2.4; fx.p(false, zn.x + Math.cos(a) * rr, y0 + hh, zn.z + Math.sin(a) * rr, -Math.sin(a) * 6, 0.8, Math.cos(a) * 6, 0.5, 0.5, 0.9, 0.9, 0.94, 0.97, 0.55, 0, 0); }
      if (Math.random() < 0.4) fx.dust(zn.x, y0, zn.z, 1, [0.75, 0.75, 0.72]); G.inter.fire && 0;
    } });
  }
  E.tornado = tornado;
  E.shapes = {
    jab(it) { slash(it, 36, { size: 0.28 * it.size, dmg: it.dmg }); },
    charged(it) { const sp = 10; tornado(it.px + it.dirx * 2, it.pz + it.dirz * 2, it.dirx * sp, it.dirz * sp, 2.2 + it.charge * 1.2, 1.8 + it.charge * 1.4 + it.range / 40, it.dmg * 1.4, 4.5); G.cam.kick(0.04); },
    launch(it) { slash(it, 42, { r: 1.2 * Math.sqrt(it.size), size: 0.5 * it.size, sx: 3.6, pierce: 5, kb: 5 }); fx.burst(it.x, it.y, it.z, 10, COL, 4, 0.3, 0.4, true, 0); },
    slam(it) {
      const P = G.player;
      if (it.len < 0.28) { // impulso para o alto
        P.vy = 13.5; P.grounded = false; P.iframes = Math.max(P.iframes, 0.25);
        B.blast('ar', P.x, P.y, P.z, 4, it.dmg * 0.6, { kb: 10, up: 4 }); fx.dust(P.x, P.y, P.z, 14);
      } else B.blast('ar', it.tx, W.groundY(it.tx, it.tz), it.tz, 4.6 * it.size, it.dmg, { kb: 13, up: 6 });
      G.enemies.deflect(it.tx, it.tz, 5, true);
    },
    sweep(it) {
      const R = 8 * (it.range / 8);
      G.combat.cone(it.px, it.pz, it.dirx, it.dirz, R, 1.3, it.dmg * 0.8, { el: 'ar', kb: 13, up: 2 });
      B.arcFx(it, R, (x, y, z, dx, dz) => fx.p(false, x, y, z, dx * 5, M.rnd(0, 1), dz * 5, 0.5, 0.4, 0.3, 0.92, 0.97, 1, 0.45, 0, 1), 1.3);
      G.enemies.deflect(it.px + it.dirx * R * 0.5, it.pz + it.dirz * R * 0.5, R * 0.7, true); G.cam.kick(0.05);
    },
    ring(it) {
      const P = G.player; P.hasteT = 4.5;
      B.blast('ar', P.x, P.y, P.z, 4.2, it.dmg * 0.4, { kb: 12, up: 3 });
      B.zone({ follow: true, x: P.x, z: P.z, r: 3.4, life: 4.5, el: 'ar', dps: 5, tick: 0.25, kb: 5, deflect: 2, fxFn: (z) => { for (let i = 0; i < 3; i++) { const a = G.player.t * 6 + i * 2.1, h = (z.age * 1.5 + i * 0.6) % 2.2; fx.p(false, z.x + Math.cos(a) * (1.5 + h * 0.3), G.player.y + h, z.z + Math.sin(a) * (1.5 + h * 0.3), 0, 0.2, 0, 0.3, 0.35, 0.1, 0.92, 0.97, 1, 0.5, 0, 0); } } });
    },
  };
  E.hold = {
    drain: 8,
    start(h) { h.st.acc = 0; },
    update(dt, it, h) {
      const P = G.player, len = (8 + 4 * h.charge) * G.prog.stats().range; h.st.acc += dt;
      for (let i = 0; i < Math.ceil(7 * fx.quality); i++) { const a = it.yaw + M.rnd(-0.35, 0.35), sp = M.rnd(10, 16); fx.p(false, it.x, it.y - 0.2, it.z, Math.sin(a) * sp, M.rnd(-1, 1), Math.cos(a) * sp, len / sp, 0.25, 0.8, 0.92, 0.97, 1, 0.4, 0, 0.6); }
      if (!P.grounded && P.vy < -1.5) P.vy = Math.max(P.vy, -1.6);
      if (h.st.acc > 0.18) { h.st.acc = 0; G.combat.cone(P.x, P.z, it.dirx, it.dirz, len, 0.45, B.dmg(8, 0.8) * 0.25, { el: 'ar', kb: 6 }); G.enemies.deflect(P.x + it.dirx * len * 0.4, P.z + it.dirz * len * 0.4, len * 0.55, true); G.audio.sfx('wind'); }
    },
    end(h, it) { slash(it, 40, { r: 1.1 + h.charge, size: 0.45 + h.charge * 0.5, sx: 3.5, pierce: 6, kb: 7, dmg: it.dmg * (1 + h.charge * 0.8) }); },
  };
  E.quick = [
    { id: 'rajada', nome: 'Rajada', ico: '🌬️', cost: 6, cd: 0.9, shape: 'jab', run(it) { for (let i = -1; i <= 1; i++) { const a = it.yaw + i * 0.18; const it2 = Object.assign({}, it, { dirx: Math.sin(a), dirz: Math.cos(a), target: i ? null : it.target, dmg: it.dmg * 0.6 }); slash(it2, 36, { size: 0.26 }); } } },
    { id: 'planar', nome: 'Impulso de Vento', ico: '🍃', cost: 10, cd: 4, shape: 'launch', run(it) {
      const P = G.player; P.dashT = 0.32; P.iframes = Math.max(P.iframes, 0.4); P.dashDX = it.dirx; P.dashDZ = it.dirz; P.yaw = it.yaw; P.vy = Math.max(P.vy, 2.5); P.grounded = false;
      G.combat.line(P.x, P.z, it.dirx, it.dirz, 10, 1.3, it.dmg * 0.7, { el: 'ar', kb: 8, up: 2 });
      B.zone({ x: P.x, z: P.z, r: 0.1, life: 0.4, tick: 99, fxFn: () => fx.burst(P.x, P.y + 0.8, P.z, 3, COL, 2, 0.5, 0.4, false, 0) });
    } },
    { id: 'ciclone', nome: 'Ciclone', ico: '🌀', cost: 22, cd: 10, shape: 'ring', run(it) { E.shapes.ring(it); } },
    { id: 'tempestade', nome: 'Tempestade', ico: '⛈️', cost: 40, cd: 20, shape: 'charged', run(it) { tornado(it.px + it.dirx * 3, it.pz + it.dirz * 3, it.dirx * 4, it.dirz * 4, 4.2, 4.2, it.dmg * 2.2, 7); G.cam.kick(0.12); } },
  ];
})();
