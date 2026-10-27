'use strict';
/* Elemental World — FNAF multiplayer: a pizzaria em 3D (como o resto do mapa), para andar livremente.
   Salão com palco, cozinha, bastidores, sala de festa, corredores, depósito e o escritório da segurança.
   Quatro animatronics originais patrulham o prédio (rota igual para todos os jogadores) e perseguem quem estiver por perto. */
(function () {
  const G = window.G, M = G.M, W = G.world, gfx = G.gfx, H = M.hex;
  const Pz = (G.pizza = { active: false, inside: false, session: false, t0: 0, lamp: false, bat: 100, scare: null, caught: 0, over: false });
  const PX = 120, PZ = 30, Y0 = 24, WH = 4.2, SIZE_U = 44, SIZE_V = 48;
  const inBox = (x, z) => x > PX - 2 && x < PX + SIZE_U + 2 && z > PZ - 2 && z < PZ + SIZE_V + 2;
  Pz.inBox = inBox;
  const gy0 = W.groundY, wd0 = W.waterDepth, lv0 = W.isLava, fz0 = W.freeZone;
  W.groundY = (x, z) => (Pz.active && inBox(x, z) ? Y0 : gy0(x, z));
  W.waterDepth = (x, z) => (Pz.active && inBox(x, z) ? 0 : wd0(x, z));
  W.isLava = (x, z) => (Pz.active && inBox(x, z) ? false : lv0(x, z));
  W.freeZone = (x, z) => inBox(x, z) || (fz0 && fz0(x, z));
  const wx = (u) => PX + u, wz = (v) => PZ + v;
  const I = (px, py, pz, sx, sy, sz, ry) => M.trs(new Float32Array(16), px, py, pz, 0, ry || 0, 0, sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
  let solid = null, glow = null; const DOOR_U = [7, 25], DOOR_V = 43.3; const doorMesh = [null, null]; Pz.doors = [false, false];
  const walls = []; // retângulos de parede (para visão e perseguição)
  const col = (u0, v0, u1, v1) => W.addBox(wx(u0), wz(v0), wx(u1), wz(v1), 'pz');

  /* ---------- construção ---------- */
  function build() {
    const S = new gfx.MB(0.035), GL = new gfx.MB(0);
    const C = {
      wall: H('#4a2f24'), wall2: H('#3a2420'), dado: H('#5b1f1c'), blk: H('#0c0b0c'), wht: H('#8c8579'), ceil: H('#17110f'), wood: H('#5a3b24'), dwood: H('#3b2616'),
      steel: H('#5f666b'), dsteel: H('#33383c'), red: H('#8a1f1a'), pur: H('#4a2a62'), yel: H('#d9b53a'), hz: H('#17130d'), cloth: H('#a8372c'), tbl: H('#7a6246'),
    };
    // ----- pisos xadrez e teto -----
    const floor = (u0, v0, u1, v1, a, b, s) => {
      s = s || 2; for (let u = u0, i = 0; u < u1 - 1e-6; u += s, i++) for (let v = v0, j = 0; v < v1 - 1e-6; v += s, j++) {
        const ue = Math.min(u + s, u1), ve = Math.min(v + s, v1), c = (i + j) % 2 ? a : b;
        S.quad(null, [wx(u), Y0 + 0.004, wz(v)], [wx(ue), Y0 + 0.004, wz(v)], [wx(ue), Y0 + 0.004, wz(ve)], [wx(u), Y0 + 0.004, wz(ve)], [0, 1, 0], c);
      }
    };
    S.box(I(wx(SIZE_U / 2), Y0 - 0.3, wz(SIZE_V / 2), SIZE_U + 3, 0.6, SIZE_V + 3), C.blk);
    floor(0, 0, 32, 22, C.blk, C.wht, 2); floor(32, 0, 44, 12, H('#2a2622'), H('#6d675d'), 1.5); floor(32, 14, 44, 26, H('#2a2622'), C.dsteel, 2);
    floor(3, 22, 7, 48, C.blk, C.wht, 2); floor(25, 22, 29, 48, C.blk, C.wht, 2); floor(7, 22, 25, 38, H('#2b1a14'), H('#4a2a1e'), 2);
    floor(7, 38, 25, 48, C.blk, H('#6a1e1a'), 2); floor(29, 26, 44, 48, H('#1c1a19'), H('#3b3835'), 2);
    for (const [u0, v0, u1, v1] of [[0, 0, 32, 22], [32, 0, 44, 12], [32, 14, 44, 26], [3, 22, 7, 48], [25, 22, 29, 48], [7, 22, 25, 48], [29, 26, 44, 48]])
      S.quad(null, [wx(u0), Y0 + WH, wz(v0)], [wx(u0), Y0 + WH, wz(v1)], [wx(u1), Y0 + WH, wz(v1)], [wx(u1), Y0 + WH, wz(v0)], [0, -1, 0], C.ceil);
    // ----- paredes com vãos -----
    const wall = (axis, c, a0, a1, gaps, color, o) => {
      o = o || {}; const g = (gaps || []).slice().sort((p, q) => p[0] - q[0]); let cur = a0; const T = 0.5;
      const seg = (s0, s1) => {
        if (s1 - s0 < 0.05) return; const m = (s0 + s1) / 2, L = s1 - s0;
        const bx = axis === 'v' ? (x, z, y, hh, th) => S.box(I(wx(m), Y0 + y, wz(c), L, hh, th), x) : (x, z, y, hh, th) => S.box(I(wx(c), Y0 + y, wz(m), th, hh, L), x);
        bx(color, 0, WH / 2, WH, T); bx(C.dado, 0, 0.55, 1.1, T + 0.04);
        for (let q = s0, k = 0; q < s1 - 0.01; q += 0.8, k++) { const qe = Math.min(q + 0.8, s1), mm = (q + qe) / 2, ll = qe - q; S.box(axis === 'v' ? I(wx(mm), Y0 + 0.2, wz(c), ll, 0.4, T + 0.08) : I(wx(c), Y0 + 0.2, wz(mm), T + 0.08, 0.4, ll), k % 2 ? C.blk : C.wht); }
        if (axis === 'v') { col(s0, c - T / 2, s1, c + T / 2); walls.push([wx(s0), wz(c - T / 2), wx(s1), wz(c + T / 2)]); } else { col(c - T / 2, s0, c + T / 2, s1); walls.push([wx(c - T / 2), wz(s0), wx(c + T / 2), wz(s1)]); }
      };
      for (const [g0, g1] of g) {
        seg(cur, g0); cur = g1;
        const m = (g0 + g1) / 2, L = g1 - g0; // verga sobre o vão
        S.box(axis === 'v' ? I(wx(m), Y0 + (WH + 2.7) / 2, wz(c), L, WH - 2.7, T) : I(wx(c), Y0 + (WH + 2.7) / 2, wz(m), T, WH - 2.7, L), color);
        if (o.hazard) for (let q = g0; q < g1 - 0.05; q += 0.4) { const k = Math.round((q - g0) / 0.4); S.box(axis === 'v' ? I(wx(q + 0.2), Y0 + 2.62, wz(c), 0.2, 0.18, T + 0.06) : I(wx(c), Y0 + 2.62, wz(q + 0.2), T + 0.06, 0.18, 0.2), k % 2 ? C.yel : C.hz); }
      }
      seg(cur, a1);
    };
    const ow = C.wall, iw = C.wall2;
    wall('v', 0, 0, 44, [], ow); wall('v', 48, 0, 44, [], ow); wall('h', 0, 0, 48, [], ow); wall('h', 44, 0, 48, [], ow);
    // o "v" = linha horizontal (v constante), "h" = linha vertical (u constante). Ajustes abaixo usam essa convenção.
    wall('v', 22, 0, 32, [[3, 7], [14, 18], [25, 29]], iw); // fundo do salão
    wall('h', 32, 0, 26, [[4, 7.4], [15, 18]], iw); // salão | cozinha/bastidores
    wall('v', 12, 32, 44, [], iw); wall('v', 14, 32, 44, [], iw); wall('v', 26, 29, 44, [], iw);
    wall('h', 3, 22, 48, [], iw); wall('h', 7, 22, 48, [[28, 31], [42, 44.6]], iw, { hazard: true });
    wall('h', 25, 22, 48, [[28, 31], [42, 44.6]], iw, { hazard: true }); wall('h', 29, 22, 48, [[36, 39]], iw);
    wall('v', 38, 7, 25, [], C.wall); // parede do pôster (norte do escritório)
    // ----- palco -----
    S.box(I(wx(16), Y0 + 0.4, wz(3.5), 12, 0.8, 5), C.dwood); S.box(I(wx(16), Y0 + 0.82, wz(3.5), 12.2, 0.06, 5.2), C.wood); col(10, 1, 22, 6);
    S.box(I(wx(16), Y0 + 2.4, wz(0.6), 12, 3.4, 0.2), C.pur);
    for (const [u, w] of [[10.4, 1.6], [21.6, 1.6]]) S.box(I(wx(u), Y0 + 2.2, wz(1.2), w, 3.0, 0.5), C.red);
    for (let i = 0; i < 9; i++) GL.box(I(wx(11 + i * 1.25), Y0 + 3.7 - (i % 2) * 0.35, wz(0.7), 0.35, 0.35, 0.06), i % 3 === 0 ? H('#ffd45a') : i % 3 === 1 ? H('#ff6a5a') : H('#7ad0ff'));
    GL.box(I(wx(16), Y0 + 4.0, wz(2.5), 9, 0.1, 0.1), H('#ffcf70')); // luz do palco
    for (let i = 0; i < 3; i++) S.box(I(wx(12 + i * 4), Y0 + 0.5, wz(6.4), 1.8, 0.16, 0.9), C.dwood); // degraus
    S.box(I(wx(16), Y0 + 0.86, wz(5.6), 11.6, 0.04, 0.5), H('#8a1f1a')); // tapete da frente
    for (let i = 0; i < 10; i++) GL.box(I(wx(10.8 + i * 1.15), Y0 + 0.92, wz(5.75), 0.28, 0.1, 0.18), H('#ffd890')); // luzes de rampa
    S.box(I(wx(16), Y0 + 3.9, wz(1.6), 12.4, 0.5, 0.7), C.red); S.box(I(wx(16), Y0 + 4.1, wz(2.0), 12.6, 0.14, 0.9), H('#d9b53a'));
    for (const [u, c] of [[11.5, '#ffe29a'], [16, '#ffffff'], [20.5, '#ffb0d0']]) { S.cone(I(wx(u), Y0 + 3.55, wz(2.2), 0.7, 0.4, 0.7), 8, 0.5, H('#17120f'), false); GL.sphere(I(wx(u), Y0 + 3.5, wz(2.25), 0.18, 0.12, 0.18), 6, 5, H(c)); }
    for (let i = 0; i < 7; i++) { const a = i / 6; GL.sphere(I(wx(11.2 + a * 9.6), Y0 + 2.3 + Math.sin(a * 3.14159) * 0.9, wz(0.72), 0.2, 0.2, 0.05), 5, 4, H(i % 2 ? '#ffe070' : '#ff9ac0')); } // estrelas no fundo
    for (const u of [10.9, 21.1]) { S.box(I(wx(u), Y0 + 1.3, wz(4.6), 0.9, 1.0, 0.7), H('#15110f')); GL.sphere(I(wx(u), Y0 + 1.5, wz(4.22), 0.2, 0.2, 0.05), 6, 5, H('#8a6a4a')); } // caixas de som
    S.cyl(I(wx(16), Y0 + 0.82, wz(5.0), 0.04, 1.4, 0.04), 4, 1, 1, H('#2a2a2e'), false, false); S.sphere(I(wx(16), Y0 + 2.25, wz(5.0), 0.1, 0.1, 0.1), 6, 5, H('#444')); // microfone
    // ----- cantinho do pirata (cortina) -----
    S.box(I(wx(4.5), Y0 + 1.7, wz(0.9), 5.5, 3.2, 0.4), C.pur); S.box(I(wx(4.5), Y0 + 2.9, wz(1.2), 6, 0.5, 0.5), C.red);
    S.box(I(wx(7.4), Y0 + 1.3, wz(4.5), 0.5, 2.5, 7.5), C.red); col(7, 1, 7.8, 8.5);
    GL.box(I(wx(7.1), Y0 + 1.4, wz(7.9), 0.06, 0.5, 0.9), H('#cc3a2a')); // placa
    // ----- mesas, cadeiras e chapéus de festa -----
    const hatCol = [H('#e84d8a'), H('#4db8e8'), H('#e8c34d'), H('#6ae84d')];
    [[6, 11], [14, 10], [22, 11], [6, 18], [16, 17], [27, 17]].forEach(([u, v], k) => {
      S.cyl(I(wx(u), Y0, wz(v), 0.3, 0.85, 0.3), 8, 1, 1, C.dsteel, true, true); S.cyl(I(wx(u), Y0 + 0.82, wz(v), 1.7, 0.08, 1.7), 14, 0.5, 0.5, C.cloth, true, true);
      S.cyl(I(wx(u), Y0 + 0.9, wz(v), 1.2, 0.03, 1.2), 12, 0.5, 0.5, H('#d8cdb8'), true, true);
      S.cone(I(wx(u), Y0 + 0.9, wz(v), 0.5, 0.55, 0.5), 8, 0.5, hatCol[k % 4], true);
      for (let q = 0; q < 4; q++) { const a = q * M.TAU / 4 + 0.4, cu = u + Math.cos(a) * 1.25, cv = v + Math.sin(a) * 1.25; S.box(I(wx(cu), Y0 + 0.42, wz(cv), 0.5, 0.06, 0.5), C.dwood); S.box(I(wx(cu), Y0 + 0.2, wz(cv), 0.06, 0.4, 0.06), C.dsteel); S.box(I(wx(cu + Math.cos(a) * 0.25), Y0 + 0.75, wz(cv + Math.sin(a) * 0.25), 0.5, 0.6, 0.06, -a), C.dwood); }
      col(u - 0.9, v - 0.9, u + 0.9, v + 0.9);
    });
    // fliperama ao longo da parede oeste
    for (let i = 0; i < 4; i++) { const v = 11 + i * 2.3; S.box(I(wx(0.9), Y0 + 1.0, wz(v), 1.0, 2.0, 1.2), [C.pur, C.red, H('#235a6a'), H('#5a4a1a')][i]); GL.box(I(wx(1.42), Y0 + 1.35, wz(v), 0.04, 0.7, 0.8), [H('#58e8d8'), H('#ffcf70'), H('#ff8a6a'), H('#9aff8a')][i]); col(0.3, v - 0.7, 1.5, v + 0.7); }
    // faixas e bandeirinhas
    for (let i = 0; i < 14; i++) { const u = 2 + i * 2.1, c = [H('#e84d4d'), H('#e8c34d'), H('#4db8e8'), H('#7ae84d')][i % 4]; S.cone(I(wx(u), Y0 + 3.9, wz(9.5 + Math.sin(i) * 0.3), 0.4, 0.5, 0.4), 4, 0.5, c, false); }
    // luzes de teto (salão)
    for (const [u, v] of [[8, 6], [24, 6], [16, 13], [8, 18], [24, 18]]) { GL.box(I(wx(u), Y0 + WH - 0.08, wz(v), 1.2, 0.1, 0.5), H('#ffe0a0')); }
    // ----- cozinha -----
    S.box(I(wx(43), Y0 + 0.5, wz(6), 1.2, 1.0, 9), C.steel); S.box(I(wx(43), Y0 + 1.02, wz(6), 1.3, 0.06, 9.2), C.dsteel); col(42.3, 1.5, 44, 10.5);
    S.box(I(wx(38), Y0 + 0.5, wz(1.2), 8, 1.0, 1.2), C.steel); col(34, 0.6, 42, 1.8); S.box(I(wx(34.5), Y0 + 1.1, wz(4), 1.2, 2.2, 1.2), H('#9aa0a5')); col(33.9, 3.4, 35.1, 4.6);
    S.box(I(wx(38), Y0 + 0.45, wz(6.5), 3, 0.9, 1.6), C.dsteel); col(36.5, 5.7, 39.5, 7.3);
    for (let i = 0; i < 4; i++) { S.cyl(I(wx(36 + i * 1.3), Y0 + 2.6, wz(1.0), 0.26, 0.28, 0.26), 8, 1, 1, C.dsteel, true, true); S.box(I(wx(36 + i * 1.3), Y0 + 3.4, wz(1.0), 0.03, 0.8, 0.03), C.dsteel); }
    GL.box(I(wx(38), Y0 + WH - 0.08, wz(6), 1.6, 0.1, 0.5), H('#d9f0e8'));
    // ----- bastidores: prateleiras, caixas, cabeças de reposição -----
    for (let k = 0; k < 3; k++) { const v = 16 + k * 3; S.box(I(wx(43.2), Y0 + 1.1, wz(v), 1.2, 2.2, 2.2), C.dsteel); for (let l = 0; l < 4; l++) S.box(I(wx(42.6), Y0 + 0.4 + l * 0.6, wz(v), 0.1, 0.05, 2.0), C.steel); col(42.5, v - 1.1, 44, v + 1.1); }
    for (const [u, v, c] of [[35, 24, '#6a5230'], [37.2, 24.4, '#5a4528'], [34.6, 16.5, '#6a5230']]) { S.box(I(wx(u), Y0 + 0.5, wz(v), 1.4, 1.0, 1.2), H(c)); col(u - 0.7, v - 0.6, u + 0.7, v + 0.6); }
    S.sphere(I(wx(39), Y0 + 1.2, wz(19), 0.6, 0.55, 0.6), 10, 8, H('#7a4a2a')); S.box(I(wx(39), Y0 + 0.5, wz(19), 1.2, 1.0, 1.2), C.dwood); col(38.4, 18.4, 39.6, 19.6);
    GL.sphere(I(wx(38.8), Y0 + 1.3, wz(18.4), 0.07, 0.07, 0.07), 6, 5, H('#fff4c0')); GL.sphere(I(wx(39.25), Y0 + 1.3, wz(18.4), 0.07, 0.07, 0.07), 6, 5, H('#fff4c0'));
    GL.box(I(wx(38), Y0 + WH - 0.08, wz(20), 1.6, 0.1, 0.5), H('#ffe0a0'));
    // ----- sala de festa -----
    S.box(I(wx(16), Y0 + 0.78, wz(30), 10, 0.1, 1.8), C.tbl); for (const u of [11.5, 20.5]) S.box(I(wx(u), Y0 + 0.4, wz(30), 0.2, 0.8, 1.4), C.dwood); col(11, 29, 21, 31);
    for (let i = 0; i < 6; i++) { S.cone(I(wx(12 + i * 1.6), Y0 + 0.83, wz(30), 0.45, 0.5, 0.45), 8, 0.5, hatCol[i % 4], true); S.box(I(wx(12 + i * 1.6), Y0 + 0.5, wz(31.4), 0.5, 0.06, 0.5), C.dwood); }
    for (let i = 0; i < 7; i++) S.sphere(I(wx(9 + i * 1.9), Y0 + 3.1 + (i % 3) * 0.3, wz(26 + (i % 2) * 5), 0.38, 0.45, 0.38), 8, 6, hatCol[i % 4]);
    S.box(I(wx(16), Y0 + 2.2, wz(22.4), 4.6, 2.4, 0.15), C.pur); GL.box(I(wx(16), Y0 + 2.2, wz(22.55), 3.8, 0.5, 0.04), H('#ffd45a')); // faixa sobre a porta do salão
    GL.box(I(wx(16), Y0 + WH - 0.08, wz(30), 2.0, 0.1, 0.5), H('#ffe0a0'));
    // ----- depósito -----
    for (let k = 0; k < 6; k++) { const u = 31.5 + (k % 3) * 4, v = 28 + Math.floor(k / 3) * 6; S.box(I(wx(u + 1.5), Y0 + 1.0, wz(v + 1.6), 3, 2.0, 1.6), [C.dwood, C.dsteel][k % 2]); col(u, v + 0.8, u + 3, v + 2.4); }
    S.box(I(wx(42), Y0 + 1.3, wz(46), 3.4, 2.6, 3.0), C.dsteel); col(40.3, 44.5, 43.7, 47.5);
    GL.box(I(wx(36.5), Y0 + WH - 0.08, wz(38), 1.6, 0.1, 0.5), H('#bcd0ff'));
    // ----- corredores -----
    for (const u of [5, 27]) for (const v of [27, 38]) GL.box(I(wx(u), Y0 + WH - 0.08, wz(v), 0.5, 0.1, 1.6), H('#c8d6ff'));
    // ----- ESCRITÓRIO (u7..25, v38..48) -----
    S.box(I(wx(16), Y0 + 0.55, wz(42.6), 9.0, 1.1, 1.8), H('#3a444b')); S.box(I(wx(16), Y0 + 1.12, wz(42.6), 9.2, 0.07, 1.95), H('#56626b')); col(11.4, 41.7, 20.6, 43.5);
    S.box(I(wx(14.3), Y0 + 1.6, wz(42.5), 1.2, 0.9, 0.9), H('#0a0d0e')); GL.box(I(wx(14.3), Y0 + 1.65, wz(42.04), 0.95, 0.65, 0.04), H('#2f7a52')); // monitor
    S.box(I(wx(17.7), Y0 + 1.58, wz(42.5), 1.1, 0.9, 0.9), H('#0a0d0e')); GL.box(I(wx(17.7), Y0 + 1.62, wz(42.04), 0.9, 0.6, 0.04), H('#7a2f2f'));
    S.cyl(I(wx(19.3), Y0 + 1.16, wz(42.3), 0.5, 0.06, 0.5), 12, 1, 1, H('#141719'), true, true); S.cyl(I(wx(19.3), Y0 + 1.2, wz(42.3), 0.12, 0.45, 0.12), 6, 1, 1, H('#141719'), true, true);
    for (let b = 0; b < 4; b++) S.box(I(wx(19.3), Y0 + 1.75, wz(42.1), 0.9, 0.08, 0.03, b * M.PI / 4), H('#1d2124')); // ventilador (aros)
    S.cyl(I(wx(12.6), Y0 + 1.16, wz(42.2), 0.16, 0.34, 0.16), 8, 1, 1, H('#cc3a2a'), true, true); S.cyl(I(wx(12.6), Y0 + 1.24, wz(42.2), 0.17, 0.12, 0.17), 8, 1, 1, H('#f2f2e6'), true, true);
    for (let i = 0; i < 3; i++) S.sphere(I(wx(13.4 + i * 0.35), Y0 + 1.2, wz(42.9), 0.14, 0.1, 0.14), 6, 5, H('#c8c0b0')); // papéis amassados
    // poster e desenhos na parede norte
    S.box(I(wx(16), Y0 + 2.3, wz(38.3), 7.0, 2.3, 0.08), H('#7a5a2e'));
    for (let i = 0; i < 3; i++) { const u = 13.6 + i * 2.4; S.sphere(I(wx(u), Y0 + 2.0, wz(38.36), 0.5, 0.55, 0.12), 8, 6, [H('#6a3b22'), H('#5a2e6a'), H('#6a5a22')][i]); S.sphere(I(wx(u), Y0 + 2.75, wz(38.36), 0.32, 0.34, 0.12), 8, 6, [H('#7a4a2a'), H('#6a3a7a'), H('#7a6a2a')][i]); GL.sphere(I(wx(u - 0.1), Y0 + 2.8, wz(38.44), 0.05, 0.05, 0.03), 5, 4, H('#e8d8b0')); GL.sphere(I(wx(u + 0.1), Y0 + 2.8, wz(38.44), 0.05, 0.05, 0.03), 5, 4, H('#e8d8b0')); }
    for (let i = 0; i < 8; i++) GL.box(I(wx(12.6 + i * 0.62), Y0 + 3.55, wz(38.4), 0.5, 0.42, 0.03), [H('#ffd45a'), H('#ff8a5a')][i % 2]); // letreiro de festa
    for (let i = 0; i < 6; i++) S.box(I(wx(9 + (i % 3) * 1.1 + (i > 2 ? 12.5 : 0), Y0 + 1.8 + Math.floor(i / 3) * 0.7 + 0), wz(38.3), 0.8, 0.55, 0.04), [H('#e8a1c8'), H('#a1d6e8'), H('#e8d6a1')][i % 3]);
    // luminária sobre a mesa
    S.cyl(I(wx(16), Y0 + 3.2, wz(41), 0.03, 1.0, 0.03), 4, 1, 1, H('#111'), false, false); S.cone(I(wx(16), Y0 + 3.0, wz(41), 1.2, 0.35, 1.2), 12, 0.5, H('#3a2a1a'), false); GL.sphere(I(wx(16), Y0 + 2.9, wz(41), 0.16, 0.16, 0.16), 8, 6, H('#ffcf80'));
    GL.box(I(wx(16), Y0 + 0.02, wz(41.5), 6, 0.01, 3), H('#2a1c10')); // mancha de luz na mesa
    // painéis PORTA / LUZ ao lado de cada porta do escritório
    for (const [u, sd] of [[7.4, 1], [24.6, -1]]) {
      S.box(I(wx(u), Y0 + 1.5, wz(41.0), 0.2, 1.1, 0.5), H('#14100f'));
      GL.box(I(wx(u + sd * 0.12), Y0 + 1.75, wz(41.0), 0.04, 0.34, 0.3), H('#e22a1e')); GL.box(I(wx(u + sd * 0.12), Y0 + 1.3, wz(41.0), 0.04, 0.34, 0.3), H('#dfe6ee'));
    }
    // portas de aço abertas (recolhidas) — só o batente
    for (const u of [7, 25]) { S.box(I(wx(u), Y0 + 1.35, wz(42), 0.7, 2.7, 0.18), C.dsteel); S.box(I(wx(u), Y0 + 1.35, wz(44.6), 0.7, 2.7, 0.18), C.dsteel); }
    GL.box(I(wx(16), Y0 + WH - 0.08, wz(43), 1.0, 0.1, 0.5), H('#ffcf80'));
    // placa de saída
    S.box(I(wx(16), Y0 + 2.0, wz(47.7), 2.2, 0.7, 0.1), H('#1c1210')); GL.box(I(wx(16), Y0 + 2.0, wz(47.6), 1.6, 0.3, 0.04), H('#7aff9a'));
    for (let i = 0; i < 2; i++) { const DM = new gfx.MB(0.03), u = DOOR_U[i]; DM.box(I(wx(u), Y0 + 1.35, wz(DOOR_V), 2.0, 2.7, 0.16), C.dsteel); DM.box(I(wx(u), Y0 + 2.2, wz(DOOR_V), 1.7, 0.2, 0.18), C.hz); for (let k = 0; k < 4; k++) DM.box(I(wx(u - 0.7 + k * 0.47), Y0 + 0.1, wz(DOOR_V), 0.22, 0.2, 0.2), C.yel); doorMesh[i] = DM.build(); }
    solid = S.build(); glow = GL.build();
    W.objs.push({ id: 'fnexit', kind: 'fnexit', x: wx(16), z: wz(46.7), y: Y0, rr: 2.4 });
  }

  /* ---------- animatronics ---------- */
  const SPEC = [
    { n: 'Urso Mofo', fur: '#6b4226', belly: '#c99a6b', acc: '#e8c34d', kind: 'bear' },
    { n: 'Coelha Vela', fur: '#1d3b8f', belly: '#8fb3ff', acc: '#ffd23a', kind: 'rabbit' },
    { n: 'Pata Confete', fur: '#ff8a1a', belly: '#ffe0a8', acc: '#ffa51f', kind: 'duck' },
    { n: 'Raposa Brasa', fur: '#ff5a14', belly: '#fff2e2', acc: '#2b1a14', kind: 'fox' },
  ];
  const CR = [];
  function buildCr(sp) {
    const B = new gfx.MB(0.03), E = new gfx.MB(0), A = new gfx.MB(0.03), A2 = new gfx.MB(0.03), L1 = new gfx.MB(0.03), L2 = new gfx.MB(0.03);
    const fur = H(sp.fur), bel = H(sp.belly), acc = H(sp.acc), dark = H('#0a0808'), tooth = H('#ece4cf'), metal = H('#2a2c30');
    B.box(I(0, 1.45, 0, 1.0, 1.0, 0.62), fur); B.box(I(0, 1.35, 0.32, 0.7, 0.75, 0.06), bel); B.box(I(0, 0.88, 0, 0.82, 0.4, 0.52), metal);
    B.cyl(I(0, 1.9, 0, 0.3, 0.3, 0.3), 8, 1, 1, metal, true, true);
    B.sphere(I(0, 2.38, 0.02, 0.46, 0.42, 0.42), 10, 8, fur);
    const k = sp.kind;
    if (k === 'bear') { B.sphere(I(-0.34, 2.72, 0, 0.17, 0.17, 0.1), 8, 6, fur); B.sphere(I(0.34, 2.72, 0, 0.17, 0.17, 0.1), 8, 6, fur); B.sphere(I(0, 2.25, 0.4, 0.26, 0.2, 0.2), 8, 6, bel); B.cone(I(0.08, 2.72, 0.02, 0.34, 0.5, 0.34), 8, 0.5, acc, true); }
    if (k === 'rabbit') { B.box(I(-0.18, 3.1, 0, 0.16, 0.95, 0.09), fur); B.box(I(0.2, 3.02, 0, 0.16, 0.8, 0.09), fur); B.box(I(-0.18, 3.1, 0.05, 0.07, 0.8, 0.02), H('#c98aa8')); B.sphere(I(0, 2.25, 0.38, 0.22, 0.16, 0.18), 8, 6, bel); B.box(I(0, 1.95, 0.34, 0.3, 0.1, 0.06), acc); }
    if (k === 'duck') { B.box(I(0, 2.26, 0.5, 0.5, 0.11, 0.5), acc); B.box(I(0, 2.15, 0.48, 0.44, 0.08, 0.42), H('#e0821a')); B.sphere(I(0, 2.82, 0.0, 0.1, 0.16, 0.1), 6, 5, bel); B.sphere(I(0.07, 2.88, 0.05, 0.07, 0.12, 0.07), 6, 5, bel); B.box(I(0, 1.5, 0.36, 0.7, 0.8, 0.05), bel); B.box(I(0, 2.0, 0.34, 0.34, 0.12, 0.06), acc); }
    if (k === 'fox') {
      B.box(I(0, 2.2, 0.52, 0.2, 0.18, 0.6), fur); B.box(I(0, 2.12, 0.5, 0.17, 0.06, 0.5), bel); B.sphere(I(0, 2.26, 0.86, 0.07, 0.06, 0.06), 6, 5, dark);
      B.cone(I(-0.27, 2.78, -0.02, 0.26, 0.58, 0.14), 4, 0.5, fur, false); B.cone(I(0.27, 2.78, -0.02, 0.26, 0.58, 0.14), 4, 0.5, fur, false);
      B.cone(I(-0.27, 2.78, 0.04, 0.14, 0.38, 0.08), 4, 0.5, acc, false); B.cone(I(0.27, 2.78, 0.04, 0.14, 0.38, 0.08), 4, 0.5, acc, false);
      B.sphere(I(-0.3, 2.28, 0.3, 0.12, 0.1, 0.12), 6, 5, bel); B.sphere(I(0.3, 2.28, 0.3, 0.12, 0.1, 0.12), 6, 5, bel);
      B.cone(M.trs(new Float32Array(16), 0, 1.0, -0.38, -1.15, 0, 0, 0.6, 1.25, 0.6), 8, 0.5, fur, true); B.sphere(I(0, 0.62, -0.92, 0.2, 0.2, 0.2), 6, 5, H('#fff6ea'));
      B.box(I(0, 1.55, 0.33, 0.62, 0.8, 0.05), bel);
    }
    for (let i = -2; i <= 2; i++) B.box(I(i * 0.075, (k === 'fox') ? 2.12 : 2.1, (k === 'fox') ? 0.72 : 0.45, 0.05, 0.08, 0.03), tooth);
    B.box(I(0, (k === 'fox') ? 2.13 : 2.1, (k === 'fox') ? 0.5 : 0.4, (k === 'fox') ? 0.22 : 0.3, 0.07, 0.1), dark);
    for (const s of [-1, 1]) { E.sphere(I(s * 0.17, 2.46, 0.38, 0.1, 0.1, 0.07), 8, 6, H('#fff6d0')); B.sphere(I(s * 0.17, 2.46, 0.44, 0.04, 0.04, 0.03), 6, 5, dark); }
    A.box(I(0, -0.5, 0, 0.22, 1.0, 0.22), fur); A.sphere(I(0, -1.05, 0, 0.14, 0.14, 0.14), 6, 5, bel); A2.box(I(0, -0.5, 0, 0.22, 1.0, 0.22), fur); A2.sphere(I(0, -1.05, 0, 0.14, 0.14, 0.14), 6, 5, bel);
    L1.box(I(0, -0.45, 0, 0.3, 0.9, 0.3), fur); L1.box(I(0, -0.88, 0.1, 0.34, 0.1, 0.5), metal); L2.box(I(0, -0.45, 0, 0.3, 0.9, 0.3), fur); L2.box(I(0, -0.88, 0.1, 0.34, 0.1, 0.5), metal);
    return { body: B.build(), eyes: E.build(), armL: A.build(), armR: A2.build(), legL: L1.build(), legR: L2.build() };
  }
  const tmpA = new Float32Array(16), tmpB = new Float32Array(16);
  function drawCr(c, x, y, z, yaw, t, sc, move) {
    const base = M.T(x, y, z, sc, sc, sc, yaw), o = { outline: 0 };
    gfx.draw(c.body, base, o); gfx.draw(c.eyes, base, { emis: 1, outline: 0 });
    const sw = move ? Math.sin(t * 6.5) * 0.7 : Math.sin(t * 1.3) * 0.05;
    const part = (mesh, px, py, rx) => { M.trs(tmpA, px, py, 0, rx, 0, 0, 1, 1, 1); M.mul(tmpB, base, tmpA); gfx.draw(mesh, tmpB.slice(), o); };
    part(c.armL, -0.62, 1.9, sw); part(c.armR, 0.62, 1.9, -sw); part(c.legL, -0.24, 0.9, -sw); part(c.legR, 0.24, 0.9, sw);
  }

  /* ---------- grafo de patrulha ---------- */
  const NODE = [[16, 3.5, 0.8], [4.5, 6], [6, 12], [16, 13], [27, 12], [16, 19], [38, 6], [38, 20], [5, 24], [5, 19], [5, 34], [5, 43.3], [8.5, 43.3], [27, 19], [27, 26], [27, 34], [27, 43.3], [23.5, 43.3], [16, 24], [16, 30], [36, 40], [27, 37.5], [5, 29.5], [8.5, 29.5], [31, 5.5], [31, 16.5], [23.5, 29.5], [27, 29.5], [16, 43.8]];
  const EDGE = [[0, 3], [1, 2], [2, 3], [3, 4], [3, 5], [4, 24], [24, 6], [4, 25], [25, 7], [2, 9], [9, 8], [8, 22], [22, 10], [10, 11], [11, 12], [12, 28], [28, 16], [5, 9], [5, 13], [13, 14], [14, 27], [27, 15], [15, 16], [16, 17], [17, 28], [15, 21], [21, 20], [5, 18], [18, 19], [19, 23], [23, 22], [19, 26], [26, 27], [4, 13]];
  const ADJ = NODE.map(() => []); EDGE.forEach(([a, b]) => { ADJ[a].push(b); ADJ[b].push(a); });
  const OFFICE = 28;
  // as portas de aço ficam nas arestas 11–12 (porta esquerda) e 16–17 (porta direita): fechadas, nenhuma criatura as atravessa
  const doorBlocks = (a, b) => (((a === 11 && b === 12) || (a === 12 && b === 11)) && Pz.doors[0]) || (((a === 16 && b === 17) || (a === 17 && b === 16)) && Pz.doors[1]);
  function bfsFrom(src) { const d = NODE.map(() => 1e9), pr = NODE.map(() => -1); d[src] = 0; const q = [src]; while (q.length) { const a = q.shift(); for (const b of ADJ[a]) if (!doorBlocks(a, b) && d[b] > d[a] + 1) { d[b] = d[a] + 1; pr[b] = a; q.push(b); } } return { d, pr }; }
  const TO_OFFICE = bfsFrom(OFFICE).d;
  const hash = (a, b, c) => { let h = (Math.imul(a + 1, 374761393) ^ Math.imul(b + 7, 668265263) ^ Math.imul(c + 13, 2147483647)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return (h ^ (h >>> 16)) / 4294967296; };
  const STEP = [5.4, 6.0, 5.0, 6.6];
  const state = [0, 1, 2, 3].map((i) => ({ i, mode: i === 3 ? 'idle' : 'patrol', base: 0, wt: 0, pi: 0, path: null, nextRun: 0, after: 'patrol', step: 0, node: [0, 0, 0, 1][i], prev: [0, 0, 0, 1][i], chase: false, x: 0, z: 0, y: 0, yaw: 0, move: false, lastSeen: 0, path: null, freeze: 0 }));
  const hourOf = () => Math.min(5, Math.floor((Date.now() - Pz.t0) / 1000 / 40));
  function patrolAt(c, T) {
    const dur = STEP[c.i] * (1 - 0.06 * hourOf()) / (Pz.out ? 1.5 : 1), s = Math.floor(T / dur);
    while (c.step < s) { // avança o passeio aleatório determinístico
      c.step++; const cur = c.node; let nb = ADJ[cur].filter((n) => n !== c.prev && !doorBlocks(cur, n)); if (!nb.length) nb = ADJ[cur].filter((n) => !doorBlocks(cur, n)); if (!nb.length) nb = [cur]; c.prev = cur;
      const bias = 0.18 + 0.1 * hourOf(); let nx;
      if (hash(c.i, c.step, 5) < bias) { nx = nb.slice().sort((a, b) => TO_OFFICE[a] - TO_OFFICE[b])[0]; } else nx = nb[Math.floor(hash(c.i, c.step, 9) * nb.length)];
      c.node = nx == null ? cur : nx;
    }
    const f = (T - s * dur) / dur, k = M.sstep(0.18, 0.95, f), A = NODE[c.prev], B = NODE[c.node];
    c.move = f > 0.18 && f < 0.95 && c.prev !== c.node;
    const ox = (n) => (n === 0 ? (c.i - 1) * 3.2 : 0), ax = A[0] + ox(c.prev), bx = B[0] + ox(c.node);
    return [wx(M.lerp(ax, bx, k)), wz(M.lerp(A[1], B[1], k)), Y0 + M.lerp(A[2] || 0, B[2] || 0, k), Math.atan2(bx - ax, B[1] - A[1])];
  }
  let lastSafe = null;
  // caminho que ignora portas (usado pela Raposa ao correr até o escritório)
  function pathFree(a, b) { const d = NODE.map(() => 1e9), pr = NODE.map(() => -1); d[a] = 0; const q = [a]; while (q.length) { const x = q.shift(); for (const y of ADJ[x]) if (d[y] > d[x] + 1) { d[y] = d[x] + 1; pr[y] = x; q.push(y); } } const p = [b]; let c = b; while (pr[c] >= 0 && c !== a) { c = pr[c]; p.push(c); } return p.reverse(); }
  function stepTo(c, tx, tz, sp) { const dx = tx - c.x, dz = tz - c.z, l = Math.hypot(dx, dz); if (l <= sp) { c.x = tx; c.z = tz; return true; } c.x += dx / l * sp; c.z += dz / l * sp; c.yaw = Math.atan2(dx, dz); c.move = true; return false; }
  const doorNear = (c) => { for (let i = 0; i < 2; i++) if (Pz.doors[i] && Math.hypot(c.x - wx(DOOR_U[i]), c.z - wz(DOOR_V)) < 2.6 && c.z < wz(DOOR_V)) return i; return -1; };
  function clearLine(x0, z0, x1, z1) {
    for (let i = 0; i < 2; i++) if (Pz.doors[i]) { const dx = wx(DOOR_U[i]), dz = wz(DOOR_V); if ((x0 - dz) * (x1 - dz) < 0 && Math.abs(M.lerp(x0, x1, (dz - z0) / ((z1 - z0) || 1e-6)) - dx) < 1.2) return false; }
    const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.5));
    for (let i = 1; i < n; i++) { const x = M.lerp(x0, x1, i / n), z = M.lerp(z0, z1, i / n); for (const w of walls) if (x > w[0] && x < w[2] && z > w[1] && z < w[3]) return false; }
    return true;
  }
  const nearestNode = (x, z) => { let b = -1, bd = 1e9; for (let i = 0; i < NODE.length; i++) { const nx = wx(NODE[i][0]), nz = wz(NODE[i][1]), d = Math.hypot(nx - x, nz - z); if (d < bd && clearLine(x, z, nx, nz)) { bd = d; b = i; } } return b < 0 ? 0 : b; };
  function pathTo(a, b) { const r = bfsFrom(a), p = [b]; let c = b; while (r.pr[c] >= 0 && c !== a) { c = r.pr[c]; p.push(c); } return p.reverse(); }

  /* ---------- HUD e controles ---------- */
  const css = document.createElement('style');
  css.textContent = `#pz-hud{position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:44;color:#e8e0d0;font:700 14px ui-monospace,monospace;text-shadow:0 0 6px #000;display:none;text-align:center;pointer-events:none}
#pz-lamp{position:fixed;left:8px;bottom:92px;z-index:45;display:none;font:700 12px system-ui,sans-serif;color:#fff;background:rgba(60,40,10,.85);border:2px solid #b08a2a;border-radius:10px;padding:12px 10px;touch-action:none}
#pz-lamp.on{background:#b08a2a}
#pz-flash{position:fixed;inset:0;z-index:46;pointer-events:none;background:#000;opacity:0}`;
  document.head.appendChild(css);
  const hud = document.createElement('div'); hud.id = 'pz-hud'; document.body.appendChild(hud);
  const lampB = document.createElement('button'); lampB.id = 'pz-lamp'; lampB.type = 'button'; lampB.textContent = 'LANTERNA'; lampB.style.display = 'none'; document.body.appendChild(lampB);
  const flash = document.createElement('div'); flash.id = 'pz-flash'; document.body.appendChild(flash);
  const setLamp = () => { Pz.lamp = false; };
  lampB.addEventListener('pointerdown', (e) => { e.preventDefault(); setLamp(true); }); ['pointerup', 'pointercancel', 'pointerleave'].forEach((n) => lampB.addEventListener(n, () => setLamp(false)));

  /* ---------- entrar / sair ---------- */
  let ret = null;
  // câmeras: pontos fixos pela pizzaria (a tela mostra a criança/criatura naturalmente em 3D)
  const CAMS = [['PALCO', [16, 14], [16, 3]], ['SALÃO', [4, 16], [14, 12]], ['SALÃO DIR', [30, 16], [20, 12]], ['CORREDOR', [4, 33], [5, 25]], ['CORREDOR DIR', [26, 33], [26, 22]], ['COZINHA', [42, 20], [38, 6]], ['DEPÓSITO', [41, 33], [40, 44]], ['SALA DE FESTA', [9, 44], [16, 30]], ['ESCRITÓRIO', [20, 46], [14, 40]]];
  Pz.camOn = false; Pz.camIdx = 0; let camSaved = null;
  const ui = document.createElement('div'); ui.id = 'pz-ui';
  ui.innerHTML = '<div id="pz-cn"></div><div id="pz-cb"></div><div id="pz-bar"><button type="button" id="pz-cam">CÂMERAS</button><button type="button" id="pz-dl">PORTA ESQ</button><button type="button" id="pz-dr">PORTA DIR</button></div>';
  document.body.appendChild(ui);
  const cb = ui.querySelector('#pz-cb'), cn = ui.querySelector('#pz-cn'), bar = ui.querySelector('#pz-bar');
  CAMS.forEach((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = c[0]; b.addEventListener('click', () => { Pz.camIdx = i; }); cb.appendChild(b); });
  const back = document.createElement('button'); back.type = 'button'; back.textContent = 'VOLTAR'; back.addEventListener('click', () => camToggle(false)); cb.appendChild(back);
  function camToggle(on) { Pz.camOn = on; cb.style.display = on ? 'flex' : 'none'; cn.style.display = on ? 'block' : 'none'; if (on) camSaved = { x: G.player.x, z: G.player.z, yaw: G.cam.yaw }; else if (camSaved) { G.player.teleport(camSaved.x, camSaved.z, camSaved.yaw); camSaved = null; } }
  ui.querySelector('#pz-cam').addEventListener('click', () => { if (!Pz.out) camToggle(!Pz.camOn); });
  const doorBtn = (i, id) => ui.querySelector(id).addEventListener('click', () => { if (Pz.out) return; Pz.doors[i] = !Pz.doors[i]; ui.querySelector(id).classList.toggle('on', Pz.doors[i]); if (G.fnaf) G.fnaf.audio.slam(); });
  doorBtn(0, '#pz-dl'); doorBtn(1, '#pz-dr');
  Pz.preView = function () {
    if (!Pz.camOn || !Pz.inside) return; const c = CAMS[Pz.camIdx], C = G.cam;
    C.eye = [wx(c[1][0]), Y0 + 2.4, wz(c[1][1])]; C.target = [wx(c[2][0]), Y0 + 1.3, wz(c[2][1])];
    cn.textContent = 'CAM ' + (Pz.camIdx + 1) + ' · ' + c[0] + '   ' + (Math.floor(Date.now() / 500) % 2 ? '● REC' : '');
    cb.querySelectorAll('button').forEach((b, k) => b.classList.toggle('sel', k === Pz.camIdx));
  };
  const css2 = document.createElement('style');
  css2.textContent = `#pz-ui{position:fixed;inset:0;pointer-events:none;display:none;z-index:40}
#pz-bar{position:fixed;left:0;right:0;bottom:8px;display:flex;justify-content:center;gap:8px;pointer-events:auto}
#pz-bar button{font:700 13px system-ui,sans-serif;color:#fff;background:rgba(40,40,44,.9);border:2px solid #777;border-radius:9px;padding:10px 12px}
#pz-bar button.on{background:#b3261a;border-color:#ff8a7a}
#pz-cb{position:fixed;left:0;right:0;top:44px;display:none;flex-wrap:wrap;justify-content:center;gap:6px;pointer-events:auto}
#pz-cb button{font:700 12px ui-monospace,monospace;color:#fff;background:rgba(10,20,30,.85);border:1px solid #9fb6cc;border-radius:6px;padding:7px 9px}
#pz-cb button.sel{background:#2f7a52;border-color:#9affb8}
#pz-cn{position:fixed;left:10px;top:76px;display:none;color:#e8f0ff;font:700 14px ui-monospace,monospace;text-shadow:0 0 5px #000}`;
  document.head.appendChild(css2);
  Pz.enter = function (t0) {
    if (Pz.inside || !G.ui) return;
    G.ui.fade(() => {
      if (G.main.running) G.main.paused = false; // o menu de pausa deixava o jogo congelado
      const P = G.player; ret = { x: P.x, z: P.z }; Pz.active = true; Pz.inside = true; Pz.session = true; Pz.t0 = t0 || Date.now(); Pz.over = false; Pz.bat = 100; Pz.caught = 0; Pz.scare = null;
      state.forEach((c) => { c.step = 0; c.node = [0, 0, 0, 1][c.i]; c.prev = c.node; c.chase = false; c.freeze = 0; c.mode = c.i === 3 ? 'idle' : 'patrol'; c.base = 0; c.wt = 0; c.pi = 0; c.path = null; c.nextRun = 25 + Math.random() * 15; });
      Pz.power = 100; Pz.out = false;
      P.teleport(wx(16), wz(45.6), Math.PI); G.cam.yaw = Math.PI; G.cam.fpPitch = 0;
      if (G.fnaf) G.fnaf.audio.init();
      ui.style.display = 'block'; bar.style.display = 'flex'; hud.style.display = 'block'; G.ui.toast('FNAF: sobreviva até as 6 da manhã. Andar WASD · portas J/L · câmeras K');
    });
  };
  Pz.exit = function (silent) {
    if (!Pz.inside) return;
    G.ui.fade(() => {
      if (Pz.camOn) camToggle(false); Pz.doors = [false, false]; ui.style.display = 'none'; ui.querySelectorAll('#pz-dl,#pz-dr').forEach((b) => b.classList.remove('on')); Pz.inside = false; Pz.session = false; Pz.scare = null; setLamp(false); hud.style.display = 'none'; lampB.style.display = 'none'; flash.style.opacity = 0;
      const t = W.towns && W.towns[0], r = ret || (t ? { x: t.x, z: t.z } : { x: 90, z: 40 });
      G.player.teleport(r.x, r.z, 0); G.cam.yaw = 0; if (G.fnaf && G.fnaf.audio.off) G.fnaf.audio.off(); if (!silent && G.S) G.main.save();
      if (G.fnafOnly) G.main.toTitle(); else if (G.main.running) { G.main.paused = false; G.ui.menu(null); } else G.ui.menu('title');
    });
  };
  function finish() {
    if (Pz.over) return; Pz.over = true;
    try { const k = 'ew_fnafc_n'; if ((parseInt(localStorage.getItem(k), 10) || 1) < 2) localStorage.setItem(k, '2'); } catch (e) { /* sem storage */ } // passou na Noite 1: libera o multiplayer
    G.ui.banner && G.ui.banner('06:00 AM', 'Você sobreviveu à noite no FNAF');
    if (G.fnaf && G.fnaf.audio.bell) G.fnaf.audio.bell(3);
    if (G.fnaf) G.fnaf.report(true, Pz.caught);
    setTimeout(() => Pz.exit(), 3500);
  }

  /* ---------- por quadro ---------- */
  Pz.update = function (dt) {
    const P = G.player; Pz.active = true; const was = Pz.inside; Pz.inside = inBox(P.x, P.z);
    if (Pz.inside && !Pz.session) { Pz.inside = false; const t = W.towns && W.towns[0]; P.teleport(t ? t.x : 90, t ? t.z : 40, 0); return; } // salvo dentro: volta para fora
    if (!Pz.inside) { Pz.inside = false; if (was) { hud.style.display = 'none'; lampB.style.display = 'none'; } return; }
    if (Pz.camOn) { P.vx = P.vz = 0; if (camSaved) { P.x = camSaved.x; P.z = camSaved.z; } }
    for (let i = 0; i < 2; i++) if (Pz.doors[i] && Math.abs(P.x - wx(DOOR_U[i])) < 1.2 && Math.abs(P.z - wz(DOOR_V)) < 1.1 && lastSafe) { P.x = lastSafe[0]; P.z = lastSafe[1]; }
    if (!Pz.camOn && !(Pz.doors[0] && Math.abs(P.x - wx(DOOR_U[0])) < 1.2 && Math.abs(P.z - wz(DOOR_V)) < 1.1)) lastSafe = [P.x, P.z];
    const T = (Date.now() - Pz.t0) / 1000, hour = hourOf();
    if (T >= 240) { finish(); }
    // bateria da lanterna
    if (Pz.lamp) { Pz.bat = Math.max(0, Pz.bat - dt * 6); if (Pz.bat <= 0) setLamp(false); } else Pz.bat = Math.min(100, Pz.bat + dt * 2.5);
    const sc = Pz.scare;
    if (sc) { sc.t += dt; P.stun = Math.max(P.stun || 0, 0.3); flash.style.opacity = sc.t < 0.1 ? 0 : (Math.random() < 0.3 ? 0.55 : 0.05); if (sc.t > 1.7) { Pz.scare = null; flash.style.opacity = 0; P.teleport(wx(16), wz(45.6), Math.PI); G.cam.yaw = Math.PI; state.forEach((c) => { c.chase = false; }); } hudText(T); return; }
    // energia: porta fechada e câmera gastam; sem energia, as portas abrem e tudo fica mais rápido
    const drain = 0.22 + 0.6 * (Pz.doors[0] ? 1 : 0) + 0.6 * (Pz.doors[1] ? 1 : 0) + (Pz.camOn ? 0.6 : 0);
    Pz.power = Math.max(0, Pz.power - drain * dt);
    if (!Pz.out && Pz.power <= 0) { Pz.out = true; Pz.doors = [false, false]; if (Pz.camOn) camToggle(false); if (G.ui) G.ui.toast('Sem energia: as portas abriram.'); if (G.fnaf) G.fnaf.audio.slam(); }
    const pw = (dt2) => (Pz.out ? 1.5 : 1) * dt2; // velocidade por quadro (sem energia, todos correm mais)
    const imm = G.horror && G.horror.isImmune && G.horror.isImmune();
    const fwdX = Math.sin(G.cam.yaw), fwdZ = Math.cos(G.cam.yaw);
    for (const c of state) {
      // porta fechada na frente: espera 3 s e volta para o palco
      if ((c.mode === 'patrol' || c.mode === 'run') && doorNear(c) >= 0) { c.mode = 'wait'; c.wt = 3; c.chase = false; }
      if (c.mode === 'wait') { c.wt -= dt; c.move = false; if (c.wt <= 0) { c.mode = 'return'; c.after = c.i === 3 ? 'idle' : 'patrol'; c.path = pathTo(nearestNode(c.x, c.z), 0); c.pi = 0; } }
      else if (c.mode === 'return') {
        const n = c.path[Math.min(c.pi, c.path.length - 1)];
        if (stepTo(c, wx(NODE[n][0]), wz(NODE[n][1]), 4.5 * pw(dt))) { c.pi++; if (c.pi >= c.path.length) { c.move = false; c.mode = c.after; c.base = T; c.step = 0; c.node = 0; c.prev = 0; c.nextRun = T + (25 + Math.random() * 15) * (1 - 0.1 * hourOf()); } }
      }
      else if (c.mode === 'idle') { // Raposa parada no palco, até decidir correr
        c.x = wx(NODE[0][0]) + (c.i - 1) * 3.2; c.z = wz(NODE[0][1]); c.y = Y0; c.yaw = 0; c.move = false;
        if (!imm && T >= c.nextRun) { c.mode = 'run'; c.path = pathFree(nearestNode(c.x, c.z), 28); c.pi = 0; }
      }
      else if (c.mode === 'run') { // corre com tudo até o escritório: feche a porta a tempo
        const n = c.path[Math.min(c.pi, c.path.length - 1)];
        if (stepTo(c, wx(NODE[n][0]), wz(NODE[n][1]), 9 * pw(dt))) { c.pi++; if (c.pi >= c.path.length) { c.mode = 'return'; c.after = 'idle'; c.path = pathTo(nearestNode(c.x, c.z), 0); c.pi = 0; } }
        c.y = Y0; c.move = true;
      }
      else { // patrulha (com perseguição)
        const pat = patrolAt(c, T - c.base);
        if (!c.chase) { c.x = pat[0]; c.z = pat[1]; c.y = pat[2]; c.yaw = pat[3]; }
        const dx = P.x - c.x, dz = P.z - c.z, d = Math.hypot(dx, dz);
        const seen = d < 11 && clearLine(c.x, c.z, P.x, P.z);
        const lit = Pz.lamp && d < 16 && (dx * fwdX + dz * fwdZ) / (d || 1) > 0.8 && seen;
        c.freeze = lit ? Math.min(1, c.freeze + dt * 3) : Math.max(0, c.freeze - dt * 1.5);
        if (!imm && !c.chase && seen && d < 9) { c.chase = true; c.lastSeen = T; }
        if (c.chase) {
          if (seen) c.lastSeen = T; else if (T - c.lastSeen > 5) { c.chase = false; continue; }
          const spd = (2.5 + 0.35 * hour) * pw(dt) * (1 - 0.8 * c.freeze);
          let tx, tz;
          if (seen && d < 12) { tx = P.x; tz = P.z; } else { const a = nearestNode(c.x, c.z), b = nearestNode(P.x, P.z), p = pathTo(a, b), n = p[Math.min(1, p.length - 1)]; tx = wx(NODE[n][0]); tz = wz(NODE[n][1]); }
          const l = Math.hypot(tx - c.x, tz - c.z) || 1; c.x += (tx - c.x) / l * spd; c.z += (tz - c.z) / l * spd; c.y = Y0; c.yaw = Math.atan2(tx - c.x, tz - c.z); c.move = true;
        }
      }
      // pega o jogador (patrulha e corrida); atrás de porta fechada não alcança
      const dx2 = P.x - c.x, dz2 = P.z - c.z, d2 = Math.hypot(dx2, dz2);
      if ((c.mode === 'patrol' || c.mode === 'run') && d2 < 1.15 && !imm && clearLine(c.x, c.z, P.x, P.z)) { Pz.scare = { i: c.i, t: 0 }; Pz.caught++; if (G.fnaf) G.fnaf.audio.scare(); G.cam.shake = 0.6; }
      if (d2 < 7 && G.fnaf && !c.snd) { c.snd = 1.2; G.fnaf.audio.step(0); } else if (c.snd) { c.snd -= dt; if (c.snd <= 0) c.snd = 0; }
    }
    hudText(T);
  };
  function hudText(T) { const h = Math.min(6, Math.floor(T / 40)), hh = h === 0 ? 12 : h; hud.textContent = hh + ' AM · ' + (Pz.out ? 'SEM ENERGIA' : 'ENERGIA ' + Math.ceil(Pz.power) + '%') + (Pz.caught ? ' · pego ' + Pz.caught + 'x' : ''); ui.querySelector('#pz-dl').classList.toggle('on', Pz.doors[0]); ui.querySelector('#pz-dr').classList.toggle('on', Pz.doors[1]); }
  Pz.light = function () {
    if (!Pz.inside) return;
    const e = gfx.env, L = Pz.lamp;
    if (Pz.out) { e.amb = [0.12, 0.1, 0.09]; e.sunCol = [0.05, 0.04, 0.04]; e.fogCol = [0.01, 0.008, 0.008]; e.fogNear = 3; e.fogFar = 14; e.top = e.hor = e.bot = [0.01, 0.008, 0.008]; e.stars = 0; return; }
    e.amb = L ? [0.95, 0.8, 0.66] : [0.62, 0.5, 0.42]; e.sunCol = [0.4, 0.33, 0.27]; e.fogCol = [0.03, 0.018, 0.018]; e.fogNear = L ? 14 : 6; e.fogFar = L ? 52 : 30;
    e.top = e.hor = e.bot = [0.02, 0.012, 0.012]; e.stars = 0;
  };
  Pz.draw = function () {
    const P = G.player; if (!solid || Math.abs(P.x - (PX + 22)) > 60 || Math.abs(P.z - (PZ + 24)) > 60) return;
    gfx.draw(solid, null, { outline: 0 }); gfx.draw(glow, null, { emis: 1 });
    if (!Pz.inside) return;
    for (let i = 0; i < 2; i++) if (Pz.doors[i] && doorMesh[i]) gfx.draw(doorMesh[i], null, { outline: 0 });
    const t = performance.now() / 1000;
    for (const c of state) { if (!CR[c.i]) CR[c.i] = buildCr(SPEC[c.i]); drawCr(CR[c.i], c.x, c.y || Y0, c.z, c.yaw, t + c.i, 1.15, c.move && !(Pz.scare)); }
    const sc = Pz.scare;
    if (sc) { // susto: a criatura aparece colada na sua cara
      const yaw = G.cam.yaw, cx = P.x + Math.sin(yaw) * 0.85, cz = P.z + Math.cos(yaw) * 0.85, sh = (Math.random() - 0.5) * 0.12;
      if (!CR[sc.i]) CR[sc.i] = buildCr(SPEC[sc.i]);
      drawCr(CR[sc.i], cx + sh, Y0 - 1.1, cz + sh, yaw + Math.PI, t * 3, 1.0, false);
    }
  };
  Pz.build = function () { build(); };
  const sb = G.structs.build;
  G.structs.build = async function (progress, tick) { await sb.call(this, progress, tick); Pz.build(); };
})();

(function () {
  // teclado para PC na pizzaria: J porta esquerda, L porta direita, K câmeras
  window.addEventListener('keydown', (e) => { if (!window.G || !G.pizza || !G.pizza.inside) return; const id = { j: 'pz-dl', l: 'pz-dr', k: 'pz-cam' }[e.key.toLowerCase()]; const b = id && document.getElementById(id); if (b) { b.click(); return; }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; const L = [...document.querySelectorAll('#pz-cb button')]; if (!G.pizza.camOn || !L.length) return; // setas trocam de câmera
    const i = Math.max(0, L.findIndex((x) => x.classList.contains('sel'))); L[(i + (e.key === 'ArrowRight' ? 1 : L.length - 1)) % L.length].click(); });
})();
