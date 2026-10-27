'use strict';
/* Elemental World — guia do jogo: uma seta flutuante aponta para o próximo objetivo da missão e o HUD mostra a distância. */
(function () {
  const G = window.G, M = G.M, W = G.world, gfx = G.gfx;
  const Gd = (G.guide = { mesh: null, t: 0, tgt: null, hudT: 0 });
  const I = (x, y, z, sx, sy, sz, rx, ry) => M.trs(new Float32Array(16), x, y, z, rx || 0, ry || 0, 0, sx, sy, sz);
  const H = M.hex;

  /* seta dourada apontando para +z (mesma convenção do planador) */
  function build() {
    const b = new gfx.MB(0.02), gold = H('#ffd24a'), dark = H('#b8801a');
    b.box(I(0, 0, -0.32, 0.12, 0.12, 0.64), dark);
    b.cone(I(0, 0, 0.3, 1, 1, 1, 1.57), 6, 0.2, gold, false);
    return b.build();
  }
  const _m = M.mat();

  /* dica de tutorial: antes de qualquer técnica, o jogo manda procurar o Mestre */
  function masterOf(el) { return G.npcs && G.npcs.list.find((n) => n.def && n.def.role === 'mestre' && n.def.reg === el); }
  Gd.hint = function () {
    const S = G.S, Ms = G.mastery, T = G.train; if (!S || !Ms || !G.main.running || (T && (T.cut || T.ex))) return null;
    const el = S.origin; if (!el || !Ms.canStudy(el)) return null;
    const nm = Ms.NAME[el], n = Ms.next(el); if (!n) return null;
    if (!Ms.any(el)) return { key: 'h0', nome: 'Aprenda sua 1ª técnica', txt: 'Siga a seta dourada até o Mestre de ' + nm + ' e fale com ele (botão de interagir) para aprender a 1ª técnica.', el };
    if (Ms.learnable(el, n.i)) return { key: 'h' + n.i, nome: 'Nova técnica disponível', txt: 'Aprenda “' + G.elements[el].quick[n.i].nome + '” com o Mestre de ' + nm + ' (siga a seta).', el };
    return null;
  };
  const trk = G.quests.tracked;
  G.quests.tracked = function () { const h = Gd.hint(); return h ? { id: null, nome: h.nome, txt: h.txt, hint: h } : trk.apply(this, arguments); };

  /* alvo do objetivo atual, ou null */
  function targetOf() {
    const Q = G.quests, st = G.S; if (!Q || !st || !Q.tracked) return null;
    const tr = Q.tracked(); if (!tr) return null;
    if (tr.hint) { const n = masterOf(tr.hint.el); return n ? { x: n.x, z: n.z } : null; }
    const s = st.quests[tr.id], q = Q.DEFS[tr.id]; if (!s || !q) return null;
    const i = q.obj.findIndex((o, k) => s.p[k] < o.n); const o = q.obj[Math.max(0, i)];
    const P = G.player, f = G.extras.F();
    const nearest = (list, ok) => { let best = null, bd = 1e9; for (const p of list) { if (!ok(p)) continue; const d = Math.hypot(p.x - P.x, p.z - P.z); if (d < bd) { bd = d; best = p; } } return best; };
    if (o.t === 'talk') { const n = G.npcs.list.find((q2) => q2.def.id === o.npc); return n ? { x: n.x, z: n.z } : null; }
    if (o.t === 'shrine') { const s2 = nearest(W.shrines, (p) => !f.shrines[p.id]); return s2 ? { x: s2.x, z: s2.z } : null; }
    if (o.t === 'chestid') { const c = W.chests.find((p) => p.id === o.id); return c && !f.chests[c.id] ? { x: c.x, z: c.z } : null; }
    if (o.t === 'dungeon' || o.t === 'dboss') {
      const G2 = G.dungeon;
      if (G2 && G2.inside && G2.boss && G2.boss.alive) return { x: G2.boss.x, z: G2.boss.z };
      const d = W.objs.find((p) => p.kind === 'dungeon'); return d ? { x: d.x, z: d.z } : null;
    }
    if (o.t === 'master') { const a = (W.arenas || []).find((p) => p.id === o.el); return a ? { x: a.x, z: a.z } : null; }
    return null;
  }

  Gd.update = function (dt) {
    Gd.t += dt; Gd.hudT -= dt;
    try { Gd.tgt = G.main.running ? targetOf() : null; } catch (e) { Gd.tgt = null; }
    const h = Gd.hint(), k = h ? h.key : ''; if (k !== Gd.hk) { Gd.hk = k; G.ui.refreshHud(); if (h) G.ui.banner(h.nome, h.txt); }
    if (Gd.hudT <= 0) { // distância no HUD
      Gd.hudT = 0.25; const el = document.getElementById('quest');
      if (el && Gd.tgt && el.firstChild) { const d = Math.round(Math.hypot(Gd.tgt.x - G.player.x, Gd.tgt.z - G.player.z)); el.dataset.d = d; }
      if (el && el.dataset.d && Gd.tgt) { const d = el.dataset.d; el.innerHTML = el.innerHTML.replace(/ · \d+ m$/, '') + ' · ' + d + ' m'; }
    }
  };
  Gd.draw = function () {
    const t = Gd.tgt; if (!t || !G.main.running) return;
    const P = G.player, dx = t.x - P.x, dz = t.z - P.z, d = Math.hypot(dx, dz);
    if (d < 5 || d > 400) return;
    if (!Gd.mesh) Gd.mesh = build();
    const y = P.y + 2.7 + Math.sin(Gd.t * 3) * 0.18;
    M.trs(_m, P.x, y, P.z, 0, Math.atan2(dx, dz), 0, 1.1, 1.1, 1.1);
    gfx.draw(Gd.mesh, _m, { outline: 0.02 });
  };
})();
