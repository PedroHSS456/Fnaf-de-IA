'use strict';
/* Elemental World — interações dos elementos com o ambiente (fogo queima, água apaga, terra quebra, ar espalha) */
(function () {
  const G = window.G; const M = G.M; const W = G.world;
  const I = (G.inter = { burning: [] });
  I.ignite = function (p, secs) {
    if (!p.flam || p.burn > 0 && p.burn > secs) return;
    if (p.burnt) return;
    if (!(p.burn > 0)) I.burning.push(p);
    p.burn = Math.max(p.burn || 0, secs);
  };
  /* fogo em (x,z) com raio r: acende árvores/mato e objetos */
  I.fire = function (x, z, r, power) {
    power = power || 1;
    if (W.waterDepth(x, z) > 0.3) { G.fx.smoke(x, W.SEA + 0.2, z, 5, 0.8); return; }
    for (const p of W.propsNear(x, z, r + 0.5, (q) => q.flam)) I.ignite(p, 5 + 3 * power);
    for (const d of G.dynprops.list) if (d.alive && d.flam && Math.hypot(d.x - x, d.z - z) < r + d.r) { d.burn = Math.max(d.burn, 4); }
  };
  I.water = function (x, z, r) {
    for (let i = I.burning.length - 1; i >= 0; i--) { const p = I.burning[i]; if (Math.hypot(p.x - x, p.z - z) < r + 1) { p.burn = 0; G.fx.smoke(p.x, p.y + p.h, p.z, 4, 0.7); } }
    for (const d of G.dynprops.list) if (d.alive && Math.hypot(d.x - x, d.z - z) < r + d.r) d.burn = 0;
    for (const e of G.enemies.list) if (e.alive && Math.hypot(e.x - x, e.z - z) < r + e.r) { if (e.burnT > 0) { e.burnT = 0; G.fx.smoke(e.x, e.y + 1, e.z, 4, 0.7); } e.wetT = 4; }
    const P = G.player; if (Math.hypot(P.x - x, P.z - z) < r + 0.5) { P.burn = 0; P.wet = 4; }
  };
  I.update = function (dt) {
    const rain = G.env.isRaining();
    for (let i = I.burning.length - 1; i >= 0; i--) {
      const p = I.burning[i];
      p.burn -= dt * (rain ? 3 : 1);
      if (p.burn <= 0) { p.burn = 0; p.burnt = true; G.fx.smoke(p.x, p.y + p.h * 0.5, p.z, 6, 1.0); I.burning.splice(i, 1); continue; }
      if (Math.random() < dt * 18) G.fx.flame(p.x + M.rnd(-0.5, 0.5), p.y + p.h * M.rnd(0.4, 1), p.z + M.rnd(-0.5, 0.5), 1.0 + p.h * 0.12);
      // espalha
      if (Math.random() < dt * 0.9) { const n = W.propsNear(p.x, p.z, 3.2, (q) => q.flam && !q.burn && !q.burnt); if (n.length) I.ignite(n[(Math.random() * n.length) | 0], 5); }
      // fere quem está perto
      const P = G.player; if (Math.hypot(P.x - p.x, P.z - p.z) < 1.4 && P.y < p.y + p.h && P.iframes <= 0 && P.burn <= 0 && Math.random() < dt * 2) P.burn = 2;
      for (const e of G.enemies.list) if (e.alive && Math.hypot(e.x - p.x, e.z - p.z) < 1.8) e.burnT = Math.max(e.burnT, 2);
    }
  };
})();
