'use strict';
/* Elemental World — objetos destrutíveis e inflamáveis (caixas, barris, feno, barricadas, gelo, entulho) */
(function () {
  const G = window.G; const M = G.M; const gfx = G.gfx; const W = G.world;
  const D = (G.dynprops = { list: [] });
  const H = M.hex;
  const I = (px, py, pz, sx, sy, sz, ry, rx, rz) => M.trs(new Float32Array(16), px, py, pz, rx || 0, ry || 0, rz || 0, sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
  const KINDS = {
    crate: { hp: 18, r: 0.55, h: 0.9, flam: true, name: 'Caixa' },
    barrel: { hp: 18, r: 0.5, h: 1.0, flam: true, boom: true, name: 'Barril' },
    hay: { hp: 10, r: 0.9, h: 1.0, flam: true, name: 'Feno' },
    barricade: { hp: 70, r: 2.0, h: 2.0, flam: true, name: 'Barricada' },
    iceblock: { hp: 45, r: 1.3, h: 2.0, ice: true, name: 'Bloco de gelo' },
    rubble: { hp: 55, r: 1.4, h: 1.8, rock: true, name: 'Pedregulho' },
  };
  const meshes = {};
  function mk() {
    let b = new gfx.MB(0.06); b.box(I(0, 0.45, 0, 0.9, 0.9, 0.9), H('#a87a45')); b.box(I(0, 0.45, 0, 0.95, 0.12, 0.95), H('#7a5530')); b.box(I(0, 0.45, 0, 0.12, 0.95, 0.95), H('#7a5530')); meshes.crate = b.build();
    b = new gfx.MB(0.05); b.cyl(I(0, 0, 0, 1, 1, 1), 8, 0.5, 0.5, H('#8a5a34'), true, false); b.cyl(I(0, 0.2, 0, 1, 0.08, 1), 8, 0.53, 0.53, H('#3a3a40'), false, false); b.cyl(I(0, 0.72, 0, 1, 0.08, 1), 8, 0.53, 0.53, H('#3a3a40'), false, false); meshes.barrel = b.build();
    b = new gfx.MB(0.08); b.box(I(0, 0.45, 0, 1.6, 0.9, 1.1), H('#d8b84a')); b.box(I(0.2, 1.0, 0, 1.0, 0.3, 0.9), H('#e0c45a')); meshes.hay = b.build();
    b = new gfx.MB(0.06); for (let i = 0; i < 5; i++) b.box(I(-1.6 + i * 0.8, 1.0, 0, 0.18, 2.0, 0.3), H('#7a5530')); b.box(I(0, 0.6, 0.05, 4.0, 0.2, 0.18), H('#5a3a20')); b.box(I(0, 1.4, 0.05, 4.0, 0.2, 0.18), H('#5a3a20')); meshes.barricade = b.build();
    b = new gfx.MB(0.04); b.box(I(0, 1.0, 0, 2.2, 2.0, 2.2, 0.3), H('#bfe3f7')); b.box(I(0.3, 2.2, 0.2, 1.2, 0.9, 1.2, 0.6), H('#d8f0fc')); meshes.iceblock = b.build();
    b = new gfx.MB(0.1); b.sphere(I(0, 0.8, 0, 1.3, 1.0, 1.2), 6, 4, H('#8e6a4c')); b.sphere(I(0.9, 0.5, 0.5, 0.8, 0.6, 0.7), 5, 3, H('#9c7656')); meshes.rubble = b.build();
  }
  D.init = function () {
    mk(); D.list.length = 0;
    for (const d of W.dynDefs) {
      const k = KINDS[d.kind]; const y = W.groundY(d.x, d.z);
      const o = Object.assign({ kind: d.kind, x: d.x, y, z: d.z, alive: true, ry: ((d.x * 7 + d.z * 13) % 6.28), burn: 0, flash: 0 }, k, { hpMax: k.hp });
      o.col = { t: 0, x: d.x, z: d.z, r: k.r, alive: true, tag: 'dyn' };
      W.dyn.push(o.col);
      o.hurt = hurt; o.knock = null; o.uid = 'd' + D.list.length;
      D.list.push(o);
    }
  };
  function hurt(d, o) {
    o = o || {};
    if (!this.alive) return 0;
    let m = 1;
    if (this.ice) m = o.el === 'fogo' ? 3 : o.el === 'terra' ? 1.2 : 0.35;
    else if (this.rock) m = o.el === 'terra' ? 2.2 : 0.4;
    else if (o.el === 'fogo' && this.flam) m = 2;
    d *= m; this.hp -= d; this.flash = 0.15;
    if (o.el === 'fogo' && this.flam && this.hp > 0) this.burn = 4;
    if (this.hp <= 0) D.destroy(this, o);
    return d;
  }
  D.destroy = function (p, o) {
    if (!p.alive) return; p.alive = false; p.col.alive = false;
    const idx = W.dyn.indexOf(p.col); if (idx >= 0) W.dyn.splice(idx, 1);
    const c = p.ice ? [0.7, 0.9, 1] : p.rock ? [0.6, 0.5, 0.4] : [0.7, 0.5, 0.3];
    G.fx.burst(p.x, p.y + 0.6, p.z, 20, c, 5, 0.4, 0.8, false, 8); G.fx.dust(p.x, p.y, p.z, 8); G.audio.sfx(p.ice ? 'ice' : 'break');
    if (p.boom) { G.combat.area(p.x, p.y, p.z, 4, 30 * G.prog.stats().dmg, { el: 'fogo', kb: 8, up: 3, burn: 3 }); G.fx.burst(p.x, p.y + 1, p.z, 40, [1, 0.5, 0.1], 9, 0.7, 0.8, true, 0); G.cam.kick(0.1); G.inter.fire(p.x, p.z, 4, 1); const P = G.player; if (Math.hypot(P.x - p.x, P.z - p.z) < 3.5) P.hurt(14, { el: 'fogo', burn: 2, kx: P.x - p.x, kz: P.z - p.z }); }
    const S = G.S;
    if (p.kind === 'crate' || p.kind === 'barrel') { const n = M.rint(2, 7); S.inv.coins += n; G.ui.pick('+' + n + ' moedas'); if (Math.random() < 0.18) { S.inv.herb++; G.ui.pick('+1 erva'); } }
    G.quests && G.quests.event('break', p.kind);
  };
  D.update = function (dt) {
    if (G.mp && G.mp.skipSim()) return; // multiplayer: só o host simula
    const e = G.cam.eye;
    for (let i = D.list.length - 1; i >= 0; i--) {
      const p = D.list[i];
      if (!p.alive) { D.list.splice(i, 1); continue; }
      if (p.flash > 0) p.flash -= dt;
      if (p.burn > 0) { p.burn -= dt; p.hp -= 4 * dt; if (Math.random() < dt * 14) G.fx.flame(p.x + M.rnd(-0.3, 0.3), p.y + p.h, p.z + M.rnd(-0.3, 0.3), 0.9); if (G.env.isRaining()) p.burn -= dt * 3; if (p.hp <= 0) D.destroy(p, { el: 'fogo' }); }
      if (p.ice && G.env.hour > 11 && G.env.hour < 16 && Math.random() < dt * 0.3) { /* derrete devagar ao sol */ }
    }
  };
  D.draw = function () {
    const e = gfx.eye;
    for (const p of D.list) {
      const dx = p.x - e[0], dz = p.z - e[2]; if (dx * dx + dz * dz > 14400) continue;
      if (!gfx.sphereVisible(p.x, p.y + 1, p.z, 3)) continue;
      const m = meshes[p.kind]; const mat = M.trs(_m, p.x, p.y - 0.02, p.z, 0, p.ry, 0, 1, 1, 1);
      gfx.draw(m, mat, { add: p.flash > 0 ? [0.4, 0.4, 0.4] : (p.burn > 0 ? [0.25, 0.08, 0] : null), tint: p.burn > 0 ? [0.5, 0.4, 0.35] : null });
    }
  };
  const _m = M.mat();
})();
