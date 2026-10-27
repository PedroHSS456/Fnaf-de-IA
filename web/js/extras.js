'use strict';
/* Elemental World — objetos interativos (poços, bancos, placas, sinos, braseiros) e pontos de interesse
   (ruínas, templos, gruta, acampamento, torre). Construído junto com o mundo. */
(function () {
  const G = window.G, M = G.M, W = G.world, H = M.hex;
  const X = (G.extras = {});
  W.objs = [];
  const I = (px, py, pz, sx, sy, sz, ry, rx, rz) => M.trs(new Float32Array(16), px, py, pz, rx || 0, ry || 0, rz || 0, sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
  const gy = (x, z) => W.groundY(x, z);
  const col = (x, z, r) => W.dyn.push({ t: 0, x, z, r, alive: true });
  /* matriz em coordenadas locais de um objeto em (x,y,z) girado por yaw */
  const loc = (x, y, z, yaw) => { const c = Math.cos(yaw), s = Math.sin(yaw); return (lx, ly, lz, sx, sy, sz) => I(x + c * lx + s * lz, y + ly, z - s * lx + c * lz, sx, sy, sz, yaw); };

  /* ---------- peças ---------- */
  function well(x, z) {
    const y = gy(x, z), S = W.mbSolid(x, z), L = loc(x, y, z, 0);
    S.cyl(L(0, 0, 0, 1.7, 0.85, 1.7), 10, 0.5, 0.5, H('#8d8a84'), true, false);
    S.cyl(L(0, 0.7, 0, 1.25, 0.06, 1.25), 10, 0.5, 0.5, H('#3a8ad0'), true, false);
    S.box(L(-0.75, 1.0, 0, 0.12, 2.0, 0.12), H('#6a4a2a')); S.box(L(0.75, 1.0, 0, 0.12, 2.0, 0.12), H('#6a4a2a'));
    S.box(L(0, 2.1, 0, 2.1, 0.12, 1.5), H('#8a3a2a'));
    col(x, z, 0.95); W.objs.push({ id: 'well_' + Math.round(x) + '_' + Math.round(z), kind: 'well', x, z, y, rr: 2.6 });
  }
  function bench(x, z, yaw) {
    const y = gy(x, z), S = W.mbSolid(x, z), L = loc(x, y, z, yaw);
    S.box(L(0, 0.45, 0, 1.6, 0.1, 0.5), H('#8a6238')); S.box(L(-0.65, 0.22, 0, 0.1, 0.45, 0.4), H('#5a3e22')); S.box(L(0.65, 0.22, 0, 0.1, 0.45, 0.4), H('#5a3e22'));
    S.box(L(0, 0.8, -0.22, 1.6, 0.35, 0.08), H('#8a6238'));
    W.objs.push({ id: 'bench_' + Math.round(x) + '_' + Math.round(z), kind: 'bench', x, z, y, yaw, rr: 2.2 });
  }
  function sign(x, z, yaw, title, text, id, kind) {
    const y = gy(x, z), S = W.mbSolid(x, z), L = loc(x, y, z, yaw);
    if (kind === 'ins') {
      S.box(L(0, 0.9, 0, 1.1, 1.8, 0.4), H('#7d7a76')); S.box(L(0, 1.0, 0.21, 0.7, 1.1, 0.04), H('#58c8c0'));
      const MG = W.mbGlow(x, z); MG.box(L(0, 1.0, 0.23, 0.5, 0.8, 0.03), H('#58e8d8'));
      col(x, z, 0.7);
    } else { S.box(L(0, 0.7, 0, 0.12, 1.4, 0.12), H('#6a4a2a')); S.box(L(0, 1.3, 0, 1.2, 0.7, 0.1), H('#a07a48')); }
    W.objs.push({ id: id || 'sign_' + Math.round(x) + '_' + Math.round(z), kind: kind || 'sign', x, z, y, title, text, rr: 2.4 });
  }
  function bell(x, z) {
    const y = gy(x, z), S = W.mbSolid(x, z), L = loc(x, y, z, 0);
    S.box(L(-0.6, 1.1, 0, 0.14, 2.2, 0.14), H('#5a3e22')); S.box(L(0.6, 1.1, 0, 0.14, 2.2, 0.14), H('#5a3e22')); S.box(L(0, 2.2, 0, 1.5, 0.14, 0.14), H('#5a3e22'));
    S.cone(L(0, 1.45, 0, 0.7, 0.75, 0.7), 8, 0.5, H('#d8b040'), false);
    col(x - 0.6, z, 0.2); col(x + 0.6, z, 0.2);
    W.objs.push({ id: 'bell_' + Math.round(x) + '_' + Math.round(z), kind: 'bell', x, z, y, rr: 2.6 });
  }
  function brazier(x, z, group, id) {
    const y = gy(x, z), S = W.mbSolid(x, z), L = loc(x, y, z, 0);
    S.cyl(L(0, 0, 0, 0.35, 0.9, 0.35), 6, 0.5, 0.5, H('#4a4650'), true, false);
    S.cyl(L(0, 0.85, 0, 0.95, 0.28, 0.95), 8, 0.5, 0.5, H('#3a3640'), true, true);
    S.cyl(L(0, 1.1, 0, 0.7, 0.05, 0.7), 8, 0.5, 0.5, H('#2a2024'), true, false);
    col(x, z, 0.5);
    W.objs.push({ id, kind: 'brazier', group, x, z, y, lit: false, rr: 2.4 });
  }
  function chest(x, z, yaw, c) {
    const y = gy(x, z), S = W.mbSolid(x, z), L = loc(x, y, z, yaw);
    S.box(L(0, 0.3, 0, 0.9, 0.6, 0.6), H('#7a4e2a')); S.box(L(0, 0.68, 0, 0.94, 0.18, 0.64), H('#8a5a30')); S.box(L(0, 0.45, 0.31, 0.16, 0.2, 0.04), H('#e0c040'));
    W.chests.push(Object.assign({ x, z }, c));
  }
  function pillar(x, z, h, broken) {
    const y = gy(x, z), S = W.mbSolid(x, z);
    S.box(I(x, y + h * 0.5, z, 0.9, h, 0.9, x * 0.3), H('#9a958c')); S.box(I(x, y + 0.2, z, 1.2, 0.4, 1.2, x * 0.3), H('#857f77'));
    if (!broken) S.box(I(x, y + h + 0.15, z, 1.2, 0.3, 1.2, x * 0.3), H('#857f77'));
    col(x, z, 0.65);
  }
  function slab(x, z, size, y) { W.mbSolid(x, z).box(I(x, y - 0.6, z, size, 1.5, size), H('#8c877e')); W.mbSolid(x, z).box(I(x, y + 0.1, z, size - 0.4, 0.12, size - 0.4), H('#a39d92')); }
  function flat(x, z) { let hi = -1e9; for (const [dx, dz] of [[0, 0], [6, 0], [-6, 0], [0, 6], [0, -6]]) hi = Math.max(hi, gy(x + dx, z + dz)); let lo = 1e9; for (const [dx, dz] of [[0, 0], [6, 0], [-6, 0], [0, 6], [0, -6]]) lo = Math.min(lo, gy(x + dx, z + dz)); return [hi, hi - lo]; }

  /* ---------- acender / apagar braseiros ---------- */
  const F = () => { const f = G.S.flags; for (const k of ['chests', 'shrines', 'lit', 'puzzles', 'read', 'found', 'art']) f[k] = f[k] || {}; return f; };
  X.F = F;
  function setFire(o, on) {
    for (let i = W.fires.length - 1; i >= 0; i--) if (W.fires[i].obj === o) W.fires.splice(i, 1);
    o.lit = on; if (on) W.fires.push({ x: o.x, y: o.y + 1.15, z: o.z, s: 1.1, obj: o });
  }
  X.light = function (o) {
    if (o.lit) return; setFire(o, true); F().lit[o.id] = true;
    G.fx.burst(o.x, o.y + 1.2, o.z, 18, [1, 0.6, 0.2], 3, 0.4, 0.6, true, -1); G.audio.sfx('cast_fogo');
    const grp = W.objs.filter((q) => q.kind === 'brazier' && q.group === o.group);
    const n = grp.filter((q) => q.lit).length;
    if (n === grp.length) {
      F().puzzles[o.group] = true; G.ui.banner('Mecanismo ativado', 'Um estrondo ecoa: algo foi desbloqueado.'); G.audio.sfx('quest'); G.cam.kick(0.06);
      G.quests.event('light', o.group);
    } else G.ui.toast('Braseiro aceso (' + n + '/' + grp.length + ')');
  };
  X.douse = function (o) { if (!o.lit || F().puzzles[o.group]) return; setFire(o, false); delete F().lit[o.id]; G.fx.smoke(o.x, o.y + 1.2, o.z, 6, 0.8); };
  X.restore = function () {
    const f = F();
    for (const o of W.objs) if (o.kind === 'brazier') setFire(o, !!f.lit[o.id]);
  };
  /* fogo acende, água apaga */
  const f0 = G.inter.fire, w0 = G.inter.water;
  G.inter.fire = function (x, z, r) { f0.apply(this, arguments); for (const o of W.objs) if (o.kind === 'brazier' && !o.lit && Math.hypot(o.x - x, o.z - z) < r + 0.9) X.light(o); };
  G.inter.water = function (x, z, r) { w0.apply(this, arguments); for (const o of W.objs) if (o.kind === 'brazier' && o.lit && Math.hypot(o.x - x, o.z - z) < r + 0.9) X.douse(o); };

  /* ---------- construção ---------- */
  const RUMOR = {
    hub: ['Aviso aos viajantes', 'Os santuários dos Quatro Cantos perderam o brilho. Quem puder, procure Vovó Marta: ela guarda os registros antigos. Cuidado com bandidos na estrada ao anoitecer.'],
    agua: ['Quadro de avisos de Marfrio', 'Pesca suspensa: lobos-do-gelo rondam o fiorde. Há uma gruta de gelo ao longe e dizem que algo brilha atrás dos blocos. O fogo derrete o gelo; a terra o quebra.'],
    fogo: ['Quadro de avisos de Brasaluz', 'Ferreiro Ashar procura brasas raras. Ruínas antigas ao longe só se abrem para quem domina o fogo (ou carrega brasas consigo).'],
    terra: ['Quadro de avisos de Pedralta', 'A terra guarda memórias. Um templo esquecido repousa nas Mesetas, com três braseiros apagados. Entulho em ruínas pode ser quebrado com dobra de terra.'],
    ar: ['Quadro de avisos de Altavento', 'O vento sussurra em ruínas ao longo dos picos. Monges relatam sons vindos de uma câmara coberta de entulho. Planar ajuda a chegar nos lugares altos.'],
  };
  X.build = function () {
    // objetos de cada cidade
    for (const t of W.towns) {
      const r0 = t.id === 'hub' ? 9 : 8, rg = t.reg;
      const at = (a, r) => [t.x + Math.cos(a) * r, t.z + Math.sin(a) * r];
      let p = at(0.9, r0); well(p[0], p[1]);
      p = at(2.3, r0 - 1); bench(p[0], p[1], 2.3 + 1.57);
      p = at(3.6, r0 - 1); bench(p[0], p[1], 3.6 + 1.57);
      p = at(4.6, r0); sign(p[0], p[1], 4.6 + 1.57, RUMOR[rg][0], RUMOR[rg][1], 'sign_' + t.id);
      p = at(5.6, r0 - 2); bell(p[0], p[1]);
    }
    const rng = M.seeded(W.SEED + 4242), taken = [];
    const spot = (reg, minD) => {
      for (let i = 0; i < 900; i++) {
        const a = rng() * M.TAU, rd = (reg === 'hub' ? 60 : 85) + rng() * (reg === 'hub' ? 90 : 190), x = W.CENTER + Math.cos(a) * rd, z = W.CENTER + Math.sin(a) * rd;
        if (W.regionAt(x, z) !== reg) continue;
        const y = gy(x, z); if (y < 1.6 || y > (reg === 'ar' ? 48 : 32) || W.isLava(x, z) || W.waterDepth(x, z) > 0.05) continue;
        const [hi, d] = flat(x, z); if (d > (reg === 'ar' ? 3.4 : 1.8)) continue;
        if (W.towns.some((q) => Math.hypot(q.x - x, q.z - z) < q.R + 30)) continue;
        if ((W.arenas || []).some((q) => Math.hypot(q.x - x, q.z - z) < 45)) continue;
        if (taken.some((q) => Math.hypot(q[0] - x, q[1] - z) < (minD || 60))) continue;
        taken.push([x, z]); return [x, z, hi];
      }
      return null;
    };
    const poi = (id, reg, nome, kind) => { const s = spot(reg); if (s) W.pois.push({ id, kind: kind || 'ruin', x: s[0], z: s[1], reg, nome }); return s; };

    // Ruínas do Vento Antigo (ar): câmara coberta de entulho
    let s = poi('ruinas_ar', 'ar', 'Ruínas do Vento Antigo');
    if (s) {
      const [x, z, y] = s;
      for (let i = 0; i < 7; i++) { const a = (i / 7) * M.TAU; pillar(x + Math.cos(a) * 7, z + Math.sin(a) * 7, 3 + rng() * 3.5, rng() < 0.5); }
      chest(x, z, 0.4, { id: 'c_ruinas_ar', loot: 'ruin', art: 'art_ar' });
      for (let i = 0; i < 4; i++) { const a = (i / 4) * M.TAU + 0.7; S_dyn('rubble', x + Math.cos(a) * 2.4, z + Math.sin(a) * 2.4); }
      sign(x + 4.5, z - 4.5, 2.4, 'Inscrição do Vento', '“Quando o vento calou, os guardiões esconderam seu tesouro sob a pedra. Quem quebrar o que cobre, alcança o que dorme.” — O silêncio dos Quatro Cantos começou aqui.', 'ins_ar', 'ins');
    }
    // Templo Esquecido (terra): três braseiros e cofre selado
    s = poi('templo_terra', 'terra', 'Templo Esquecido');
    if (s) {
      const [x, z, y] = s;
      slab(x, z, 15, y);
      for (const [dx, dz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) pillar(x + dx, z + dz, 5.5, false);
      brazier(x - 4.5, z + 5.2, 'templo', 'br_templo_1'); brazier(x, z + 6, 'templo', 'br_templo_2'); brazier(x + 4.5, z + 5.2, 'templo', 'br_templo_3');
      chest(x, z - 3, 0, { id: 'c_templo_terra', loot: 'ruin', art: 'art_terra', needs: 'templo' });
      sign(x, z + 2.5, 0, 'Inscrição da Terra', '“O Eco do Equilíbrio nasceu quando os quatro Mestres esqueceram de ouvir uns aos outros. Três chamas acordam o cofre; a pedra lembra tudo.”', 'ins_terra', 'ins');
    }
    // Ruínas das Chamas (fogo)
    s = poi('ruinas_fogo', 'fogo', 'Ruínas das Chamas');
    if (s) {
      const [x, z, y] = s;
      slab(x, z, 13, y);
      for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5]]) pillar(x + dx, z + dz, 4, true);
      brazier(x - 3.5, z + 4.8, 'ruinaFogo', 'br_fogo_1'); brazier(x + 3.5, z + 4.8, 'ruinaFogo', 'br_fogo_2');
      chest(x, z - 2.5, 0, { id: 'c_ruinas_fogo', loot: 'ruin', art: 'art_fogo', needs: 'ruinaFogo' });
      sign(x + 5, z, 1.57, 'Inscrição das Chamas', '“A chama é a primeira a responder e a última a esquecer. Acenda os dois braseiros e o fogo abrirá o que o fogo escondeu.”', 'ins_fogo', 'ins');
    }
    // Gruta de gelo (água)
    s = poi('gruta_agua', 'agua', 'Gruta Gelada');
    if (s) {
      const [x, z, y] = s, S = W.mbSolid(x, z);
      S.box(I(x - 3, y + 2, z + 3, 1.6, 4, 1.6, 0.3), H('#bfe3f7')); S.box(I(x + 3, y + 2, z + 3, 1.6, 4, 1.6, -0.3), H('#bfe3f7')); S.box(I(x, y + 4.2, z + 3, 8, 1.2, 1.6), H('#d3effc'));
      chest(x, z, 0, { id: 'c_gruta_agua', loot: 'ruin', art: 'art_agua' });
      for (let i = 0; i < 3; i++) { const a = (i / 3) * M.TAU + 0.5; S_dyn('iceblock', x + Math.cos(a) * 2.8, z + Math.sin(a) * 2.8); }
      sign(x - 4.5, z - 2, 0.8, 'Inscrição da Maré', '“A água lembra de tudo o que já tocou. O gelo guarda o que o mar não pôde levar. Quebre-o com a força da terra ou derreta-o com a chama.”', 'ins_agua', 'ins');
    }
    // Acampamento do mensageiro (hub)
    s = poi('camp_msg', 'hub', 'Acampamento Abandonado', 'camp');
    if (s) {
      const [x, z, y] = s, S = W.mbSolid(x, z);
      S.cone(I(x + 2, y, z, 3.2, 2.4, 3.2), 6, 0.5, H('#b89a60'), false);
      S.cyl(I(x - 1.5, y, z + 1, 1.1, 0.12, 1.1), 8, 0.5, 0.5, H('#2a2420'), true, false);
      S.box(I(x - 1.0, y + 0.15, z + 2.2, 0.5, 0.3, 0.35, 0.4), H('#7a5a30'));
      W.objs.push({ id: 'satchel', kind: 'satchel', x: x - 1.0, z: z + 2.2, y, rr: 2.6 });
      sign(x + 4, z + 3, 3.5, 'Pegadas e restos', 'Cinzas frias, uma tenda rasgada e pegadas que seguem para o oeste... O dono da bolsa saiu com pressa. Dentro, uma carta lacrada para Dom Teodoro, de Pedralta.', 'sign_camp');
    }
    // Torre do Vigia (hub): marco distante
    s = poi('torre', 'hub', 'Torre do Vigia', 'tower');
    if (s) {
      const [x, z, y] = s, S = W.mbSolid(x, z);
      S.box(I(x, y + 6, z, 4.2, 12, 4.2), H('#8c8780')); S.box(I(x, y + 12.3, z, 5.4, 0.8, 5.4), H('#6e6a64'));
      for (const [dx, dz] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) S.box(I(x + dx, y + 13.2, z + dz, 0.9, 1.0, 0.9), H('#6e6a64'));
      W.mbGlow(x, z).box(I(x, y + 13.6, z, 1.2, 1.6, 1.2), H('#ffb050'));
      col(x, z, 2.3);
      chest(x + 3.5, z + 3.5, 0.8, { id: 'c_torre', loot: 'ruin' });
      sign(x - 3.5, z + 3.5, 2.4, 'Torre do Vigia', 'Erguida por quem vigiava os Quatro Cantos. No alto ainda arde uma luz que ninguém acende. No pé da torre, um baú esquecido.', 'sign_torre');
    }
  };
  function S_dyn(kind, x, z) { if (W.groundY(x, z) > 0.8) W.dynDefs.push({ kind, x, z }); }

  /* roda junto com a construção do mundo (antes de fechar as malhas) */
  const sb = G.structs.build;
  G.structs.build = async function (progress, tick) { await sb.call(this, progress, tick); X.build(); };
})();
