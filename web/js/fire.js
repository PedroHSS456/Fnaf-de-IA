'use strict';
/* Elemental World — Dobra de FOGO: poder, intensidade, dano alto e queimadura */
(function () {
  const G = window.G; const M = G.M; const B = G.bend; const W = G.world; const fx = G.fx;
  const COL = [1, 0.45, 0.1];
  const trail = (p) => { for (let i = 0; i < 2; i++) fx.p(true, p.x + M.rnd(-0.1, 0.1), p.y + M.rnd(-0.1, 0.1), p.z + M.rnd(-0.1, 0.1), M.rnd(-0.4, 0.4), M.rnd(-0.2, 0.8), M.rnd(-0.4, 0.4), 0.4, p.size * 1.6, 0.1, 1, M.rnd(0.35, 0.65), 0.08, 0.9, -0.6, 0.6); if (Math.random() < 0.3) fx.p(false, p.x, p.y, p.z, 0, 0.5, 0, 0.8, p.size, p.size * 2.2, 0.3, 0.28, 0.28, 0.35, -0.3, 0.5); };
  const E = (G.elements.fogo = { id: 'fogo', nome: 'Fogo', ico: '🔥', col: COL, desc: 'Poder e intensidade: o maior dano e inimigos em chamas.', passiva: '+8% de dano' });
  E.blastFx = function (x, y, z, r) {
    fx.burst(x, y + 0.4, z, Math.min(70, 12 + r * 12), [1, 0.5, 0.1], r * 2.8, 0.8, 0.7, true, -1);
    fx.burst(x, y + 0.5, z, Math.min(30, 6 + r * 5), [1, 0.85, 0.3], r * 2, 0.5, 0.5, true, 0);
    fx.smoke(x, y + 0.5, z, 8, 1); fx.ring(x, y + 0.3, z, 0.8, 28, [1, 0.55, 0.15], true, 0.2);
  };
  const fireball = (it, size, speed, expl, extra) => {
    const v = B.aim(it, speed);
    return B.proj(Object.assign({ x: it.x, y: it.y, z: it.z, vx: v[0], vy: v[1], vz: v[2], r: 0.3 + size * 0.35, life: it.range / speed + 0.2, dmg: it.dmg, el: 'fogo', size, col: COL, trail, status: { burn: 2.5 }, kb: 3, curve: it.curve * 0.35, explode: expl, explodeDmg: it.dmg * 0.6, explodeOpts: { kb: 6, up: 2, burn: 3 } }, extra || {}));
  };
  E.shapes = {
    jab(it) { fireball(it, 0.28 * it.size, 26, 1.8); fx.burst(it.x, it.y, it.z, 6, COL, 3, 0.3, 0.3, true, 0); },
    charged(it) { const s = 0.5 + it.charge * 0.9; fireball(it, s, 20, 2.6 + it.charge * 3.2, { r: 0.4 + s * 0.4, kb: 5 }); fx.burst(it.x, it.y, it.z, 18, COL, 5, 0.5, 0.4, true, 0); G.cam.kick(0.03); },
    launch(it) {
      const v = B.aim(it, 34), s = 0.55 * it.size;
      B.proj({ x: it.x, y: it.y - 0.1, z: it.z, vx: v[0], vy: v[1], vz: v[2], r: 1.2 * Math.sqrt(it.size), life: it.range / 34 + 0.1, dmg: it.dmg, el: 'fogo', size: s, sx: 3.2, sy: 0.5, stretch: 0.9, col: COL, pierce: 4, status: { burn: 2.5 }, kb: 4, curve: it.curve * 0.5, trail: (p, dt) => {
        for (let i = 0; i < 6; i++) { const o = M.rnd(-1.6, 1.6) * it.size, nx = -p.vz, nz = p.vx, l = Math.hypot(nx, nz) || 1; fx.p(true, p.x + nx / l * o, p.y + M.rnd(-0.2, 0.3), p.z + nz / l * o, M.rnd(-0.3, 0.3), M.rnd(0, 1), M.rnd(-0.3, 0.3), 0.4, 0.7, 0.1, 1, M.rnd(0.3, 0.6), 0.08, 0.9, -0.4, 0.4); }
        p._t = (p._t || 0) + dt; if (p._t > 0.15) { p._t = 0; G.inter.fire(p.x, p.z, 1.4, 0.4); }
      } });
    },
    slam(it) { eruption(it.tx, it.tz, 3.2 * it.size, it.dmg, 0.35); },
    sweep(it) {
      const R = 6.5 * (it.range / 8);
      G.combat.cone(it.px, it.pz, it.dirx, it.dirz, R, 1.05, it.dmg, { el: 'fogo', kb: 6, up: 1.5, burn: 2.5 });
      B.arcFx(it, R, (x, y, z, dx, dz, k) => fx.p(true, x, y, z, dx * 3, M.rnd(0, 1.2), dz * 3, 0.45, 0.7, 0.15, 1, M.rnd(0.35, 0.6), 0.08, 0.9, -0.3, 1));
      G.inter.fire(it.px + it.dirx * R * 0.6, it.pz + it.dirz * R * 0.6, R * 0.5, 0.6); G.cam.kick(0.04);
    },
    ring(it) {
      const R = Math.max(4, it.range * 0.9);
      B.blast('fogo', it.px, G.player.y, it.pz, R, it.dmg, { kb: 9, up: 3, burn: 3 });
      fx.ring(it.px, G.player.y + 0.4, it.pz, R * 0.4, 36, COL, true, 0.5); fx.ring(it.px, G.player.y + 0.4, it.pz, R * 0.8, 48, [1, 0.7, 0.2], true, 0.5);
      B.zone({ follow: true, x: it.px, z: it.pz, r: 3.2, life: 3.5, el: 'fogo', dps: it.dmg * 0.35, tick: 0.25, burn: 2, deflect: 2, fxFn: (z) => { for (let i = 0; i < 3; i++) { const a = Math.random() * 6.28; fx.flame(z.x + Math.cos(a) * 3, G.player.y + 0.1, z.z + Math.sin(a) * 3, 0.9); } } });
    },
  };
  function eruption(x, z, r, dmg, delay) {
    const y = W.groundY(x, z);
    B.zone({ x, z, r: 0.1, life: delay, dps: 0, tick: 99, fxFn: (zn) => { if (Math.random() < 0.8) fx.ring(x, y + 0.15, z, r * (1 - zn.age / delay * 0.3), 6, [1, 0.5, 0.15], true, 0.1); },
      onEnd: () => {
        B.blast('fogo', x, y, z, r, dmg, { kb: 7, up: 8, burn: 3 });
        B.zone({ x, z, r: 0.1, life: 0.7, dps: 0, tick: 99, fxFn: () => { for (let i = 0; i < 12; i++) { const a = M.rnd(0, 6.28), rr = M.rnd(0, r * 0.7); fx.p(true, x + Math.cos(a) * rr, y + 0.2, z + Math.sin(a) * rr, 0, M.rnd(6, 14), 0, 0.6, 0.9, 0.2, 1, M.rnd(0.3, 0.6), 0.08, 0.9, 5, 0.3); } } });
        B.zone({ x, z, r: r * 0.9, life: 4, el: 'fogo', dps: dmg * 0.25, tick: 0.3, burn: 2, fxFn: () => { if (Math.random() < 0.7) fx.flame(x + M.rnd(-r, r) * 0.8, y + 0.1, z + M.rnd(-r, r) * 0.8, 1); } });
      } });
  }
  E.eruption = eruption;
  E.hold = {
    drain: 14,
    start(h) { h.st.acc = 0; h.st.snd = 0; },
    update(dt, it, h) {
      const P = G.player, len = (7 + 5 * h.charge) * G.prog.stats().range, hx = it.x, hy = it.y - 0.15, hz = it.z;
      for (let i = 0; i < Math.ceil(10 * fx.quality); i++) {
        const a = it.yaw + M.rnd(-0.2, 0.2), sp = M.rnd(9, 15), up = M.rnd(-0.15, 0.25);
        fx.p(true, hx, hy, hz, Math.sin(a) * sp, up * sp * 0.4, Math.cos(a) * sp, len / sp, 0.35, 1.6 + h.charge, 1, M.rnd(0.3, 0.7), 0.06, 0.8, -0.5, 0.6);
      }
      if (Math.random() < 0.3) fx.p(false, hx + it.dirx * len * 0.6, hy + 0.5, hz + it.dirz * len * 0.6, 0, 1, 0, 1, 0.8, 2, 0.3, 0.28, 0.28, 0.3, -0.2, 0.5);
      h.st.acc += dt; h.st.snd += dt;
      if (h.st.snd > 0.25) { h.st.snd = 0; G.audio.sfx('flame'); G.audio.vibrate(10); }
      if (h.st.acc >= 0.2) {
        h.st.acc = 0;
        G.combat.cone(P.x, P.z, it.dirx, it.dirz, len, 0.32, B.dmg(14, 0.8 + h.charge * 0.5) * 0.4 * (it.mul || 1), { el: 'fogo', kb: 1.2, burn: 2.5 });
        G.inter.fire(P.x + it.dirx * len * 0.8, P.z + it.dirz * len * 0.8, 1.6, 0.5);
      }
    },
  };
  E.quick = [
    { id: 'bola', nome: 'Bola de Fogo', ico: '☄️', cost: 10, cd: 1.6, shape: 'charged', charge: 0.5, run(it) { E.shapes.charged(it); } },
    { id: 'rajada', nome: 'Rajada de Chamas', ico: '🔥', cost: 16, cd: 5, shape: 'jab', run(it) {
      const P = G.player; let n = 0;
      B.zone({ x: P.x, z: P.z, r: 0.1, life: 1.2, dps: 0, tick: 99, fxFn: (z, dt) => {
        const h = B.handPos(); n += dt;
        for (let i = 0; i < 8; i++) { const a = it.yaw + M.rnd(-0.22, 0.22), sp = M.rnd(10, 16); fx.p(true, h[0], h[1] - 0.15, h[2], Math.sin(a) * sp, M.rnd(-0.5, 0.8), Math.cos(a) * sp, 0.55, 0.4, 1.8, 1, M.rnd(0.3, 0.7), 0.06, 0.85, -0.5, 0.6); }
        if (n > 0.2) { n = 0; G.combat.cone(P.x, P.z, it.dirx, it.dirz, 9, 0.36, it.dmg * 0.5, { el: 'fogo', kb: 2, burn: 3 }); G.inter.fire(P.x + it.dirx * 7, P.z + it.dirz * 7, 2, 0.5); G.audio.sfx('flame'); }
        P.pose(0.2, it.yaw);
      } });
    } },
    { id: 'impulso', nome: 'Impulso Flamejante', ico: '💨', cost: 14, cd: 6, shape: 'launch', run(it) {
      const P = G.player; P.dashT = 0.3; P.iframes = Math.max(P.iframes, 0.35); P.dashDX = it.dirx; P.dashDZ = it.dirz; P.yaw = it.yaw;
      G.combat.line(P.x, P.z, it.dirx, it.dirz, 9, 1.3, it.dmg, { el: 'fogo', kb: 5, burn: 3 });
      B.zone({ x: P.x, z: P.z, r: 0.1, life: 0.35, tick: 99, fxFn: () => { fx.flame(P.x, P.y + 0.3, P.z, 1.4); fx.burst(P.x, P.y + 0.5, P.z, 3, COL, 2, 0.5, 0.4, true, 0); G.inter.fire(P.x, P.z, 1.4, 0.4); } });
    } },
    { id: 'erupcao', nome: 'Erupção', ico: '🌋', cost: 32, cd: 16, shape: 'slam', run(it) {
      const P = G.player; for (let i = 0; i < 3; i++) { const d = 4 + i * 4.2; eruption(P.x + it.dirx * d, P.z + it.dirz * d, 3.4, it.dmg * 1.3, 0.35 + i * 0.28); }
      G.cam.kick(0.12);
    } },
  ];
})();
