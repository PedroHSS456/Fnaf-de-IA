'use strict';
/* Elemental World — Dobra de TERRA: força, muros, pedras e tremores */
(function () {
  const G = window.G; const M = G.M; const B = G.bend; const W = G.world; const fx = G.fx;
  const COL = [0.66, 0.5, 0.3];
  const chips = (p) => { if (Math.random() < 0.6) fx.p(false, p.x, p.y, p.z, M.rnd(-0.5, 0.5), M.rnd(-0.2, 0.5), M.rnd(-0.5, 0.5), 0.45, 0.2, 0.08, 0.5, 0.38, 0.24, 0.8, 5, 0.5); };
  const E = (G.elements.terra = { id: 'terra', nome: 'Terra', ico: '🪨', col: COL, desc: 'Força e resistência: muros, pedregulhos e tremores.', passiva: '+12% de vida máxima' });
  E.blastFx = function (x, y, z, r) {
    fx.burst(x, y + 0.3, z, Math.min(50, 10 + r * 8), [0.55, 0.42, 0.27], r * 2.4, 0.5, 0.8, false, 10); fx.dust(x, y, z, Math.min(30, 8 + r * 4), [0.65, 0.55, 0.4]); fx.ring(x, y + 0.2, z, 0.8, 24, [0.7, 0.6, 0.4], false, 0.2);
  };
  const rockShot = (it, size, speed, extra) => { const v = B.aim(it, speed); return B.proj(Object.assign({ x: it.x, y: it.y, z: it.z, vx: v[0], vy: v[1], vz: v[2], r: 0.28 + size * 0.4, life: it.range / speed + 0.3, dmg: it.dmg, el: 'terra', size, mesh: 'rock', col: [0.62, 0.48, 0.3], add: false, glow: 0, trail: chips, grav: 3, kb: 3, curve: it.curve * 0.3 }, extra || {})); };
  E.shapes = {
    jab(it) { rockShot(it, 0.22 * it.size, 24, { grav: 4 }); fx.dust(it.px, G.player.y, it.pz, 3); },
    charged(it) { const s = 0.5 + it.charge * 0.8; rockShot(it, s, 17, { grav: 7, explode: 2.6 + it.charge * 2.2, explodeDmg: it.dmg * 0.7, explodeOpts: { kb: 8, up: 4, stun: 1.2 }, status: { stun: 0.6 }, kb: 6 }); },
    launch(it) {
      // onda de pedra pelo chão
      const sp = 18, P = G.player; let acc = 0;
      B.zone({ x: it.px + it.dirx, z: it.pz + it.dirz, r: 1.7 * Math.sqrt(it.size), life: it.range / sp, vx: it.dirx * sp, vz: it.dirz * sp, el: 'terra', hit: it.dmg, tick: 0.05, kb: 7, up: 7, stun: 0.6, fxFn: (z, dt) => {
        acc += dt; const y = W.groundY(z.x, z.z);
        if (acc > 0.07) { acc = 0; B.struct({ x: z.x + M.rnd(-1, 1), z: z.z + M.rnd(-1, 1), y, w: 0.9, h: 1.3 + Math.random() * 0.9, life: 0.55, hp: 999, mesh: 'box', col: [0.62, 0.48, 0.3], rise: 0.1, solid: false, ry: Math.random() * 3 }); }
        fx.dust(z.x, y, z.z, 1); G.cam.kick(0.01);
      } });
    },
    slam(it) {
      // muro de pedra perpendicular à direção
      const n = 3 + Math.round(it.size * 2), cx = it.tx, cz = it.tz, px = -it.dirz, pz = it.dirx;
      for (let i = 0; i < n; i++) {
        const o = (i - (n - 1) / 2) * 1.5, x = cx + px * o, z = cz + pz * o;
        B.zone({ x, z, r: 0.1, life: 0.04 * i + 0.02, tick: 99, onEnd: () => {
          const y = W.groundY(x, z); if (W.waterDepth(x, z) > 0.5) return;
          G.combat.area(x, y, z, 1.6, it.dmg * 0.6, { el: 'terra', kb: 4, up: 6, stun: 0.8 });
          B.struct({ x, z, y, w: 1.6, h: 3.4 + Math.random() * 0.5, life: 9, hp: 90, mesh: 'box', col: [0.58 + Math.random() * 0.08, 0.45, 0.3], rise: 0.22, ry: Math.atan2(px, pz), sd: 1.2, el: 'terra' });
          fx.dust(x, y, z, 6); fx.burst(x, y + 0.5, z, 6, [0.55, 0.42, 0.27], 4, 0.4, 0.6, false, 9);
        } });
      }
      G.cam.kick(0.08); G.audio.sfx('rock');
    },
    sweep(it) {
      const R = 6 * (it.range / 8);
      G.combat.cone(it.px, it.pz, it.dirx, it.dirz, R, 1.1, it.dmg, { el: 'terra', kb: 7, up: 2, stun: 0.6 });
      B.arcFx(it, R, (x, y, z, dx, dz) => fx.p(false, x, y - 0.3, z, dx * 3, M.rnd(1, 3), dz * 3, 0.5, 0.35, 0.1, 0.55, 0.42, 0.26, 0.9, 8, 0.5), 1.1);
      fx.dust(it.px + it.dirx * 2, G.player.y, it.pz + it.dirz * 2, 8); G.cam.kick(0.05);
    },
    ring(it) {
      const P = G.player; P.armorT = Math.max(P.armorT, 8);
      B.blast('terra', P.x, P.y, P.z, 4.8, it.dmg * 0.6, { kb: 9, up: 3, stun: 0.8 });
      B.zone({ follow: true, x: P.x, z: P.z, r: 0.1, life: 8, tick: 99, fxFn: (z) => { for (let i = 0; i < 1; i++) { const a = G.player.t * 2.6 + i * 3.1; fx.p(false, z.x + Math.cos(a) * 0.9, G.player.y + 0.6 + Math.sin(a * 2) * 0.4 + 0.5, z.z + Math.sin(a) * 0.9, 0, 0, 0, 0.2, 0.28, 0.2, 0.55, 0.42, 0.26, 0.95, 0, 0); } } });
    },
  };
  E.hold = {
    drain: 9,
    start(h) { h.st.orb = B.orb({ el: 'terra', col: [0.62, 0.48, 0.3], size: 0.25, max: 1.3, mesh: 'rock' }); },
    update(dt, it, h) {
      const o = h.st.orb, P = G.player; const hp = B.handPos();
      o.pos = [hp[0] + Math.sin(P.yaw) * 0.5, hp[1] + 0.6 + h.charge * 0.5, hp[2] + Math.cos(P.yaw) * 0.5];
      if (Math.random() < 0.5) fx.p(false, P.x + M.rnd(-1.5, 1.5), P.y + 0.1, P.z + M.rnd(-1.5, 1.5), 0, M.rnd(2, 4), 0, 0.5, 0.2, 0.08, 0.55, 0.42, 0.26, 0.8, 0, 0);
    },
    end(h, it) {
      const o = h.st.orb; if (!o) return; o.dead = true; const s = o.size;
      const v = B.aim(it, 20, o.pos ? o.pos[1] : it.y);
      B.proj({ x: o.pos ? o.pos[0] : it.x, y: o.pos ? o.pos[1] : it.y, z: o.pos ? o.pos[2] : it.z, vx: v[0], vy: v[1], vz: v[2], r: 0.35 + s * 0.5, life: 1.8, grav: 6, dmg: it.dmg * (0.9 + s), el: 'terra', size: s, mesh: 'rock', col: [0.62, 0.48, 0.3], add: false, glow: 0, trail: chips, status: { stun: 0.8 }, kb: 7, explode: 2.6 + s * 2, explodeDmg: it.dmg * 0.7, explodeOpts: { kb: 9, up: 4, stun: 1.2 } });
      G.audio.sfx('cast_terra');
    },
    cancel(h) { if (h.st.orb) h.st.orb.dead = true; },
  };
  E.quick = [
    { id: 'pedra', nome: 'Pedregulho', ico: '🪨', cost: 10, cd: 1.6, shape: 'charged', charge: 0.5, run(it) { E.shapes.charged(it); } },
    { id: 'muro', nome: 'Muro de Pedra', ico: '🧱', cost: 18, cd: 6, shape: 'slam', len: 0.45, run(it) { it.tx = G.player.x + it.dirx * 5; it.tz = G.player.z + it.dirz * 5; E.shapes.slam(it); } },
    { id: 'armadura', nome: 'Armadura', ico: '🛡️', cost: 22, cd: 14, shape: 'ring', run(it) { E.shapes.ring(it); } },
    { id: 'terremoto', nome: 'Terremoto', ico: '💥', cost: 36, cd: 18, shape: 'slam', run(it) {
      const P = G.player; G.cam.kick(0.3);
      for (let i = 0; i < 3; i++) B.zone({ x: P.x, z: P.z, r: 0.1, life: 0.15 + i * 0.25, tick: 99, onEnd: () => { B.blast('terra', P.x, P.y, P.z, 4 + i * 3, it.dmg * (1.1 - i * 0.2), { kb: 8, up: 5, stun: 1.6 }); fx.ring(P.x, P.y + 0.2, P.z, 2 + i * 3, 30, [0.6, 0.48, 0.3], false, 0.3); } });
    } },
  ];
})();
