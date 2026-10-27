'use strict';
/* Elemental World — Dobra de ÁGUA: fluidez, controle, gelo e cura. Usa a reserva de água como fonte. */
(function () {
  const G = window.G; const M = G.M; const B = G.bend; const W = G.world; const fx = G.fx;
  const COL = [0.3, 0.65, 1];
  const drop = (p) => { fx.p(true, p.x + M.rnd(-0.1, 0.1), p.y + M.rnd(-0.1, 0.1), p.z + M.rnd(-0.1, 0.1), M.rnd(-0.5, 0.5), M.rnd(-0.5, 0.5), M.rnd(-0.5, 0.5), 0.35, p.size * 1.1, 0.1, 0.45, 0.75, 1, 0.7, 2, 0.5); };
  const E = (G.elements.agua = { id: 'agua', nome: 'Água', ico: '💧', col: COL, desc: 'Fluidez e controle: gelo, ondas e cura. Precisa de água por perto.', passiva: 'Reserva de água recarrega perto de lagos, neve e chuva' });
  E.blastFx = function (x, y, z, r) {
    fx.burst(x, y + 0.4, z, Math.min(60, 10 + r * 10), [0.4, 0.75, 1], r * 2.6, 0.5, 0.7, false, 7);
    fx.burst(x, y + 0.5, z, 14, [0.9, 0.97, 1], r * 1.8, 0.35, 0.5, true, 4); fx.ring(x, y + 0.3, z, 0.8, 26, [0.5, 0.8, 1], true, 0.2);
  };
  const bolt = (it, size, speed, extra) => { const v = B.aim(it, speed); return B.proj(Object.assign({ x: it.x, y: it.y, z: it.z, vx: v[0], vy: v[1], vz: v[2], r: 0.3 + size * 0.3, life: it.range / speed + 0.2, dmg: it.dmg, el: 'agua', size, col: COL, trail: drop, status: { wet: 3 }, kb: 2, curve: it.curve * 0.4, stretch: 2 }, extra || {})); };
  E.shapes = {
    jab(it) { bolt(it, 0.24 * it.size, 30); fx.burst(it.x, it.y, it.z, 5, COL, 3, 0.25, 0.3, false, 3); },
    charged(it) { const s = 0.5 + it.charge * 0.8; bolt(it, s, 19, { stretch: 1, grav: 5, r: 0.4 + s * 0.4, explode: 2.5 + it.charge * 2.5, explodeDmg: it.dmg * 0.6, explodeOpts: { kb: 7, up: 2, wet: 3, slow: 2 }, kb: 4 }); },
    launch(it) {
      const v = B.aim(it, 40);
      B.proj({ x: it.x, y: it.y, z: it.z, vx: v[0], vy: v[1], vz: v[2], r: 0.9 * Math.sqrt(it.size), life: it.range / 40 + 0.1, dmg: it.dmg, el: 'agua', size: 0.4 * it.size, sx: 1.4, stretch: 5, col: COL, pierce: 3, status: { wet: 3, slow: 1.2 }, kb: 5, curve: it.curve * 0.5, trail: (p) => { drop(p); drop(p); G.inter.water(p.x, p.z, 1.2); } });
    },
    slam(it) {
      // fileira de espinhos de gelo do jogador até o alvo
      const P = G.player, n = 5 + Math.round(it.len * 3), step = Math.max(1.8, it.range / n);
      for (let i = 0; i < n; i++) {
        const d = 2.2 + i * step * 0.9, x = P.x + it.dirx * d, z = P.z + it.dirz * d;
        B.zone({ x, z, r: 0.1, life: 0.06 * i + 0.02, tick: 99, onEnd: () => spike(x, z, it) });
      }
    },
    sweep(it) {
      const R = 7 * (it.range / 8);
      G.combat.cone(it.px, it.pz, it.dirx, it.dirz, R, 1.2, it.dmg, { el: 'agua', kb: 10, up: 1, wet: 3 });
      B.arcFx(it, R, (x, y, z, dx, dz) => fx.p(true, x, y, z, dx * 4, M.rnd(0, 1.5), dz * 4, 0.5, 0.55, 0.2, 0.4, 0.75, 1, 0.8, 2, 1), 1.25);
      G.inter.water(it.px + it.dirx * R * 0.6, it.pz + it.dirz * R * 0.6, R * 0.6); G.cam.kick(0.04);
    },
    ring(it) {
      const P = G.player, st = G.prog.stats(); P.armorT = Math.max(P.armorT, 4.5); P.burn = 0; P.wet = 4;
      fx.ring(P.x, P.y + 0.3, P.z, 1.4, 30, COL, true, 0.8); fx.burst(P.x, P.y + 1, P.z, 24, [0.5, 0.85, 1], 5, 0.4, 0.8, true, 0);
      B.zone({ follow: true, x: P.x, z: P.z, r: 3.6, life: 4.5, el: 'agua', dps: 4, tick: 0.25, kb: 3, deflect: 1, fxFn: (z, dt) => { for (let i = 0; i < 3; i++) { const a = G.player.t * 3 + i * 2.1, h = 0.4 + (z.age * 0.8 + i * 0.7) % 1.8; fx.p(true, z.x + Math.cos(a) * 1.4, G.player.y + h, z.z + Math.sin(a) * 1.4, 0, 0.2, 0, 0.3, 0.35, 0.1, 0.45, 0.8, 1, 0.8, 0, 0); } },
        onTick: () => { G.player.heal(st.hpMax * 0.014); G.player.burn = 0; } });
      G.inter.water(P.x, P.z, 4);
    },
  };
  function spike(x, z, it) {
    const y = W.groundY(x, z); if (W.waterDepth(x, z) > 0.5) { fx.burst(x, W.SEA, z, 6, [0.8, 0.95, 1], 3, 0.3, 0.4, true, 3); return; }
    G.combat.area(x, y, z, 1.5, it.dmg * 0.7, { el: 'agua', kb: 3, up: 6, slow: 2.5, wet: 2 });
    B.struct({ x, z, y, w: 0.6, h: 2.2 + Math.random() * 1.6, life: 4, hp: 30, mesh: 'spike', col: [0.7, 0.9, 1], add: [0.12, 0.22, 0.3], el: 'agua', rise: 0.12, ry: Math.random() * 6 });
    fx.burst(x, y + 0.3, z, 8, [0.85, 0.97, 1], 4, 0.3, 0.5, true, 5);
  }
  E.spike = spike;
  E.hold = {
    drain: 10,
    start(h) { h.st.orb = B.orb({ el: 'agua', col: COL, size: 0.25, max: 1.25, mesh: 'sphere' }); },
    update(dt, it, h) {
      const o = h.st.orb; o.pos = null;
      const hp = B.handPos(); o.pos = [hp[0] + Math.sin(G.player.yaw) * 0.4, hp[1] + 0.25, hp[2] + Math.cos(G.player.yaw) * 0.4];
      if (Math.random() < 0.7) fx.p(true, o.pos[0] + M.rnd(-1, 1), o.pos[1] + M.rnd(-1, 1), o.pos[2] + M.rnd(-1, 1), 0, 0, 0, 0.3, 0.25, 0.05, 0.45, 0.8, 1, 0.8, 0, 0);
    },
    end(h, it) {
      const o = h.st.orb; if (!o) return; o.dead = true; const s = o.size;
      const v = B.aim(it, 22, o.pos ? o.pos[1] : it.y);
      B.proj({ x: o.pos ? o.pos[0] : it.x, y: o.pos ? o.pos[1] : it.y, z: o.pos ? o.pos[2] : it.z, vx: v[0], vy: v[1], vz: v[2], r: 0.4 + s * 0.4, life: 1.6, grav: 4, dmg: it.dmg * (0.9 + s), el: 'agua', size: s, col: COL, trail: drop, status: { wet: 3, slow: 2 }, kb: 5, explode: 2.4 + s * 2.4, explodeDmg: it.dmg * 0.7, explodeOpts: { kb: 8, up: 3, wet: 3, slow: 2.5 } });
      G.audio.sfx('cast_agua');
    },
    cancel(h) { if (h.st.orb) h.st.orb.dead = true; },
  };
  E.quick = [
    { id: 'jato', nome: 'Jato d\'Água', ico: '💦', cost: 6, cd: 0.8, shape: 'launch', run(it) { E.shapes.jab(it); } },
    { id: 'gelo', nome: 'Espinhos de Gelo', ico: '🧊', cost: 18, cd: 6, shape: 'slam', run(it) { E.shapes.slam(it); } },
    { id: 'cura', nome: 'Cura', ico: '💚', cost: 24, cd: 12, shape: 'ring', run(it) { E.shapes.ring(it); G.player.heal(G.prog.stats().hpMax * 0.12); } },
    { id: 'mare', nome: 'Maré', ico: '🌊', cost: 34, cd: 16, shape: 'launch', run(it) {
      const v = B.aim(it, 22);
      B.proj({ x: it.px + it.dirx, y: G.player.y + 0.9, z: it.pz + it.dirz, vx: v[0], vy: 0, vz: v[2], r: 2.6, life: 1.9, dmg: it.dmg * 2, el: 'agua', size: 1.1, sx: 3.2, sy: 1.1, stretch: 0.6, col: COL, pierce: 99, status: { wet: 4, slow: 2 }, kb: 12, up: 3, trail: (p) => { for (let i = 0; i < 7; i++) fx.p(true, p.x + M.rnd(-2.6, 2.6) * Math.abs(p.vz) / 22 - M.rnd(-2.6, 2.6) * 0, p.y + M.rnd(-0.6, 1.2), p.z + M.rnd(-2.6, 2.6) * Math.abs(p.vx) / 22, M.rnd(-1, 1), M.rnd(0, 2), M.rnd(-1, 1), 0.5, 0.8, 0.2, 0.5, 0.8, 1, 0.8, 3, 1); G.inter.water(p.x, p.z, 2.5); } });
      G.cam.kick(0.1);
    } },
  ];
})();
