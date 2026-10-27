'use strict';
/* Elemental World — churrasqueiras e cozinha: carne crua (caça) vira carne assada na churrasqueira, num braseiro aceso ou com a própria chama */
(function () {
  const G = window.G, M = G.M, W = G.world, gfx = G.gfx;
  const An = (G.animals = { grills: [], mesh: null, t: 0 });
  An.init = function () {
    if (W._grills) return; W._grills = true;
    for (const t of W.towns) {
      const a = 0.9, x = t.x + Math.cos(a) * 7, z = t.z + Math.sin(a) * 7;
      const g = { kind: 'grill', x, y: W.groundY(x, z), z, rr: 3, yaw: a, lit: true };
      An.grills.push(g); W.objs.push(g); W.addCircle(x, z, 0.9, 'prop');
    }
  };
  function build() {
    const b = new gfx.MB(0.03), H = M.hex, I = (x, y, z, sx, sy, sz) => { const m = M.mat(); M.trs(m, x, y, z, 0, 0, 0, sx, sy, sz); return m; };
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(I(sx * 0.6, 0.45, sz * 0.3, 0.1, 0.9, 0.1), H('#2a2622'));
    b.box(I(0, 0.88, 0, 1.4, 0.14, 0.8), H('#3a342e'));
    b.box(I(0, 0.96, 0, 1.2, 0.04, 0.6), H('#d04a18'));
    for (let i = -2; i <= 2; i++) b.box(I(i * 0.24, 1.02, 0, 0.03, 0.03, 0.62), H('#8a8a90'));
    return b.build();
  }
  An.draw = function () {
    if (!An.grills.length) return; if (!An.mesh) An.mesh = build();
    const e = gfx.eye, m = M.mat();
    for (const g of An.grills) {
      const dx = g.x - e[0], dz = g.z - e[2]; if (dx * dx + dz * dz > 6400) continue;
      M.trs(m, g.x, g.y, g.z, 0, g.yaw, 0, 1, 1, 1); gfx.draw(An.mesh, m, { outline: 0.02 });
    }
  };
  An.update = function (dt) {
    An.t -= dt; if (An.t > 0) return; An.t = 0.12;
    const P = G.player;
    for (const g of An.grills) if (Math.hypot(g.x - P.x, g.z - P.z) < 40) G.fx.flame(g.x + M.rnd(-0.4, 0.4), g.y + 1.05, g.z + M.rnd(-0.2, 0.2), 0.35);
  };
  An.cook = function () {
    const It = G.items, n = It.count('carne_crua');
    if (n < 1) { G.ui.toast('Você não tem carne crua. Cace porcos e vacas!'); return; }
    It.add('carne_crua', -n); It.add('carne', n); G.audio.sfx('sizzle'); G.audio.sfx('pick');
    G.ui.toast('Você assou ' + n + ' carne(s): agora recuperam vida!', 'ok'); G.ui.pick('+' + n + ' carne assada');
  };
})();
