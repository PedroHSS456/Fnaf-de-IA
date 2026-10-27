'use strict';
/* Elemental World — modelos procedurais (personagens, inimigos, animais) com contorno estilo cel-shading */
(function () {
  const G = window.G; const M = G.M; const gfx = G.gfx;
  const Mod = (G.models = {});
  const H = M.hex;
  const cache = {};
  /* estilo Desenho: personagens viram recortes finos de papel (achatados em profundidade) */
  const I = (px, py, pz, sx, sy, sz, ry, rx, rz) => { const zs = gfx.q.draw ? 0.5 : 1; return M.trs(new Float32Array(16), px, py, pz * zs, rx || 0, ry || 0, rz || 0, sx == null ? 1 : sx, sy == null ? 1 : sy, (sz == null ? 1 : sz) * zs); };

  Mod.ELCOL = {
    fogo: { c1: '#b8321f', c2: '#2b2024', c3: '#3a2a2a', trim: '#ffb03a' },
    agua: { c1: '#2f78c8', c2: '#e8f4ff', c3: '#24508a', trim: '#8fd8ff' },
    terra: { c1: '#4f8a3a', c2: '#8a6a3a', c3: '#5a4630', trim: '#d8c070' },
    ar: { c1: '#f0b13a', c2: '#fff4d8', c3: '#e07a2a', trim: '#ffffff' },
    avatar: { c1: '#e8e4d8', c2: '#c9a24a', c3: '#4a5a8a', trim: '#ffd36a' },
  };

  /* look: {skin, hair, hs (estilo de cabelo 0-3), c1,c2,c3, el, weapon, helmet, big, robe, scale} */
  function humanoid(look) {
    const skin = H(look.skin || '#e0b088'), hair = H(look.hair || '#2a1c14');
    const c1 = H(look.c1), c2 = H(look.c2), c3 = H(look.c3 || '#3a3030');
    const big = look.big ? 1.35 : 1;
    const parts = [];
    const body = new gfx.MB(0.04);
    // tronco
    body.box(I(0, 1.15, 0, 0.5 * big, 0.62, 0.28 * big), c1);
    body.box(I(0, 0.9, 0, 0.53 * big, 0.1, 0.31 * big), c2);
    // saia/robe
    if (look.robe) body.cyl(I(0, 0.2, 0, 1, 0.7, 1), 8, 0.42 * big, 0.3 * big, c1, false, false);
    else body.box(I(0, 0.78, 0, 0.5 * big, 0.14, 0.3 * big), c1);
    // cachecol/gola
    body.cyl(I(0, 1.42, 0, 1, 0.12, 1), 8, 0.2, 0.17, c2, true, false);
    // cabeça
    body.sphere(I(0, 1.68, 0, 0.21, 0.23, 0.21), 7, 5, skin);
    const sk2 = M.shade(skin, 0.86), brow = M.shade(hair, 0.8);
    for (const s of [-1, 1]) {
      body.box(I(s * 0.08, 1.69, 0.2, 0.06, 0.04, 0.016), H('#f4f0e8'));
      body.box(I(s * 0.08, 1.69, 0.208, 0.028, 0.036, 0.016), H('#1a1210'));
      body.box(I(s * 0.08, 1.74, 0.198, 0.07, 0.014, 0.016), brow);
      body.box(I(s * 0.125, 1.62, 0.17, 0.04, 0.03, 0.01), M.shade(skin, 1.06));
    }
    body.box(I(0, 1.645, 0.212, 0.03, 0.045, 0.035), sk2);
    body.box(I(0, 1.585, 0.203, 0.075, 0.012, 0.016), H('#8a3a30'));
    // cabelo
    const hs = look.hs == null ? 0 : look.hs;
    if (!look.helmet) {
      if (hs === 0) body.sphere(I(0, 1.74, -0.025, 0.235, 0.2, 0.235), 7, 4, hair);
      else if (hs === 1) { body.sphere(I(0, 1.74, -0.025, 0.24, 0.21, 0.24), 7, 4, hair); body.box(I(0, 1.5, -0.2, 0.3, 0.5, 0.1), hair); }
      else if (hs === 2) { body.sphere(I(0, 1.75, -0.02, 0.23, 0.18, 0.23), 7, 4, hair); body.sphere(I(0, 1.97, -0.02, 0.1, 0.1, 0.1), 5, 3, hair); }
      else { body.cyl(I(0, 1.72, 0, 1, 0.07, 1), 8, 0.225, 0.225, c2, false, false); if (hs === 3) body.sphere(I(0, 1.77, -0.03, 0.2, 0.1, 0.2), 6, 3, hair); }
    } else {
      body.sphere(I(0, 1.74, 0, 0.255, 0.22, 0.255), 7, 4, H(look.helmetCol || '#55504c'));
      if (look.horns) { body.cone(I(0.2, 1.82, 0, 1, 0.3, 1, 0, 0, -0.7), 4, 0.06, H('#d8d0c0'), false); body.cone(I(-0.2, 1.82, 0, 1, 0.3, 1, 0, 0, 0.7), 4, 0.06, H('#d8d0c0'), false); }
    }
    // extras por elemento
    const el = look.el;
    if (el === 'fogo') { body.box(I(0.3 * big, 1.45, 0, 0.2, 0.08, 0.3), c3); body.box(I(-0.3 * big, 1.45, 0, 0.2, 0.08, 0.3), c3); body.box(I(0.05, 1.12, 0.145 * big, 0.12, 0.7, 0.03, 0, 0, 0.5), H(look.trim || '#ffb03a')); }
    else if (el === 'agua') { body.box(I(0, 1.1, 0.145 * big, 0.1, 0.72, 0.03, 0, 0, 0.55), c2); body.box(I(0, 1.1, -0.145 * big, 0.5, 0.5, 0.04), c2); }
    else if (el === 'terra') { body.box(I(0.32 * big, 1.43, 0, 0.26, 0.14, 0.34), c2); body.box(I(-0.32 * big, 1.43, 0, 0.26, 0.14, 0.34), c2); body.box(I(0, 1.15, 0.15 * big, 0.3, 0.3, 0.04), c3); }
    else if (el === 'ar') { body.cyl(I(0, 0.45, 0, 1, 0.5, 1), 8, 0.4 * big, 0.3 * big, c3, false, false); body.box(I(0, 1.15, 0.145 * big, 0.14, 0.62, 0.03), c2); body.box(I(0, 1.15, -0.18 * big, 0.4, 0.6, 0.06), c3); }
    else if (el === 'avatar') { body.box(I(0, 1.15, -0.17 * big, 0.5, 0.75, 0.05), c3); body.box(I(0, 1.15, 0.145 * big, 0.12, 0.6, 0.03), c2); body.cyl(I(0, 1.9, 0, 1, 0.03, 1), 8, 0.1, 0.1, H('#4a8fd8'), true, false); }
    if (look.master) { body.cone(I(0, 1.88, 0, 1, 0.35, 1), 6, 0.18, c2, false); body.cyl(I(0, 0.25, 0, 1, 0.65, 1), 8, 0.5, 0.36, c3, false, false); }
    if (look.pack) body.box(I(0, 1.15, -0.25 * big, 0.34, 0.42, 0.2), H('#7a5a38'));
    parts.push({ mesh: body.build(), p: [0, 0, 0], role: 'body' });
    // pernas
    for (const s of [-1, 1]) {
      const l = new gfx.MB(0.04);
      l.box(I(0, -0.34, 0, 0.19 * big, 0.68, 0.21 * big), look.pants ? H(look.pants) : c3);
      l.box(I(0, -0.75, 0.03, 0.2 * big, 0.14, 0.28 * big), c2);
      parts.push({ mesh: l.build(), p: [s * 0.13 * big, 0.86, 0], role: s < 0 ? 'legL' : 'legR' });
    }
    // braços
    for (const s of [-1, 1]) {
      const a = new gfx.MB(0.04);
      a.box(I(0, -0.17, 0, 0.15 * big, 0.34, 0.15 * big), c1);
      a.box(I(0, -0.45, 0, 0.12 * big, 0.26, 0.12 * big), look.gauntlet ? c3 : skin);
      a.sphere(I(0, -0.6, 0, 0.085 * big, 0.085 * big, 0.085 * big), 5, 3, skin);
      if (s > 0 && look.weapon === 'spear') { a.cyl(I(0, -0.9, 0.05, 1, 2.1, 1, 0, 1.57), 4, 0.03, 0.03, H('#6a4a30'), false, false); a.cone(I(0, 0.05, 1.18, 1, 0.3, 1, 0, 1.57), 4, 0.07, H('#d8dce0'), false); }
      if (s > 0 && look.weapon === 'club') { a.cyl(I(0, -0.7, 0.2, 1, 0.9, 1, 0, 1.2), 5, 0.05, 0.1, H('#6a4a30'), true, false); }
      if (s > 0 && look.weapon === 'staff') { a.cyl(I(0, -1.2, 0.05, 1, 2.1, 1), 4, 0.03, 0.03, H('#7a5a38'), false, false); a.sphere(I(0, 0.9, 0.05, 0.1, 0.1, 0.1), 5, 3, H(look.staffCol || '#ffd36a')); }
      if (s > 0 && look.weapon === 'blade') { a.box(I(0, -0.65, 0.35, 0.05, 0.05, 0.7), H('#c8ccd2')); }
      if (s > 0 && look.weapon === 'bow') { a.cyl(I(0, -0.9, 0.2, 1, 1.4, 1), 4, 0.025, 0.025, H('#7a5a38'), false, false); }
      parts.push({ mesh: a.build(), p: [s * 0.34 * big, 1.42, 0], role: s < 0 ? 'armL' : 'armR' });
    }
    return parts;
  }

  function wolf(look) {
    const c = H(look.c1 || '#8a8a92'), c2 = H(look.c2 || '#d8d8dc'), parts = [];
    const b = new gfx.MB(0.05);
    b.box(I(0, 0.62, 0, 0.46, 0.46, 1.0), c);
    b.box(I(0, 0.82, 0.55, 0.34, 0.34, 0.4), c);
    b.box(I(0, 0.74, 0.8, 0.2, 0.18, 0.24), c2);
    b.box(I(0, 0.74, 0.93, 0.07, 0.07, 0.05), H('#111'));
    b.cone(I(0.11, 1.0, 0.5, 1, 0.18, 1), 4, 0.07, c, false); b.cone(I(-0.11, 1.0, 0.5, 1, 0.18, 1), 4, 0.07, c, false);
    b.box(I(0.09, 0.86, 0.72, 0.05, 0.05, 0.04), H(look.eye || '#ffdd55')); b.box(I(-0.09, 0.86, 0.72, 0.05, 0.05, 0.04), H(look.eye || '#ffdd55'));
    b.cone(I(0, 0.7, -0.55, 1, 0.55, 1, 0, -2.0), 4, 0.12, c2, false);
    parts.push({ mesh: b.build(), p: [0, 0, 0], role: 'body', emisMask: 0 });
    [[0.17, 0.4], [-0.17, 0.4], [0.17, -0.4], [-0.17, -0.4]].forEach((q, i) => {
      const l = new gfx.MB(0.05); l.box(I(0, -0.2, 0, 0.13, 0.42, 0.14), c); l.box(I(0, -0.43, 0.02, 0.15, 0.06, 0.2), c2);
      parts.push({ mesh: l.build(), p: [q[0], 0.45, q[1]], role: 'quad' + (i % 2 === (i < 2 ? 0 : 1) ? 'A' : 'B') });
    });
    return parts;
  }
  function farm(look, kind) { // porco / vaca: quadrúpede de fazenda
    const cow = kind === 'cow', c = H(look.c1 || (cow ? '#f2efe8' : '#f0a8a8')), c2 = H(look.c2 || (cow ? '#2a2420' : '#d88888')), parts = [];
    const b = new gfx.MB(0.05), W2 = cow ? 0.62 : 0.5, L = cow ? 1.25 : 0.95, Hh = cow ? 0.68 : 0.5;
    b.box(I(0, 0.55 + Hh * 0.5, 0, W2, Hh, L), c);
    if (cow) { b.box(I(0.18, 1.0, 0.1, 0.26, 0.3, 0.4), c2); b.box(I(-0.2, 0.85, -0.3, 0.3, 0.3, 0.35), c2); }
    b.box(I(0, 0.95, L * 0.5 + 0.2, cow ? 0.42 : 0.38, cow ? 0.42 : 0.36, 0.42), c);
    b.box(I(0, 0.88, L * 0.5 + 0.48, cow ? 0.3 : 0.26, 0.2, 0.16), cow ? H('#e8b8a8') : c2);
    b.box(I(0.08, 0.9, L * 0.5 + 0.57, 0.05, 0.05, 0.03), H('#201010')); b.box(I(-0.08, 0.9, L * 0.5 + 0.57, 0.05, 0.05, 0.03), H('#201010'));
    b.box(I(0.09, 1.04, L * 0.5 + 0.38, 0.05, 0.05, 0.04), H('#111')); b.box(I(-0.09, 1.04, L * 0.5 + 0.38, 0.05, 0.05, 0.04), H('#111'));
    if (cow) { b.cone(I(0.24, 1.18, L * 0.5 + 0.12, 1, 0.22, 1, 0, 0, -1.2), 4, 0.05, H('#e8e0c0'), false); b.cone(I(-0.24, 1.18, L * 0.5 + 0.12, 1, 0.22, 1, 0, 0, 1.2), 4, 0.05, H('#e8e0c0'), false); }
    else { b.box(I(0.14, 1.16, L * 0.5 + 0.1, 0.12, 0.14, 0.05), c2); b.box(I(-0.14, 1.16, L * 0.5 + 0.1, 0.12, 0.14, 0.05), c2); b.cone(I(0, 0.95, -L * 0.5 - 0.05, 1, 0.14, 1, 0, 2.2), 4, 0.04, c2, false); }
    parts.push({ mesh: b.build(), p: [0, 0, 0], role: 'body', emisMask: 0 });
    [[W2 * 0.32, L * 0.32], [-W2 * 0.32, L * 0.32], [W2 * 0.32, -L * 0.32], [-W2 * 0.32, -L * 0.32]].forEach((q, i) => {
      const l = new gfx.MB(0.05); l.box(I(0, -0.17, 0, 0.14, 0.4, 0.14), c); l.box(I(0, -0.4, 0.02, 0.15, 0.06, 0.17), c2);
      parts.push({ mesh: l.build(), p: [q[0], 0.55, q[1]], role: 'quad' + (i % 2 === (i < 2 ? 0 : 1) ? 'A' : 'B') });
    });
    return parts;
  }
  function spirit(look) {
    const c = H(look.c1 || '#dff0ff'), parts = [], b = new gfx.MB(0.02);
    b.sphere(I(0, 1.2, 0, 0.45, 0.55, 0.45), 8, 6, c);
    b.cone(I(0, 0.2, 0, 1, 0.8, 1, 0, 3.14), 6, 0.4, M.shade(c, 0.9), false);
    b.cone(I(0.3, 0.3, 0, 1, 0.7, 1, 0, 0, -0.5), 5, 0.2, M.shade(c, 0.85), false);
    b.cone(I(-0.3, 0.3, 0, 1, 0.7, 1, 0, 0, 0.5), 5, 0.2, M.shade(c, 0.85), false);
    b.box(I(0.15, 1.28, 0.38, 0.1, 0.12, 0.05), H('#102030')); b.box(I(-0.15, 1.28, 0.38, 0.1, 0.12, 0.05), H('#102030'));
    parts.push({ mesh: b.build(), p: [0, 0, 0], role: 'float', emis: 0.35 });
    return parts;
  }
  function crow(look) {
    const c = H(look.c1 || '#34344a'), parts = [], b = new gfx.MB(0.04);
    b.sphere(I(0, 1.2, 0, 0.22, 0.2, 0.34), 6, 4, c); b.sphere(I(0, 1.32, 0.3, 0.13, 0.13, 0.13), 5, 3, c);
    b.cone(I(0, 1.3, 0.5, 1, 0.22, 1, 0, 1.57), 4, 0.05, H('#d8a030'), false);
    b.cone(I(0, 1.2, -0.38, 1, 0.5, 1, 0, -1.57), 4, 0.14, c, false);
    b.box(I(0.06, 1.35, 0.4, 0.04, 0.04, 0.03), H('#ff4040')); b.box(I(-0.06, 1.35, 0.4, 0.04, 0.04, 0.03), H('#ff4040'));
    parts.push({ mesh: b.build(), p: [0, 0, 0], role: 'float' });
    for (const s of [-1, 1]) { const w = new gfx.MB(0.04); w.box(I(s * 0.5, 0, 0, 1.0, 0.04, 0.5), c); parts.push({ mesh: w.build(), p: [s * 0.15, 1.25, 0], role: s < 0 ? 'wingL' : 'wingR' }); }
    return parts;
  }

  Mod.get = function (kind, look) {
    const key = kind + JSON.stringify(look || {});
    if (cache[key]) return cache[key];
    let parts;
    if (kind === 'human') parts = humanoid(look);
    else if (kind === 'wolf') parts = wolf(look);
    else if (kind === 'pig' || kind === 'cow') parts = farm(look, kind);
    else if (kind === 'spirit') parts = spirit(look);
    else if (kind === 'crow') parts = crow(look);
    else parts = humanoid(look);
    return (cache[key] = { parts, kind, look });
  };

  const R = M.mat(), P = M.mat(), O = M.mat();
  /* root: {x,y,z,yaw,scale,roll,pitch}  anim: {ph, sp, cast, castR, t, bob, swim, atk} */
  Mod.draw = function (model, root, anim, opt) {
    const sc = root.scale || 1;
    if (!gfx.sphereVisible(root.x, root.y + 1 * sc, root.z, 2.2 * sc)) return;
    anim = anim || {}; opt = opt || {};
    const ph = anim.ph || 0, sp = anim.sp || 0, cast = anim.cast || 0, t = anim.t || 0;
    const roll = root.roll || 0;
    const idle = 1 - Math.min(1, sp * 2);
    let by = root.y + (anim.bob || 0) + Math.sin(t * 1.7) * 0.012 * idle;
    if (roll) {
      M.trs(R, root.x, by + 0.9 * sc, root.z, roll, root.yaw, 0, sc, sc, sc);
      M.mul(R, R, M.trs(O, 0, -0.9, 0, 0, 0, 0, 1, 1, 1));
    } else M.trs(R, root.x, by, root.z, root.pitch || 0, root.yaw, 0, sc, sc, sc);
    const kind = model.kind;
    for (const p of model.parts) {
      let rx = 0, rz = 0, ox = 0, oy = 0;
      switch (p.role) {
        case 'legL': rx = Math.sin(ph) * 0.85 * sp; break;
        case 'legR': rx = -Math.sin(ph) * 0.85 * sp; break;
        case 'armL': rx = Math.sin(t * 1.7) * 0.05 * idle - Math.sin(ph) * 0.7 * sp + (anim.atk ? -1.2 * anim.atk : 0); rx = M.lerp(rx, -1.55 + Math.sin(t * 9) * 0.05, cast); rz = 0.05; break;
        case 'armR': rx = Math.sin(t * 1.7 + 1) * 0.05 * idle + Math.sin(ph) * 0.7 * sp - (anim.atk ? 2.0 * anim.atk : 0); rx = M.lerp(rx, -1.55 + Math.sin(t * 9 + 1) * 0.05, cast); rz = -0.05; break;
        case 'quadA': rx = Math.sin(ph) * 0.9 * sp; break;
        case 'quadB': rx = -Math.sin(ph) * 0.9 * sp; break;
        case 'wingL': rz = Math.sin(t * 14) * 0.7 + 0.2; break;
        case 'wingR': rz = -Math.sin(t * 14) * 0.7 - 0.2; break;
        case 'float': oy = Math.sin(t * 2.2) * 0.12; break;
      }
      if (rx === 0 && rz === 0 && oy === 0 && p.p[0] === 0 && p.p[1] === 0 && p.p[2] === 0) M.mul(O, R, gfx.IDENT);
      else { M.trs(P, p.p[0] + ox, p.p[1] + oy, p.p[2], rx, 0, rz, 1, 1, 1); M.mul(O, R, P); }
      gfx.draw(p.mesh, O, { tint: opt.tint, add: opt.add, emis: (p.emis || 0) + (opt.emis || 0), outline: opt.outline === undefined ? 0.03 : opt.outline });
    }
  };
  Mod.lookFor = function (el, extra) {
    const c = Mod.ELCOL[el] || Mod.ELCOL.avatar;
    return Object.assign({ el, c1: c.c1, c2: c.c2, c3: c.c3, trim: c.trim }, extra || {});
  };
  /* visual padrão do jogador (cores personalizáveis sobrescrevem o elemento) */
  Mod.playerLook = function (s) {
    const el = s.element === 'avatar' ? 'avatar' : s.element;
    const base = Mod.ELCOL[el] || Mod.ELCOL.avatar;
    const L = s.look || {};
    return { el, skin: L.skin, hair: L.hair, hs: L.hs, c1: L.c1 || base.c1, c2: L.c2 || base.c2, c3: base.c3, trim: base.trim };
  };
})();
