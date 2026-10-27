'use strict';
/* Elemental World — cidades, arenas, cavernas, acampamentos, árvores e pedras (geração determinística) */
(function () {
  const G = window.G; const M = G.M; const gfx = G.gfx; const W = G.world;
  const S = (G.structs = {});
  let rng;
  const Q = Math.PI / 2;
  const gy = (x, z) => W.groundY(x, z);
  const hmin = (x, z, r) => Math.min(gy(x, z), gy(x + r, z), gy(x - r, z), gy(x, z + r), gy(x, z - r), gy(x + r, z + r), gy(x - r, z - r));
  const frame = (x, y, z, yaw) => { const c = Math.cos(yaw), s = Math.sin(yaw); return (lx, ly, lz, sx, sy, sz, ry, rx, rz) => M.trs(new Float32Array(16), x + c * lx + s * lz, y + ly, z - s * lx + c * lz, rx || 0, yaw + (ry || 0), rz || 0, sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz); };
  const J = (c, a) => { a = a == null ? 0.06 : a; const k = 1 + (rng() - 0.5) * 2 * a; return [c[0] * k, c[1] * k, c[2] * k]; };
  const H = M.hex;
  const dist = Math.hypot;

  W.camps = []; W.pois = []; W.shrines = []; W.npcDefs = []; W.dynDefs = []; W.fires = []; W.chests = []; W.doors = {};

  /* ---------- peças reutilizáveis ---------- */
  function torch(x, z, h) {
    const y = gy(x, z), L = frame(x, y, z, 0), MS = W.mbSolid(x, z), MG = W.mbGlow(x, z);
    MS.cyl(L(0, 0, 0), 5, 0.09, 0.07, H('#5b3b24'), false, false); // altura 1 → escala y
    MS.cyl(L(0, 0, 0, 1, h || 1.9, 1), 5, 0.09, 0.07, H('#5b3b24'), true, false);
    MG.sphere(L(0, (h || 1.9) + 0.18, 0, 0.17, 0.26, 0.17), 5, 3, [1, 0.62, 0.15]);
    W.fires.push({ x, y: y + (h || 1.9) + 0.25, z, s: 0.55 });
  }
  function brazier(x, z, s, col) {
    s = s || 1; const y = gy(x, z), L = frame(x, y, z, 0), MS = W.mbSolid(x, z), MG = W.mbGlow(x, z);
    MS.cyl(L(0, 0, 0, 1, 0.9 * s, 1), 6, 0.35 * s, 0.22 * s, H('#3a3234'), false, true);
    MS.cyl(L(0, 0.9 * s, 0, 1, 0.3 * s, 1), 6, 0.3 * s, 0.5 * s, H('#4a4042'), false, false);
    MG.cone(L(0, 1.2 * s, 0, 1, 0.85 * s, 1), 5, 0.38 * s, col || [1, 0.5, 0.1], false);
    W.fires.push({ x, y: y + 1.35 * s, z, s: 0.8 * s });
    W.addCircle(x, z, 0.5 * s, 'prop');
  }
  function crateMesh(MS, L, c) { MS.box(L(0, 0.45, 0, 0.9, 0.9, 0.9), c); }

  /* ---------- casas por cultura ---------- */
  function boxCollider(x, z, w, d, yaw) {
    const odd = Math.abs(Math.round(yaw / Q)) % 2 === 1; const hw = (odd ? d : w) / 2, hd = (odd ? w : d) / 2;
    W.addBox(x - hw, z - hd, x + hw, z + hd, 'house');
  }
  function doorPos(x, z, yaw, off) { return [x + Math.sin(yaw) * off, z + Math.cos(yaw) * off]; }

  const STYLE = {
    hub(x, z, yaw, w, d, h) {
      const y = hmin(x, z, 2.5) - 0.2, L = frame(x, y, z, yaw), MS = W.mbSolid(x, z), MG = W.mbGlow(x, z);
      MS.box(L(0, 0.4, 0, w + 0.3, 0.8, d + 0.3), J(H('#7d7770')));
      MS.box(L(0, h / 2 + 0.4, 0, w, h, d), J(H('#e4d3a8')));
      MS.box(L(-w / 2 + 0.05, h / 2 + 0.4, d / 2 + 0.02, 0.18, h, 0.12), H('#7a5236'));
      MS.box(L(w / 2 - 0.05, h / 2 + 0.4, d / 2 + 0.02, 0.18, h, 0.12), H('#7a5236'));
      MS.prism(L(0, h + 0.4, 0, w + 1.5, 2.3, d + 1.3), J(H('#a2472f')));
      MS.box(L(w * 0.25, h + 1.9, -d * 0.2, 0.7, 1.7, 0.7), H('#8a8079'));
      MS.box(L(0, 1.2, d / 2 + 0.03, 1.1, 1.8, 0.1), H('#5a3a22'));
      MG.box(L(w / 2 + 0.03, h * 0.65 + 0.4, 0, 0.08, 0.9, 1.0), [1, 0.82, 0.4]);
      MG.box(L(-w / 2 - 0.03, h * 0.65 + 0.4, 0, 0.08, 0.9, 1.0), [1, 0.82, 0.4]);
      MG.box(L(w * 0.32, h * 0.65 + 0.4, d / 2 + 0.03, 0.8, 0.8, 0.08), [1, 0.82, 0.4]);
      trim(L, MS, MG, w, d, 0.4, w * 0.32, h * 0.65 + 0.4, 1.2);
      boxCollider(x, z, w + 0.3, d + 0.3, yaw);
    },
    fogo(x, z, yaw, w, d, h) {
      const y = hmin(x, z, 2.5) - 0.2, L = frame(x, y, z, yaw), MS = W.mbSolid(x, z), MG = W.mbGlow(x, z);
      MS.box(L(0, 0.5, 0, w + 0.6, 1, d + 0.6), J(H('#3d3436')));
      MS.box(L(0, h / 2 + 1, 0, w, h, d), J(H('#5e4a48')));
      MS.box(L(0, h + 1.5, 0, w * 0.72, 1.8, d * 0.72), J(H('#6a5452')));
      MS.prism(L(0, h + 0.9, 0, w + 2.2, 1.3, d + 2.0), J(H('#8e1e17')));
      MS.prism(L(0, h + 2.4, 0, w * 0.72 + 1.8, 1.5, d * 0.72 + 1.6), J(H('#a22a1d')));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) MS.box(L(sx * (w / 2 + 0.2), 1.2 + h / 2, sz * (d / 2 + 0.2), 0.3, h, 0.3), H('#2a2224'));
      MS.box(L(0, 1.7, d / 2 + 0.03, 1.3, 1.9, 0.1), H('#25191a'));
      MG.box(L(w * 0.28, h * 0.7 + 1, d / 2 + 0.03, 0.8, 0.7, 0.08), [1, 0.55, 0.18]);
      MG.box(L(w / 2 + 0.03, h * 0.7 + 1, 0, 0.08, 0.7, 0.9), [1, 0.55, 0.18]);
      trim(L, MS, MG, w, d, 1, w * 0.28, h * 0.7 + 1, 1.7);
      boxCollider(x, z, w + 0.6, d + 0.6, yaw);
    },
    agua(x, z, yaw, w, d, h) {
      const y = hmin(x, z, 2.5) - 0.3, L = frame(x, y, z, yaw), MS = W.mbSolid(x, z), MG = W.mbGlow(x, z);
      MS.sphere(L(0, 0, 0, w * 0.62, h * 0.95, d * 0.62), 9, 5, J(H('#eaf4fc'), 0.04));
      MS.box(L(0, 0.9, d * 0.62 + 0.6, 1.9, 1.8, 2.4), J(H('#d8e9f6')));
      MS.box(L(0, 0.7, d * 0.62 + 1.78, 1.2, 1.4, 0.12), H('#15283a'));
      MG.box(L(0, 2.2, d * 0.62 + 1.2, 0.4, 0.3, 0.3), [0.7, 0.9, 1]);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * M.TAU; MS.cone(L(Math.cos(a) * w * 0.55, h * 0.4, Math.sin(a) * d * 0.55, 1, 1.4, 1), 4, 0.22, H('#a7d2ee'), false); }
      W.addCircle(x, z, Math.max(w, d) * 0.62, 'house');
      W.addBox(x + Math.sin(yaw) * (d * 0.62 + 0.6) - 0.95, z + Math.cos(yaw) * (d * 0.62 + 0.6) - 0.95, x + Math.sin(yaw) * (d * 0.62 + 0.6) + 0.95, z + Math.cos(yaw) * (d * 0.62 + 0.6) + 0.95, 'house');
    },
    terra(x, z, yaw, w, d, h) {
      const y = hmin(x, z, 2.5) - 0.2, L = frame(x, y, z, yaw), MS = W.mbSolid(x, z), MG = W.mbGlow(x, z);
      const r = Math.max(w, d) * 0.55;
      MS.cyl(L(0, 0, 0, 1, h, 1), 8, r, r * 0.92, J(H('#a98b5e')), true, false);
      MS.cyl(L(0, h, 0, 1, 0.4, 1), 8, r + 0.4, r + 0.4, J(H('#6a5a3e')), true, false);
      MS.cyl(L(0, h + 0.4, 0, 1, 2.2, 1), 8, r + 0.9, 0.2, J(H('#4f7a3a')), false, false);
      MS.box(L(0, 1.1, r * 0.92, 1.3, 2.1, 0.12), H('#3a2a1a'));
      MG.box(L(r * 0.6, h * 0.65, r * 0.7, 0.7, 0.7, 0.08), [1, 0.85, 0.5]);
      W.addCircle(x, z, r + 0.3, 'house');
    },
    ar(x, z, yaw, w, d, h) {
      const y = hmin(x, z, 2.5) - 0.2, L = frame(x, y, z, yaw), MS = W.mbSolid(x, z), MG = W.mbGlow(x, z);
      const r = Math.max(w, d) * 0.48;
      MS.cyl(L(0, 0, 0, 1, h, 1), 10, r, r, J(H('#f3efe2'), 0.03), true, false);
      MS.cyl(L(0, h * 0.55, 0, 1, 0.35, 1), 10, r + 0.12, r + 0.12, H('#e2a339'), false, false);
      MS.cyl(L(0, h, 0, 1, 2.8, 1), 10, r + 1.0, 0.1, J(H('#f1b84a')), false, false);
      MS.box(L(0, 1.0, r, 1.2, 2.0, 0.12), H('#7a5a38'));
      MG.sphere(L(0, h + 3.0, 0, 0.25, 0.25, 0.25), 5, 3, [1, 0.95, 0.7]);
      MG.box(L(r * 0.55, h * 0.75, r * 0.82, 0.5, 0.8, 0.08), [1, 0.9, 0.6]);
      W.addCircle(x, z, r + 0.2, 'house');
    },
  };

  /* ---------- praça central ---------- */
  function plazaFeature(t) {
    const x = t.x, z = t.z, y = gy(x, z), L = frame(x, y, z, 0), MS = W.mbSolid(x, z), MG = W.mbGlow(x, z);
    const reg = t.reg;
    if (reg === 'hub') {
      MS.cyl(L(0, 0, 0, 1, 0.9, 1), 10, 1.8, 1.8, H('#8f8982'), true, false);
      MG.disc(L(0, 0.82, 0, 1.45, 1, 1.45), 10, [0.35, 0.6, 0.85]);
      for (const s of [-1, 1]) MS.box(L(s * 1.6, 1.7, 0, 0.18, 2.4, 0.18), H('#6a4a30'));
      MS.prism(L(0, 3.1, 0, 4.2, 1.1, 2.2), H('#9a4630'), 0);
      W.addCircle(x, z, 2.1, 'prop');
    } else if (reg === 'agua') {
      MS.cyl(L(0, 0, 0, 1, 0.5, 1), 8, 2.6, 2.4, H('#cfe6f5'), true, false);
      for (let i = 0; i < 7; i++) { const a = (i / 7) * M.TAU; const hh = 2.4 + (i % 3) * 1.1; MS.cone(L(Math.cos(a) * 1.1, 0.4, Math.sin(a) * 1.1, 1, hh, 1), 4, 0.5, J(H('#9fd0ee'), 0.05), false); }
      MG.sphere(L(0, 1.6, 0, 0.4, 0.4, 0.4), 6, 4, [0.6, 0.85, 1]);
      W.addCircle(x, z, 2.7, 'prop');
    } else if (reg === 'fogo') {
      MS.cyl(L(0, 0, 0, 1, 0.6, 1), 8, 2.4, 2.2, H('#2e2628'), true, false);
      MS.cyl(L(0, 0.6, 0, 1, 1.6, 1), 8, 0.9, 0.7, H('#3d3234'), true, false);
      MS.cyl(L(0, 2.2, 0, 1, 0.5, 1), 8, 0.7, 1.4, H('#4a3a3c'), false, false);
      MG.cone(L(0, 2.7, 0, 1, 2.6, 1), 6, 1.05, [1, 0.45, 0.08], false);
      W.fires.push({ x, y: y + 3.2, z, s: 1.6 });
      W.addCircle(x, z, 2.5, 'prop');
    } else if (reg === 'terra') {
      MS.box(L(0, 0.35, 0, 4.2, 0.7, 4.2), H('#7a6a4c'));
      MS.box(L(0, 2.0, 0, 1.6, 3.3, 1.6), J(H('#a98b5e')));
      MS.box(L(0, 4.0, 0, 2.2, 0.6, 2.2), H('#6a5a3e'));
      MG.sphere(L(0, 4.7, 0, 0.45, 0.45, 0.45), 6, 4, [0.55, 1, 0.45]);
      W.addCircle(x, z, 2.6, 'prop');
    } else {
      MS.cyl(L(0, 0, 0, 1, 0.45, 1), 12, 3.0, 2.8, H('#e8e0c8'), true, false);
      MS.cyl(L(0, 0.45, 0, 1, 2.6, 1), 8, 0.6, 0.45, H('#f4f0e4'), true, false);
      MS.sphere(L(0, 3.4, 0, 0.8, 0.8, 0.8), 8, 5, H('#f6e6a8'));
      MG.sphere(L(0, 3.4, 0, 0.5, 0.5, 0.5), 6, 4, [1, 0.95, 0.7]);
      for (let i = 0; i < 3; i++) { const a = (i / 3) * M.TAU; MS.cyl(L(Math.cos(a) * 2.2, 0.45, Math.sin(a) * 2.2, 1, 3.2, 1), 6, 0.2, 0.15, H('#e0d6b8'), true, false); }
      W.addCircle(x, z, 3.0, 'prop');
    }
  }

  function wallRing(cx, cz, R, gaps, col, h, towerCol) {
    const seg = Math.round((M.TAU * R) / 5.5);
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * M.TAU, a2 = ((i + 1) / seg) * M.TAU, am = (a + a2) / 2;
      if (gaps.some((g) => Math.abs(M.angDiff(am, g)) < 0.2)) continue;
      const x = cx + Math.cos(am) * R, z = cz + Math.sin(am) * R, y = gy(x, z) - 0.4;
      const len = R * (a2 - a) + 0.35;
      const L = frame(x, y, z, -am + Q);
      const MS = W.mbSolid(x, z);
      MS.box(L(0, h / 2 + 0.2, 0, len, h, 1.1), J(col, 0.05));
      MS.box(L(0, h + 0.35, 0, len, 0.4, 1.4), J(M.shade(col, 0.82), 0.04));
      W.addCircle(x - Math.sin(-am + Q) * 0, z, 0.95, 'wall');
      W.addCircle(x + Math.cos(am + Q) * len * 0.3, z + Math.sin(am + Q) * len * 0.3, 0.95, 'wall');
      W.addCircle(x - Math.cos(am + Q) * len * 0.3, z - Math.sin(am + Q) * len * 0.3, 0.95, 'wall');
    }
    for (const g of gaps) for (const s of [-1, 1]) {
      const a = g + s * 0.24, x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R, y = gy(x, z) - 0.4, MS = W.mbSolid(x, z), L = frame(x, y, z, 0);
      MS.cyl(L(0, 0, 0, 1, h + 3.2, 1), 8, 1.7, 1.5, J(towerCol), true, false);
      MS.cone(L(0, h + 3.2, 0, 1, 2.4, 1), 8, 2.2, J(M.shade(towerCol, 0.7)), false);
      W.addCircle(x, z, 1.8, 'wall');
    }
  }

  /* ---------- cidades ---------- */
  const NAMES = {
    hub: ['Vovó Marta', 'Tio Baltasar', 'Jaci', 'Ordália', 'Mestre Quirino'],
    agua: ['Kaluk', 'Tilda', 'Anuk', 'Sedna', 'Mestre Tulak'],
    fogo: ['Capitão Orlan', 'Dona Kessia', 'Rhoan', 'Ferreiro Ashar', 'Mestra Vesper'],
    terra: ['Dom Teodoro', 'Marga', 'Ludo', 'Cairo', 'Mestra Pétrea'],
    ar: ['Irmão Lumo', 'Irmã Cirra', 'Yuna', 'Ventino', 'Monge Zéphyr'],
  };
  const ROLES = ['ancião', 'mercador', 'guarda', 'ferreiro', 'mestre'];
  function buildTown(t) {
    const reg = t.reg, style = STYLE[reg];
    const n = reg === 'hub' ? 8 : 9;
    // ângulos de caminhos (a partir do centro da cidade)
    const pathAng = [];
    if (t.id === 'hub') for (const o of W.towns.slice(1)) pathAng.push(Math.atan2(o.z - t.z, o.x - t.x));
    else { const hb = W.towns[0]; pathAng.push(Math.atan2(hb.z - t.z, hb.x - t.x)); const a = W.arenas.find((q) => q.id === t.id); pathAng.push(Math.atan2(a.z - t.z, a.x - t.x)); }
    plazaFeature(t);
    const homes = [];
    let placed = 0;
    for (let k = 0; k < n * 2 && placed < n; k++) {
      const a = (k / (n * 2)) * M.TAU + (rng() - 0.5) * 0.25, r = 15 + rng() * 6.5;
      if (pathAng.some((p) => Math.abs(M.angDiff(a, p)) < 0.42)) continue;
      if (k % 2 === 1 && rng() < 0.2) continue;
      const x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r;
      if (W.slopeAt(x, z) > 0.45 || gy(x, z) < 1.2) continue;
      let yaw = Math.atan2(-Math.cos(a), -Math.sin(a)); yaw = Math.round(yaw / Q) * Q;
      const w = 5 + rng() * 2.2, d = 4.6 + rng() * 1.8, h = 2.8 + rng() * 0.8;
      style(x, z, yaw, w, d, h);
      const off = (reg === 'agua' ? d * 0.62 + 2.4 : reg === 'terra' || reg === 'ar' ? Math.max(w, d) * 0.55 + 1.2 : d / 2 + 1.8);
      homes.push({ door: doorPos(x, z, yaw, off), x, z });
      placed++;
    }
    // tochas
    for (let i = 0; i < 8; i++) { const a = (i / 8) * M.TAU + 0.2, x = t.x + Math.cos(a) * 9.5, z = t.z + Math.sin(a) * 9.5; torch(x, z); }
    // barracas e caixas
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * M.TAU + 1.0, x = t.x + Math.cos(a) * 7, z = t.z + Math.sin(a) * 7, y = gy(x, z), L = frame(x, y, z, -a + Q), MS = W.mbSolid(x, z);
      const cols = ['#c94f3a', '#3f8fcf', '#d2a63a', '#5aa05a'];
      for (const sx of [-1, 1]) for (const sz of [-0.55, 1.5]) MS.cyl(L(sx * 1.3, 0, sz, 1, 2.0, 1), 4, 0.07, 0.07, H('#6a4a30'), false, false);
      MS.prism(L(0, 2.0, 0.5, 3.0, 0.7, 2.4), H(cols[(i + t.id.length) % 4]), 0);
      MS.box(L(0, 0.55, 0.2, 2.2, 0.55, 0.8), H('#8a6a46'));
      W.addBox(x - 1.4, z - 1.2, x + 1.4, z + 1.2, 'prop');
      S.dyn('crate', x + Math.cos(a) * 2.8, z + Math.sin(a) * 2.8);
    }
    for (let i = 0; i < 5; i++) { const a = rng() * M.TAU, r = 11 + rng() * 14; S.dyn(rng() < 0.5 ? 'crate' : 'barrel', t.x + Math.cos(a) * r, t.z + Math.sin(a) * r); }
    if (reg === 'fogo' || reg === 'terra') {
      const gaps = pathAng.map((a) => a);
      wallRing(t.x, t.z, 27, gaps, reg === 'fogo' ? H('#4a3a3a') : H('#9a8560'), 3.2, reg === 'fogo' ? H('#6a2a22') : H('#8f7a52'));
    }
    // NPCs
    const names = NAMES[reg];
    const nn = 5;
    for (let i = 0; i < nn; i++) {
      const home = homes[i % homes.length] || { door: [t.x + 6, t.z], x: t.x + 6, z: t.z };
      const a = (i / nn) * M.TAU + 0.5;
      W.npcDefs.push({
        id: t.id + '_' + i, town: t.id, nome: names[i], role: reg === 'hub' && i === 4 ? 'mercador' : ROLES[i % ROLES.length], reg,
        home: home.door, plaza: [t.x + Math.cos(a) * 5.5, t.z + Math.sin(a) * 5.5], work: [t.x + Math.cos(a + 1.1) * 9, t.z + Math.sin(a + 1.1) * 9],
        seed: Math.floor(rng() * 1e6),
      });
    }
    // baú na cidade
    { const a = rng() * M.TAU; const x = t.x + Math.cos(a) * 20, z = t.z + Math.sin(a) * 20; W.chests.push({ id: 'cb_' + t.id, x, z, loot: 'town' }); }
    t.homes = homes;
  }

  /* ---------- arenas dos mestres ---------- */
  function buildArena(a) {
    const x = a.x, z = a.z, y = gy(x, z), L = frame(x, y, z, 0), MS = W.mbSolid(x, z), MG = W.mbGlow(x, z);
    const reg = a.id;
    const ring = { fogo: H('#a83222'), agua: H('#4a9ccf'), terra: H('#9a7a4a'), ar: H('#e6c458') }[reg];
    MS.cyl(L(0, 0, 0, 1, 0.45, 1), 24, a.R, a.R - 0.3, J(H('#6e6a66'), 0.03), true, false);
    MS.cyl(L(0, 0.44, 0, 1, 0.05, 1), 24, a.R * 0.72, a.R * 0.72, ring, true, false);
    MS.cyl(L(0, 0.48, 0, 1, 0.05, 1), 20, a.R * 0.45, a.R * 0.45, J(M.shade(ring, 1.2), 0.03), true, false);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * M.TAU, px = x + Math.cos(ang) * (a.R - 1.3), pz = z + Math.sin(ang) * (a.R - 1.3), l2 = frame(px, y, pz, 0);
      if (reg === 'fogo') { MS.box(l2(0, 2.0, 0, 1.1, 4, 1.1), J(H('#3a2e2e'))); MG.cone(l2(0, 4.0, 0, 1, 1.0, 1), 5, 0.45, [1, 0.45, 0.1], false); W.fires.push({ x: px, y: y + 4.4, z: pz, s: 0.9 }); }
      else if (reg === 'agua') MS.cone(l2(0, 0, 0, 1, 4.5 + (i % 3), 1), 5, 0.9, J(H('#9fd0ee'), 0.05), false);
      else if (reg === 'terra') MS.box(l2(0, 2.2 + (i % 2), 0, 1.4, 4.4 + (i % 2) * 2, 1.4, ang), J(H('#8b6a42')));
      else { MS.cyl(l2(0, 0, 0, 1, 5, 1), 6, 0.55, 0.4, H('#f3efe2'), true, false); MG.sphere(l2(0, 5.3, 0, 0.3, 0.3, 0.3), 5, 3, [1, 0.95, 0.65]); }
      W.addCircle(px, pz, 0.9, 'prop');
    }
    S.dyn('crate', x + a.R + 3, z); // dica visual
  }

  /* ---------- cavernas, santuários, acampamentos ---------- */
  function cave(x, z, reg, id) {
    const y = gy(x, z) - 0.5, MS = W.mbSolid(x, z), MG = W.mbGlow(x, z);
    const yaw = Math.round(Math.atan2(W.CENTER - z, W.CENTER - x) / Q) * Q; // boca virada para o centro
    const L = frame(x, y, z, yaw);
    const rock = { hub: H('#80765f'), agua: H('#a6b6c8'), fogo: H('#2f2828'), terra: H('#a8724a'), ar: H('#8e8e9a') }[reg];
    // colunas: visual e colisor na mesma posição do mundo (mesma transformação do frame: x+c*lx+s*lz, z-s*lx+c*lz)
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    for (const s of [-1, 1]) {
      MS.cyl(L(s * 2.7, 0, 0, 1, 5.5, 1), 6, 1.9, 1.3, J(rock, 0.05), true, false);
      W.addCircle(x + cy * s * 2.7, z - sy * s * 2.7, 1.9, 'rock');
    }
    MS.box(L(0, 5.2, 0, 7.2, 1.7, 3.2), J(rock, 0.05));
    MS.box(L(0, 2.3, -2.3, 6.2, 4.6, 1.6), [0.03, 0.03, 0.05]);
    MS.box(L(0, 2.3, -3.2, 8.5, 6, 2.0), J(rock, 0.05));
    MG.box(L(0, 0.25, -1.6, 2.0, 0.2, 0.2), [0.9, 0.7, 0.3]);
    const cx = x - Math.sin(yaw) * 1.6 * -1, cz = z + Math.cos(yaw) * -1.6; // baú dentro
    const chx = x + Math.sin(yaw) * -1.8, chz = z + Math.cos(yaw) * -1.8;
    W.chests.push({ id: 'c_' + id, x: chx, z: chz, loot: 'cave', reg });
    W.pois.push({ id: 'cave_' + id, kind: 'cave', x, z, reg, nome: 'Caverna' });
    W.fires.push({ x: x + Math.sin(yaw) * 3.5, y: y + 1.8, z: z + Math.cos(yaw) * 3.5, s: 0.5 });
    torch(x + Math.sin(yaw) * 3.5 + Math.cos(yaw) * 0, z + Math.cos(yaw) * 3.5 + 0, 1.8);
  }
  function shrine(x, z, reg, nome) {
    const y = gy(x, z), L = frame(x, y, z, 0), MS = W.mbSolid(x, z), MG = W.mbGlow(x, z);
    const col = M.hex(W.REGIONS[reg].cor);
    MS.cyl(L(0, 0, 0, 1, 0.4, 1), 10, 3.2, 3.0, H('#8f8f96'), true, false);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * M.TAU + 0.78; MS.box(L(Math.cos(a) * 2.4, 1.6, Math.sin(a) * 2.4, 0.7, 3.2, 0.7, a), J(H('#a4a4ac'))); W.addCircle(x + Math.cos(a) * 2.4, z + Math.sin(a) * 2.4, 0.6, 'prop'); }
    MG.sphere(L(0, 1.8, 0, 0.55, 0.55, 0.55), 6, 4, col);
    MG.cyl(L(0, 0.4, 0, 1, 0.05, 1), 10, 1.7, 1.7, col, true, false);
    W.shrines.push({ id: 'sh_' + reg, x, z, reg, nome });
    W.fires.push({ x, y: y + 1.9, z, s: 0.7, col });
  }
  const CAMP_TYPES = {
    hub: ['bandido', 'bandido', 'lobo'], agua: ['lobogelo', 'lobogelo', 'cacadorgelo'], fogo: ['soldado', 'soldado', 'arqueiro', 'salamandra'],
    terra: ['bandidopedra', 'atirador', 'golem'], ar: ['espirito', 'corvo', 'saqueador'],
  };
  function camp(x, z, reg, id) {
    const y = gy(x, z), L = frame(x, y, z, 0), MS = W.mbSolid(x, z), MG = W.mbGlow(x, z);
    MG.cone(L(0, 0.25, 0, 1, 0.9, 1), 5, 0.4, [1, 0.5, 0.12], false);
    MS.cyl(L(0, 0, 0, 1, 0.25, 1), 7, 0.7, 0.6, H('#4a4244'), true, false);
    W.fires.push({ x, y: y + 0.8, z, s: 0.7 });
    const tc = { hub: '#8a6a3a', agua: '#7ab0d8', fogo: '#8e2a20', terra: '#a9845a', ar: '#d8c080' }[reg];
    for (let i = 0; i < 2; i++) {
      const a = i * 2.4 + rng(), r = 5.2, tx = x + Math.cos(a) * r, tz = z + Math.sin(a) * r, l2 = frame(tx, gy(tx, tz), tz, -a);
      MS.pyramid(l2(0, 0, 0, 3.2, 2.6, 3.2), J(H(tc)));
      W.addCircle(tx, tz, 1.8, 'prop'); // base 3.2 (meia-diagonal ≈ 2.26, colisor cobre a borda real)
    }
    S.dyn(rng() < 0.5 ? 'crate' : 'barrel', x + 3, z - 2.5); S.dyn('hay', x - 3.2, z + 2.2);
    const n = 2 + (rng() < 0.5 ? 1 : 0);
    W.camps.push({ id: 'camp_' + id, x, z, reg, n, types: CAMP_TYPES[reg] });
  }

  S.dyn = (kind, x, z) => { if (W.groundY(x, z) > 0.8) W.dynDefs.push({ kind, x, z }); };

  /* ---------- árvores, pedras, mato ---------- */
  let DL = 1;
  function trim(L, MS, MG, w, d, y0, fx, fy, doorY) {
    if (DL < 2) return;
    const wood = H('#4e3420'), zf = d / 2 + 0.04;
    MS.box(L(fx, fy + 0.5, zf, 1.1, 0.1, 0.12), wood); MS.box(L(fx, fy - 0.5, zf, 1.1, 0.1, 0.12), wood);
    for (const s of [-1, 1]) { MS.box(L(fx + s * 0.52, fy, zf, 0.1, 1.0, 0.12), wood); MS.box(L(fx + s * 0.78, fy, zf - 0.02, 0.32, 0.95, 0.07), H('#3f6a8a')); }
    MS.box(L(0, doorY + 1.05, zf, 1.5, 0.2, 0.2), wood); for (const s of [-1, 1]) MS.box(L(s * 0.68, doorY, zf, 0.15, 2.1, 0.15), wood);
    for (const s of [-1, 1]) { MS.box(L(s * (w / 2 + 0.04), fy + 0.5, 0, 0.12, 0.1, 1.3), wood); MS.box(L(s * (w / 2 + 0.04), fy - 0.5, 0, 0.12, 0.1, 1.3), wood); for (const t of [-1, 1]) MS.box(L(s * (w / 2 + 0.04), fy, t * 0.6, 0.12, 1.0, 0.1), wood); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) MS.box(L(sx * (w / 2 + 0.03), y0 + 1.4, sz * (d / 2 + 0.03), 0.22, 2.8, 0.22), wood);
    if (DL >= 3) {
      MS.box(L(fx, fy - 0.75, zf + 0.12, 1.1, 0.2, 0.3), H('#6a4a2a'));
      for (let i = 0; i < 4; i++) MS.sphere(L(fx - 0.4 + i * 0.27, fy - 0.58, zf + 0.12, 0.2, 0.16, 0.2), 4, 3, H(['#e04a5a', '#f0d84a', '#f08ab0', '#ffffff'][i]));
      MG.box(L(-0.95, doorY + 0.8, zf + 0.15, 0.16, 0.24, 0.16), [1, 0.8, 0.4]); MS.box(L(-0.95, doorY + 0.98, zf + 0.15, 0.04, 0.2, 0.04), wood);
    }
  }
  /* ---- estilo Desenho: recortes de papel em camadas (planos duplos em cruz) ---- */
  function pl(MS, x, y, z, yaw, off, pts, col) {
    const c = Math.cos(yaw), sn = Math.sin(yaw), ox = Math.sin(yaw) * off, oz = Math.cos(yaw) * off;
    const P = pts.map((q) => [x + c * q[0] + ox, y + q[1], z - sn * q[0] + oz]);
    for (let i = 1; i < P.length - 1; i++) {
      MS.w(P[0][0], P[0][1], P[0][2], P[i][0], P[i][1], P[i][2], P[i + 1][0], P[i + 1][1], P[i + 1][2], col);
      MS.w(P[0][0], P[0][1], P[0][2], P[i + 1][0], P[i + 1][1], P[i + 1][2], P[i][0], P[i][1], P[i][2], col);
    }
  }
  function blob(cy, ru, rv, n, ph) { const o = []; for (let k = 0; k < n; k++) { const a = k / n * M.TAU, m = 1 + 0.1 * Math.sin(k * 2.6 + ph); o.push([Math.cos(a) * ru * m, cy + Math.sin(a) * rv * m]); } return o; }
  function shadowDisc(MS, x, y, z, r) { const L = frame(x, y, z, 0); MS.cyl(L(r * 0.28, 0.1, r * 0.2, 1, 0.03, 1), 9, r, r, H('#2a2620'), true, false); }
  function paperTree(kind, x, z, s) {
    const r2 = M.seeded((Math.floor(x * 131) ^ Math.floor(z * 977)) | 1);
    const y = gy(x, z) - 0.1, MS = W.mbSolid(x, z), a0 = rng() * M.TAU;
    let h = 3, r = 0.5; const tcol = (c) => J(H(c), 0.05);
    shadowDisc(MS, x, y, z, 1.3 * s);
    const trunk = (hh, w, c) => { for (const k of [0, 1]) pl(MS, x, y, z, a0 + k * 1.5708, 0, [[-w, 0], [w, 0], [w * 0.7, hh], [-w * 0.7, hh]], c); };
    const layer = (pts, cols, off) => { for (let k = 0; k < 2; k++) pl(MS, x, y, z, a0 + k * 1.5708, off, pts, cols); };
    if (kind === 'broad') {
      const g = [H('#4e9a3a'), H('#5aa842'), H('#438a35')][Math.floor(rng() * 3)];
      trunk(2.6 * s, 0.17 * s, tcol('#6b4a2e'));
      layer(blob(3.0 * s, 1.55 * s, 1.4 * s, 11, 0.3), J(M.shade(g, 0.78), 0.05), -0.07);
      layer(blob(3.15 * s, 1.15 * s, 1.0 * s, 10, 1.1), J(g, 0.06), 0.0);
      layer(blob(3.3 * s, 0.7 * s, 0.6 * s, 8, 2.0), J(M.shade(g, 1.2), 0.05), 0.07);
      h = 4.6 * s; r = 0.45;
    } else if (kind === 'pine' || kind === 'snowpine') {
      const snow = kind === 'snowpine', g = snow ? H('#3c6e5a') : H('#2f6f4a');
      trunk(1.5 * s, 0.15 * s, tcol('#5e4028'));
      const L3 = [[1.0, 2.6, 1.5, g], [2.3, 4.0, 1.15, snow ? H('#e9f3fb') : M.shade(g, 1.12)], [3.4, 5.4, 0.8, snow ? H('#f4f9ff') : M.shade(g, 1.25)]];
      L3.forEach((l, i) => layer([[0, l[1] * s], [-l[2] * s, l[0] * s], [-l[2] * 0.35 * s, l[0] * s + 0.3], [l[2] * 0.35 * s, l[0] * s + 0.3], [l[2] * s, l[0] * s]].slice(0, 2).concat([[0, l[0] * s + 0.32], [l[2] * s, l[0] * s]]), J(l[3], 0.05), i * 0.06 - 0.06));
      h = 5.4 * s; r = 0.4;
    } else if (kind === 'dead') {
      const c = tcol('#241c1c'); trunk(3.4 * s, 0.2 * s, c);
      pl(MS, x, y, z, a0, 0, [[0, 2.0 * s], [0.18, 2.1 * s], [1.3, 3.1 * s], [1.1, 3.2 * s]], c);
      pl(MS, x, y, z, a0, 0, [[0, 2.6 * s], [-0.15, 2.7 * s], [-1.0, 3.6 * s], [-0.85, 3.7 * s]], c);
      h = 3.4 * s; r = 0.35;
    } else { // acacia
      trunk(3.0 * s, 0.16 * s, tcol('#6a4a2a'));
      const g = H('#6e8f3a');
      for (let k = 0; k < 2; k++) pl(MS, x, y, z, a0 + k * 1.5708, 0, [[-2.4 * s, 3.1 * s], [-1.6 * s, 3.6 * s], [0, 3.75 * s], [1.6 * s, 3.6 * s], [2.4 * s, 3.1 * s], [0, 2.95 * s]], J(g, 0.06));
      h = 3.8 * s; r = 0.35;
    }
    W.addCircle(x, z, r, 'tree');
    W.addProp({ type: 'tree', kind, x, z, y, h, r, flam: kind !== 'snowpine', burn: 0 });
  }
  function paperRock(x, z, s, reg, kind) {
    const y = gy(x, z) - 0.2, L0 = frame(x, y, z, rng() * M.TAU), MS = W.mbSolid(x, z);
    const c = { hub: H('#8a8478'), agua: H('#9fb0c4'), fogo: H('#2d2626'), terra: H('#a8724a'), ar: H('#8d8d99') }[reg] || H('#888');
    shadowDisc(MS, x, y, z, 1.0 * s);
    if (kind === 'spike' || kind === 'ice') {
      const cc = kind === 'ice' ? H('#a5d6f2') : c, a = rng() * M.TAU;
      for (let k = 0; k < 2; k++) pl(MS, x, y, z, a + k * 1.5708, 0, [[0, 2.7 * s], [-0.6 * s, 0], [0.6 * s, 0]], J(k ? M.shade(cc, 0.85) : cc, 0.06));
    } else {
      for (let i = 0; i < 3; i++) { const rr = (0.95 - 0.28 * i) * s, hh = 0.3 * s; MS.cyl(L0(0.08 * i * s, i * hh, 0.05 * i * s, 1, hh, 1, i * 0.7), 6, rr * 0.93, rr, J(M.shade(c, 0.86 + 0.14 * i), 0.05), true, true); }
    }
    W.addCircle(x, z, 0.8 * s, 'rock');
    W.addProp({ type: 'rock', x, z, y, h: 1.2 * s, r: 0.8 * s, flam: false });
  }
  function tree(kind, x, z, s) {
    if (G.gfx.q.draw) return paperTree(kind, x, z, s);
    const r2 = M.seeded((Math.floor(x * 131) ^ Math.floor(z * 977)) | 1);
    const y = gy(x, z) - 0.1, L = frame(x, y, z, rng() * M.TAU), MS = W.mbSolid(x, z);
    let h = 3, r = 0.5;
    if (kind === 'broad') {
      const birch = DL >= 3 && r2() < 0.35, tc = birch ? H('#d8d2c4') : H('#6b4a2e');
      MS.cyl(L(0, 0, 0, 1, 2.2 * s, 1), DL >= 2 ? 7 : 5, 0.28 * s, 0.2 * s, J(tc), false, false);
      const g = birch ? H('#8ab04a') : [H('#4e9a3a'), H('#5aa842'), H('#438a35')][Math.floor(rng() * 3)];
      MS.sphere(L(0, 3.0 * s, 0, 1.7 * s, 1.5 * s, 1.7 * s), DL >= 2 ? 7 : 6, 4, J(g, 0.08));
      if (DL >= 1) MS.sphere(L(0.8 * s, 2.5 * s, 0.4 * s, 1.1 * s, 1.0 * s, 1.1 * s), 5, 3, J(g, 0.08));
      if (DL >= 2) {
        const nb = DL >= 3 ? 4 : 2;
        for (let k = 0; k < nb; k++) {
          const a = r2() * M.TAU + k * 1.6;
          MS.cyl(L(0, 1.9 * s, 0, 1, 1.2 * s, 1, 0, a, 0.9), 4, 0.07 * s, 0.04 * s, J(tc), false, false);
          MS.sphere(L(-Math.cos(a) * 0.94 * s, 2.65 * s, Math.sin(a) * 0.94 * s, 0.9 * s, 0.75 * s, 0.9 * s), 5, 3, J(g, 0.1));
          MS.cone(L(Math.cos(a) * 0.22 * s, 0.05, Math.sin(a) * 0.22 * s, 1, 0.55 * s, 1, 0, a, 1.2), 4, 0.13 * s, J(tc), false);
        }
      }
      h = 4.6 * s; r = 0.45;
    } else if (kind === 'pine') {
      MS.cyl(L(0, 0, 0, 1, 1.6 * s, 1), 5, 0.24 * s, 0.18 * s, J(H('#5e4028')), false, false);
      const g = H('#2f6f4a');
      MS.cone(L(0, 1.0 * s, 0, 1, 2.6 * s, 1), 6, 1.5 * s, J(g, 0.07), true);
      if (DL >= 1) MS.cone(L(0, 2.4 * s, 0, 1, 2.3 * s, 1), 6, 1.15 * s, J(g, 0.07), false);
      MS.cone(L(0, 3.6 * s, 0, 1, 1.9 * s, 1), 6, 0.8 * s, J(g, 0.07), false);
      if (DL >= 2) MS.cone(L(0, 4.6 * s, 0, 1, 1.3 * s, 1), 6, 0.5 * s, J(H('#3a8057'), 0.05), false);
      if (DL >= 3) for (let k = 0; k < 3; k++) { const a = r2() * M.TAU; MS.cone(L(Math.cos(a) * 0.9 * s, 1.6 * s, Math.sin(a) * 0.9 * s, 1, 0.8 * s, 1, 0, a, 1.3), 5, 0.4 * s, J(g, 0.07), false); }
      h = 5.5 * s; r = 0.4;
    } else if (kind === 'snowpine') {
      MS.cyl(L(0, 0, 0, 1, 1.5 * s, 1), 5, 0.22 * s, 0.17 * s, J(H('#5e4028')), false, false);
      MS.cone(L(0, 1.0 * s, 0, 1, 2.6 * s, 1), 6, 1.45 * s, J(H('#3c6e5a'), 0.05), true);
      MS.cone(L(0, 2.3 * s, 0, 1, 2.2 * s, 1), 6, 1.05 * s, J(H('#e9f3fb'), 0.03), false);
      MS.cone(L(0, 3.5 * s, 0, 1, 1.7 * s, 1), 6, 0.72 * s, J(H('#f4f9ff'), 0.02), false);
      h = 5.2 * s; r = 0.4;
    } else if (kind === 'dead') {
      MS.cyl(L(0, 0, 0, 1, 3.4 * s, 1), 5, 0.3 * s, 0.1 * s, J(H('#241c1c')), false, false);
      MS.cyl(L(0.1, 2.0 * s, 0, 1, 1.5 * s, 1, 0, 0, -0.9), 4, 0.1 * s, 0.03, H('#241c1c'), false, false);
      MS.cyl(L(-0.05, 2.6 * s, 0, 1, 1.2 * s, 1, 0, 0, 0.8), 4, 0.09 * s, 0.03, H('#241c1c'), false, false);
      h = 3.4 * s; r = 0.35;
    } else if (kind === 'acacia') {
      MS.cyl(L(0, 0, 0, 1, 3.0 * s, 1), 5, 0.26 * s, 0.18 * s, J(H('#6a4a2a')), false, false);
      MS.cyl(L(0, 3.0 * s, 0, 1, 0.7 * s, 1), 7, 2.3 * s, 1.6 * s, J(H('#6e8f3a'), 0.08), true, true);
      h = 3.8 * s; r = 0.35;
    }
    MS; W.addCircle(x, z, r, 'tree');
    W.addProp({ type: 'tree', kind, x, z, y, h, r, flam: kind !== 'snowpine', burn: 0 });
  }
  function rock(x, z, s, reg, kind) {
    if (G.gfx.q.draw) return paperRock(x, z, s, reg, kind);
    const y = gy(x, z) - 0.2, L = frame(x, y, z, rng() * M.TAU), MS = W.mbSolid(x, z);
    const c = { hub: H('#8a8478'), agua: H('#9fb0c4'), fogo: H('#2d2626'), terra: H('#a8724a'), ar: H('#8d8d99') }[reg] || H('#888');
    if (kind === 'spike') { MS.cone(L(0, 0, 0, 1, 2.8 * s, 1, 0, 0.1), 4, 0.6 * s, J(c, 0.1), false); }
    else if (kind === 'ice') { MS.cone(L(0, 0, 0, 1, 2.6 * s, 1, 0, 0.1, 0.1), 5, 0.65 * s, J(H('#a5d6f2'), 0.06), false); MS.cone(L(0.5 * s, 0, 0.2, 1, 1.5 * s, 1, 0, 0, -0.3), 4, 0.4 * s, J(H('#c0e6fa'), 0.06), false); }
    else {
      MS.sphere(L(0, 0.35 * s, 0, 0.9 * s, 0.7 * s, 0.8 * s, 0), 5, 3, J(c, 0.1));
      if (s > 1.2) MS.sphere(L(0.6 * s, 0.25 * s, 0.3 * s, 0.55 * s, 0.45 * s, 0.5 * s), 5, 3, J(c, 0.1));
    }
    W.addCircle(x, z, 0.8 * s, 'rock');
    W.addProp({ type: 'rock', x, z, y, h: 1.2 * s, r: 0.8 * s, flam: false });
  }
  function shrub(x, z, reg) {
    const y = gy(x, z) - 0.05, L = frame(x, y, z, rng() * M.TAU), MS = W.mbSolid(x, z);
    const c = reg === 'terra' ? H('#8a8a3e') : reg === 'fogo' ? H('#3e2e24') : reg === 'ar' ? H('#6aa860') : H('#4f9a3c');
    MS.sphere(L(0, 0.3, 0, 0.7, 0.5, 0.7), 5, 3, J(c, 0.1));
    W.addProp({ type: 'shrub', x, z, y, h: 0.8, r: 0.5, flam: true, burn: 0 });
  }
  function tuft(x, z, reg) {
    const y = gy(x, z) - 0.02, MS = W.mbSolid(x, z);
    const c = reg === 'terra' ? H('#9a9a45') : reg === 'ar' ? H('#7cbf6c') : H('#63ab45');
    for (let i = 0; i < 3; i++) {
      const a = rng() * M.TAU, ox = Math.cos(a) * 0.25, oz = Math.sin(a) * 0.25, hgt = 0.5 + rng() * 0.45;
      const k = J(c, 0.12), lx = Math.cos(a + 1.57) * 0.09, lz = Math.sin(a + 1.57) * 0.09;
      MS.w(x + ox - lx, y, z + oz - lz, x + ox + lx, y, z + oz + lz, x + ox + Math.cos(a) * 0.08, y + hgt, z + oz + Math.sin(a) * 0.08, k);
      MS.w(x + ox + lx, y, z + oz + lz, x + ox - lx, y, z + oz - lz, x + ox + Math.cos(a) * 0.08, y + hgt, z + oz + Math.sin(a) * 0.08, k);
    }
  }
  function flowerPatch(x, z) {
    const y = gy(x, z), MS = W.mbSolid(x, z), cols = ['#f4d84a', '#f07aa8', '#ffffff', '#8aa8ff'];
    for (let i = 0; i < 4; i++) { const ox = (rng() - 0.5) * 1.6, oz = (rng() - 0.5) * 1.6, L = frame(x + ox, y, z + oz, 0); MS.sphere(L(0, 0.35, 0, 0.12, 0.1, 0.12), 4, 2, H(cols[Math.floor(rng() * 4)])); MS.cyl(L(0, 0, 0, 1, 0.3, 1), 3, 0.025, 0.02, H('#3f8a35'), false, false); }
  }

  S.build = async function (progress, tick) {
    rng = M.seeded(W.SEED + 777); DL = G.gfx.applyQ().detail; G.gfx.built = G.gfx.q.draw * 10 + DL;
    const towns = W.towns;
    for (const t of towns) buildTown(t);
    progress(0.4, 'Erguendo cidades e templos…'); await tick();
    for (const a of W.arenas) buildArena(a);
    // cavernas e santuários e acampamentos
    const placeIn = (reg, minW, test, tries) => {
      for (let i = 0; i < (tries || 400); i++) {
        const ang = rng() * M.TAU, rad = 60 + rng() * 205, x = W.CENTER + Math.cos(ang) * rad, z = W.CENTER + Math.sin(ang) * rad;
        const w = W.regionW(x, z, {});
        if (w[reg] < minW) continue;
        if (gy(x, z) < 1.4 || W.slopeAt(x, z) > 0.35 || W.lavaMaskAt(x, z) > 0.05 || W.pathDist(x, z) < 6) continue;
        if (towns.some((t) => dist(x - t.x, z - t.z) < t.R + 14) || W.arenas.some((a) => dist(x - a.x, z - a.z) < a.R + 14)) continue;
        if (!test(x, z)) continue;
        return [x, z];
      }
      return null;
    };
    const taken = [];
    const far = (min) => (x, z) => taken.every((p) => dist(p[0] - x, p[1] - z) > min);
    let cid = 0;
    for (const reg of ['hub', 'agua', 'fogo', 'terra', 'ar']) {
      const nCamps = reg === 'hub' ? 4 : 6;
      for (let i = 0; i < nCamps; i++) { const p = placeIn(reg, reg === 'hub' ? 0.8 : 0.72, far(38)); if (p) { taken.push(p); camp(p[0], p[1], reg, cid++); } }
      if (reg !== 'hub') {
        for (let i = 0; i < 2; i++) { const p = placeIn(reg, 0.72, far(40)); if (p) { taken.push(p); cave(p[0], p[1], reg, reg + i); } }
        const sp = placeIn(reg, 0.8, far(50)); if (sp) { taken.push(sp); shrine(sp[0], sp[1], reg, 'Santuário ' + W.REGIONS[reg].nome); }
      }
    }
    progress(0.5, 'Plantando florestas…'); await tick();
    // vegetação
    const cell = [11, 8.2, 6.8, 5.8][DL];
    let cnt = 0;
    const w = {};
    for (let gz = 0; gz < W.SIZE; gz += cell) {
      for (let gx = 0; gx < W.SIZE; gx += cell) {
        const x = gx + rng() * cell, z = gz + rng() * cell;
        const d = dist(x - W.CENTER, z - W.CENTER);
        if (d > 268) continue;
        const h = gy(x, z); if (h < 0.9) continue;
        if (towns.some((t) => dist(x - t.x, z - t.z) < t.R + 3) || W.arenas.some((a) => dist(x - a.x, z - a.z) < a.R + 5)) continue;
        if (W.pathDist(x, z) < 3.4) continue;
        const lm = W.lavaMaskAt(x, z); if (lm > 0.04) continue;
        const sl = W.slopeAt(x, z);
        W.regionW(x, z, w);
        let reg = 'hub', bv = -1; for (const k of ['hub', 'agua', 'fogo', 'terra', 'ar']) { const v = w[k] * (0.7 + rng() * 0.6); if (v > bv) { bv = v; reg = k; } }
        const clump = M.fbm(x * 0.035, z * 0.035, 61, 3);
        const r = rng();
        if (reg === 'hub') {
          if (sl < 0.55 && r < 0.12 + clump * 0.55) tree('broad', x, z, 0.85 + rng() * 0.5);
          else if (r < 0.6) shrub(x, z, reg);
          else if (r < 0.7) flowerPatch(x, z);
          else if (r < 0.74) rock(x, z, 0.7 + rng() * 0.8, reg);
        } else if (reg === 'agua') {
          if (sl < 0.6 && r < 0.1 + clump * 0.45) tree('snowpine', x, z, 0.8 + rng() * 0.6);
          else if (r < 0.5) rock(x, z, 0.6 + rng() * 1.1, reg, rng() < 0.4 ? 'ice' : 'rock');
        } else if (reg === 'fogo') {
          if (r < 0.1 + clump * 0.2) tree('dead', x, z, 0.8 + rng() * 0.6);
          else if (r < 0.46) rock(x, z, 0.6 + rng() * 1.3, reg, rng() < 0.3 ? 'spike' : 'rock');
        } else if (reg === 'terra') {
          if (sl < 0.5 && r < 0.05 + clump * 0.22) tree('acacia', x, z, 0.8 + rng() * 0.6);
          else if (r < 0.38) rock(x, z, 0.7 + rng() * 1.5, reg);
          else if (r < 0.62) shrub(x, z, reg);
        } else {
          if (sl < 0.6 && r < 0.08 + clump * 0.4 && h < 44) tree('pine', x, z, 0.8 + rng() * 0.6);
          else if (r < 0.4) rock(x, z, 0.6 + rng() * 1.2, reg);
        }
        cnt++;
      }
    }
    progress(0.62, 'Plantando florestas…'); await tick();
    // tufos de grama
    for (let gz = 0; gz < W.SIZE; gz += 4.6) {
      for (let gx = 0; gx < W.SIZE; gx += 4.6) {
        const x = gx + rng() * 4.6, z = gz + rng() * 4.6;
        if (dist(x - W.CENTER, z - W.CENTER) > 255 || rng() > 0.45) continue;
        W.regionW(x, z, w);
        if (w.hub + w.ar * 0.8 + w.terra * 0.3 < 0.45) continue;
        const h = gy(x, z); if (h < 1.1 || h > 30 || W.pathDist(x, z) < 2.8 || W.slopeAt(x, z) > 0.6) continue;
        if (towns.some((t) => dist(x - t.x, z - t.z) < t.R * 0.8)) continue;
        tuft(x, z, w.hub > w.ar ? 'hub' : 'ar');
      }
    }
    progress(0.76, 'Posicionando objetos…'); await tick();
    // objetos destrutíveis espalhados pelos caminhos
    for (let i = 1; i < towns.length; i++) {
      const a = towns[0], b = towns[i];
      for (let k = 0; k < 3; k++) { const t = 0.25 + k * 0.25; const x = a.x + (b.x - a.x) * t + (rng() - 0.5) * 8, z = a.z + (b.z - a.z) * t + (rng() - 0.5) * 8; S.dyn(rng() < 0.5 ? 'hay' : 'barrel', x, z); }
    }
    // barricada de madeira inflamável no caminho de cada cidade
    for (let i = 1; i < towns.length; i++) { const t = towns[i], a = towns[0]; const ang = Math.atan2(a.z - t.z, a.x - t.x); S.dyn('barricade', t.x + Math.cos(ang) * 40, t.z + Math.sin(ang) * 40); }
    // blocos de gelo no norte, pedras quebráveis no sul
    for (let i = 0; i < 6; i++) { const x = 320 + (rng() - 0.5) * 160, z = 80 + rng() * 110; S.dyn('iceblock', x, z); }
    for (let i = 0; i < 6; i++) { const x = 320 + (rng() - 0.5) * 160, z = 440 + rng() * 120; S.dyn('rubble', x, z); }
  };
})();
