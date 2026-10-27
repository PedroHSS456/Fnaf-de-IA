'use strict';
/* Elemental World — terreno, regiões, consultas de altura/colisão, malhas por chunk e desenho do mundo */
(function () {
  const G = window.G; const M = G.M; const gfx = G.gfx;
  const W = (G.world = {});
  const SIZE = 640, CELL = 5, N = 128, CH = 16, NC = N / CH, CHS = CH * CELL;
  const SEA = 0, LAVA_Y = 2.0, CENTER = 320, ISLAND_R = 292;
  W.SIZE = SIZE; W.CELL = CELL; W.N = N; W.SEA = SEA; W.LAVA_Y = LAVA_Y; W.CENTER = CENTER; W.ISLAND_R = ISLAND_R;
  W.SEED = 20241014;

  W.REGIONS = {
    hub: { id: 'hub', nome: 'Campos do Encontro', cor: '#7fbf5a' },
    agua: { id: 'agua', nome: 'Tribos do Gelo', cor: '#8fd3ff' },
    fogo: { id: 'fogo', nome: 'Terras de Brasa', cor: '#ff7a3a' },
    terra: { id: 'terra', nome: 'Reino das Mesetas', cor: '#c89a5a' },
    ar: { id: 'ar', nome: 'Picos dos Ventos', cor: '#e8f2ff' },
  };
  /* cidades (posições fixas; o terreno é nivelado em volta) */
  W.towns = [
    { id: 'hub', nome: 'Vila Encruzilhada', x: 320, z: 320, R: 30, reg: 'hub' },
    { id: 'agua', nome: 'Marfrio', x: 320, z: 135, R: 30, reg: 'agua' },
    { id: 'fogo', nome: 'Brasaluz', x: 505, z: 320, R: 30, reg: 'fogo' },
    { id: 'terra', nome: 'Pedralta', x: 320, z: 505, R: 30, reg: 'terra' },
    { id: 'ar', nome: 'Altavento', x: 135, z: 320, R: 30, reg: 'ar' },
  ];
  /* arenas dos Mestres */
  W.arenas = [
    { id: 'fogo', x: 545, z: 232, R: 17 },
    { id: 'agua', x: 392, z: 92, R: 17 },
    { id: 'terra', x: 412, z: 566, R: 17 },
    { id: 'ar', x: 88, z: 238, R: 17 },
  ];

  /* ---------- regiões ---------- */
  const DIRS = { fogo: 0, terra: Math.PI / 2, ar: Math.PI, agua: -Math.PI / 2 };
  const KEYS = ['hub', 'agua', 'fogo', 'terra', 'ar'];
  function regionW(x, z, out) {
    const dx = x - CENTER, dz = z - CENTER, d = Math.hypot(dx, dz) || 0.001;
    const warp = (M.fbm(x * 0.008, z * 0.008, 5, 3) - 0.5) * 1.0;
    const ang = Math.atan2(dz, dx) + warp;
    const rad = M.sstep(48, 105, d);
    const o = out || {};
    let sum = 0;
    for (const k of ['agua', 'fogo', 'terra', 'ar']) {
      const c = Math.max(0, Math.cos(ang - DIRS[k]));
      const s = c * c * c * c * rad; o[k] = s; sum += s;
    }
    o.hub = 1 - rad; sum += o.hub;
    for (const k of KEYS) o[k] /= sum || 1;
    return o;
  }
  W.regionW = regionW;
  W.regionAt = function (x, z) {
    const w = regionW(x, z, {}); let b = 'hub', bv = -1;
    for (const k of KEYS) if (w[k] > bv) { bv = w[k]; b = k; }
    return b;
  };
  function ridged(x, y, s) { return 1 - Math.abs(2 * M.fbm(x, y, s, 4) - 1); }

  function lavaMaskAt(x, z, w) {
    if (w.fogo < 0.4) return 0;
    let lm = M.sstep(0.43, 0.31, M.fbm(x * 0.022, z * 0.022, 31, 3)) * M.sstep(0.4, 0.8, w.fogo);
    const vd = Math.hypot(x - 565, z - 320);
    lm = Math.max(lm, Math.exp(-(vd * vd) / (2 * 6.5 * 6.5)));
    // sem lava perto de cidade/arena/mar
    const t = W.towns[2]; const td = Math.hypot(x - t.x, z - t.z); lm *= M.sstep(52, 78, td);
    const a = W.arenas[0]; const ad = Math.hypot(x - a.x, z - a.z); lm *= M.sstep(26, 40, ad);
    const dc = Math.hypot(x - CENTER, z - CENTER); lm *= M.sstep(262, 236, dc);
    return lm;
  }
  W.lavaMaskAt = (x, z) => lavaMaskAt(x, z, regionW(x, z, {}));

  const _w = {};
  function rawH(x, z) {
    const w = regionW(x, z, _w);
    const dx = x - CENTER, dz = z - CENTER, d = Math.hypot(dx, dz);
    const f1 = M.fbm(x * 0.012, z * 0.012, 11, 4);
    let h = 0;
    h += w.hub * (4.2 + (f1 - 0.5) * 11);
    if (w.agua > 0.001) { const r = ridged(x * 0.02, z * 0.02, 21); h += w.agua * (2.4 + (f1 - 0.5) * 9 + r * r * 24 * M.sstep(110, 215, d)); }
    if (w.fogo > 0.001) {
      const vd = Math.hypot(x - 565, z - 320);
      const volc = 40 * Math.exp(-((vd / 46) * (vd / 46))) - 24 * Math.exp(-((vd / 10) * (vd / 10)));
      const r = ridged(x * 0.025, z * 0.025, 33);
      const lm = lavaMaskAt(x, z, w);
      h += w.fogo * (7 + (f1 - 0.5) * 12 + r * r * 8 + volc - lm * 13);
    }
    if (w.terra > 0.001) {
      const raw = 6 + (f1 - 0.5) * 36 + (M.fbm(x * 0.035, z * 0.035, 41, 3) - 0.5) * 5;
      const q = 4.5, k = Math.floor(raw / q), fr = raw / q - k;
      h += w.terra * ((k + M.sstep(0.6, 1.0, fr)) * q * 0.9 + 2);
    }
    if (w.ar > 0.001) { const r = ridged(x * 0.014, z * 0.014, 51); h += w.ar * (13 + (f1 - 0.5) * 14 + r * r * 28 * M.sstep(60, 165, d)); }
    h += (M.fbm(x * 0.08, z * 0.08, 7, 2) - 0.5) * 1.1;
    // costa: achata em direção à praia e então afunda
    h = M.lerp(h, 2.2, M.sstep(225, 270, d) * 0.85);
    h = M.lerp(h, -9, M.sstep(262, 300, d));
    return h;
  }
  W.rawH = rawH;
  function finalH(x, z) {
    let h = rawH(x, z);
    for (const t of W.towns) {
      const d = Math.hypot(x - t.x, z - t.z);
      if (d < t.R * 1.45) h = M.lerp(h, t.h, 1 - M.sstep(t.R * 0.72, t.R * 1.45, d));
    }
    for (const a of W.arenas) {
      const d = Math.hypot(x - a.x, z - a.z);
      if (d < a.R * 1.9) h = M.lerp(h, a.h, 1 - M.sstep(a.R * 0.8, a.R * 1.9, d));
    }
    return h;
  }

  /* ---------- grade de alturas ---------- */
  let H = null, COL = null;
  W.groundY = function (x, z) {
    if (!H) return 0;
    x = M.clamp(x, 0, SIZE - 0.001); z = M.clamp(z, 0, SIZE - 0.001);
    const gx = x / CELL, gz = z / CELL, i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
    const W1 = N + 1, h00 = H[j * W1 + i], h10 = H[j * W1 + i + 1], h01 = H[(j + 1) * W1 + i], h11 = H[(j + 1) * W1 + i + 1];
    if (fx + fz <= 1) return h00 + fz * (h01 - h00) + fx * (h10 - h00);
    return h10 + (1 - fx) * (h01 - h10) + (fx + fz - 1) * (h11 - h10);
  };
  W.waterDepth = (x, z) => Math.max(0, SEA - W.groundY(x, z));
  W.isLava = (x, z) => W.lavaMaskAt(x, z) > 0.28 && W.groundY(x, z) < LAVA_Y + 0.25;
  W.slopeAt = function (x, z) {
    const e = 1.2; const gx = W.groundY(x + e, z) - W.groundY(x - e, z), gz = W.groundY(x, z + e) - W.groundY(x, z - e);
    return Math.hypot(gx, gz) / (2 * e);
  };
  W.inBounds = (x, z) => Math.hypot(x - CENTER, z - CENTER) < ISLAND_R + 6;

  /* ---------- colisão ---------- */
  const hash = new Map();
  const KEY = (i, j) => (i + 60) * 1000 + (j + 60);
  W.dyn = []; // colisores dinâmicos {t:0,x,z,r,alive} ou {t:1,x0,z0,x1,z1,alive}
  function hput(c, x0, z0, x1, z1) {
    for (let i = Math.floor(x0 / 12); i <= Math.floor(x1 / 12); i++) for (let j = Math.floor(z0 / 12); j <= Math.floor(z1 / 12); j++) {
      const k = KEY(i, j); let a = hash.get(k); if (!a) { a = []; hash.set(k, a); } a.push(c);
    }
  }
  /* altura dos colisores: acima do topo dá para passar (voo/planador); sem altura = parede infinita (montanhas, catacumbas) */
  const HT = { tree: 12, prop: 3.5, house: 9, hs: 9, wall: 8, gate: 9 };
  const topOf = (x, z, tag, r) => { const h = tag === 'rock' ? 2.6 * (r || 1) + 1 : HT[tag]; if (h === undefined) return undefined; return (W.groundY ? W.groundY(x, z) || 0 : 0) + h; };
  W.addCircle = (x, z, r, tag) => { const c = { t: 0, x, z, r, tag, top: topOf(x, z, tag, r) }; hput(c, x - r, z - r, x + r, z + r); return c; };
  W.addBox = (x0, z0, x1, z1, tag) => { const c = { t: 1, x0, z0, x1, z1, tag, top: topOf((x0 + x1) / 2, (z0 + z1) / 2, tag, 1) }; hput(c, x0, z0, x1, z1); return c; };
  function pushC(c, p, r, y) {
    if (c.alive === false) return false;
    if (y !== undefined && c.top !== undefined && y > c.top) return false;
    if (c.t === 0) {
      const dx = p[0] - c.x, dz = p[1] - c.z, rr = r + c.r, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr) { const d = Math.sqrt(d2) || 0.0001, k = (rr - d) / d; if (d2 < 1e-8) { p[0] += rr; } else { p[0] += dx * k; p[1] += dz * k; } return true; }
      return false;
    }
    const qx = M.clamp(p[0], c.x0, c.x1), qz = M.clamp(p[1], c.z0, c.z1), dx = p[0] - qx, dz = p[1] - qz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; p[0] += dx * k; p[1] += dz * k; }
      else { // dentro: empurra para a borda mais próxima
        const l = p[0] - c.x0, rt = c.x1 - p[0], t = p[1] - c.z0, b = c.z1 - p[1], m = Math.min(l, rt, t, b);
        if (m === l) p[0] = c.x0 - r; else if (m === rt) p[0] = c.x1 + r; else if (m === t) p[1] = c.z0 - r; else p[1] = c.z1 + r;
      }
      return true;
    }
    return false;
  }
  /* p = [x,z] é alterado no lugar. retorna true se houve colisão */
  W.resolve = function (p, r, y) {
    let hit = false; const ci = Math.floor(p[0] / 12), cj = Math.floor(p[1] / 12);
    for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) {
      const a = hash.get(KEY(i, j)); if (!a) continue;
      for (let n = 0; n < a.length; n++) if (pushC(a[n], p, r, y)) hit = true;
    }
    for (let n = 0; n < W.dyn.length; n++) if (pushC(W.dyn[n], p, r)) hit = true;
    // limite da ilha
    const dx = p[0] - CENTER, dz = p[1] - CENTER, d = Math.hypot(dx, dz);
    if (d > ISLAND_R && !(W.freeZone && W.freeZone(p[0], p[1]))) { const k = ISLAND_R / d; p[0] = CENTER + dx * k; p[1] = CENTER + dz * k; hit = true; }
    return hit;
  };
  /* colisão simples de raio (para projéteis): existe colisor sólido em (x,z)? */
  W.solidAt = function (x, z, r) { const p = [x, z]; const hit = W.resolve(p, r || 0.05); return hit && (Math.abs(p[0] - x) + Math.abs(p[1] - z) > 1e-4); };

  /* ---------- armazenamento de chunks ---------- */
  W.chunks = [];
  W.props = []; // árvores e rochas estáticas (para fogo, consulta etc.)
  const propHash = new Map();
  W.addProp = function (p) { W.props.push(p); const k = KEY(Math.floor(p.x / 20), Math.floor(p.z / 20)); let a = propHash.get(k); if (!a) { a = []; propHash.set(k, a); } a.push(p); return p; };
  W.propsNear = function (x, z, r, filter) {
    const out = []; const i0 = Math.floor((x - r) / 20), i1 = Math.floor((x + r) / 20), j0 = Math.floor((z - r) / 20), j1 = Math.floor((z + r) / 20);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const a = propHash.get(KEY(i, j)); if (!a) continue; for (const p of a) { if ((p.x - x) * (p.x - x) + (p.z - z) * (p.z - z) <= r * r && (!filter || filter(p))) out.push(p); } }
    return out;
  };
  function chunkAt(x, z) {
    const cx = M.clamp(Math.floor(x / CHS), 0, NC - 1), cz = M.clamp(Math.floor(z / CHS), 0, NC - 1);
    return W.chunks[cz * NC + cx];
  }
  W.mbSolid = (x, z) => chunkAt(x, z).solid;
  W.mbGlow = (x, z) => chunkAt(x, z).glow;

  /* ---------- paletas ---------- */
  const C = {
    grass: M.hex('#5fa046'), grass2: M.hex('#4c8f3c'), snow: M.hex('#eef4ff'), ice: M.hex('#b4d9f2'),
    ash: M.hex('#3c3634'), fireRock: M.hex('#7c3a22'), obs: M.hex('#1d181c'),
    ochre: M.hex('#c48a4c'), brown: M.hex('#8f6240'), earthGreen: M.hex('#86993f'),
    airGrass: M.hex('#7fb86a'), rock: M.hex('#8e8f98'), sand: M.hex('#e0cc8e'), seabed: M.hex('#6f8a7c'), dirt: M.hex('#a08060'),
    rockAgua: M.hex('#8c98ad'), rockFogo: M.hex('#2c2626'), rockTerra: M.hex('#a8714a'), rockAr: M.hex('#8d8d99'), rockHub: M.hex('#80745f'),
  };
  W.PAL = C;

  const _tmp = {};
  function vertColor(x, z, h, w, lm, noise) {
    const n2 = noise; // 0..1
    let c0 = 0, c1 = 0, c2 = 0;
    const add = (col, k) => { c0 += col[0] * k; c1 += col[1] * k; c2 += col[2] * k; };
    if (w.hub > 0.001) add(M.mixc(C.grass, C.grass2, n2), w.hub);
    if (w.agua > 0.001) { const nearW = M.sstep(1.6, 0.2, h); add(M.mixc(C.snow, C.ice, Math.max(nearW, n2 * 0.18)), w.agua); }
    if (w.fogo > 0.001) {
      let c = M.mixc(C.ash, C.fireRock, M.sstep(0.35, 0.75, n2) * 0.7);
      c = M.mixc(c, C.obs, M.sstep(0.05, 0.6, lm));
      add(c, w.fogo);
    }
    if (w.terra > 0.001) { let c = M.mixc(C.ochre, C.brown, 0.5 + 0.5 * Math.sin(h * 1.1) * 0.6 + (n2 - 0.5) * 0.4); c = M.mixc(c, C.earthGreen, M.sstep(0.68, 0.85, n2) * 0.55); add(c, w.terra); }
    if (w.ar > 0.001) { let c = M.mixc(C.airGrass, C.rock, M.sstep(26, 40, h)); c = M.mixc(c, C.snow, M.sstep(46, 56, h)); add(c, w.ar); }
    let col = [c0, c1, c2];
    // praia / fundo do mar
    if (h < 1.5) {
      const sandMix = M.sstep(1.5, 0.5, h);
      const beach = w.agua > 0.5 ? M.mixc(C.snow, C.ice, 0.5) : C.sand;
      col = M.mixc(col, beach, sandMix * (1 - M.sstep(-0.4, -1.5, h)));
      if (h < 0) col = M.mixc(col, M.mixc(C.sand, C.seabed, M.sstep(0, 5, -h)), M.sstep(-0.2, -1.2, h) * 0.9);
    }
    return col;
  }

  /* caminhos entre cidades */
  const PATHS = [];
  function pathDist(x, z) {
    let best = 99;
    for (const p of PATHS) {
      const vx = p[2] - p[0], vz = p[3] - p[1], l2 = vx * vx + vz * vz;
      const t = M.clamp(((x - p[0]) * vx + (z - p[1]) * vz) / l2, 0, 1);
      const wob = Math.sin(t * 17 + p[0]) * 3.5; // curva leve
      const nx = -vz / Math.sqrt(l2), nz = vx / Math.sqrt(l2);
      const px = p[0] + vx * t + nx * wob * Math.sin(t * Math.PI), pz = p[1] + vz * t + nz * wob * Math.sin(t * Math.PI);
      const d = Math.hypot(x - px, z - pz); if (d < best) best = d;
    }
    return best;
  }
  W.pathDist = pathDist;

  /* ---------- geração ---------- */
  const tick = () => new Promise((r) => setTimeout(r, 0));
  W.ready = false;
  W.build = async function (progress) {
    progress = progress || (() => {});
    const W1 = N + 1;
    progress(0.02, 'Moldando a terra…');
    // alturas dos centros das cidades/arenas
    for (const t of W.towns) { t.h = Math.max(3.4, rawH(t.x, t.z)); }
    for (const a of W.arenas) { a.h = Math.max(3.2, rawH(a.x, a.z)); }
    for (let i = 1; i < W.towns.length; i++) PATHS.push([W.towns[0].x, W.towns[0].z, W.towns[i].x, W.towns[i].z]);
    for (let i = 0; i < 4; i++) { const t = W.towns[i + 1], a = W.arenas.find((q) => q.id === t.id); PATHS.push([t.x, t.z, a.x, a.z]); }
    H = new Float32Array(W1 * W1);
    for (let j = 0; j < W1; j++) {
      for (let i = 0; i < W1; i++) H[j * W1 + i] = finalH(i * CELL, j * CELL);
      if (j % 16 === 0) { progress(0.02 + 0.2 * (j / W1), 'Moldando a terra…'); await tick(); }
    }
    progress(0.24, 'Pintando regiões…');
    await tick();
    COL = new Float32Array(W1 * W1 * 3);
    const w = {};
    for (let j = 0; j < W1; j++) for (let i = 0; i < W1; i++) {
      const x = i * CELL, z = j * CELL, h = H[j * W1 + i];
      regionW(x, z, w);
      const lm = lavaMaskAt(x, z, w);
      const n2 = M.fbm(x * 0.05, z * 0.05, 3, 3);
      let c = vertColor(x, z, h, w, lm, n2);
      const pd = pathDist(x, z);
      if (pd < 2.6 && h > 0.4) c = M.mixc(c, w.agua > 0.5 ? M.mixc(C.snow, C.dirt, 0.4) : C.dirt, M.sstep(2.6, 1.2, pd) * 0.85);
      for (const t of W.towns) { const d = Math.hypot(x - t.x, z - t.z); if (d < t.R * 0.62) c = M.mixc(c, plazaColor(t.reg), M.sstep(t.R * 0.62, t.R * 0.35, d) * 0.8); }
      for (const a of W.arenas) { const d = Math.hypot(x - a.x, z - a.z); if (d < a.R) c = M.mixc(c, M.mixc(C.rock, plazaColor(a.id), 0.4), M.sstep(a.R, a.R * 0.7, d)); }
      const o = (j * W1 + i) * 3; COL[o] = c[0]; COL[o + 1] = c[1]; COL[o + 2] = c[2];
    }
    // chunks vazios
    for (let cz = 0; cz < NC; cz++) for (let cx = 0; cx < NC; cx++) {
      W.chunks.push({ cx, cz, x: cx * CHS, z: cz * CHS, solid: new gfx.MB(0.05), glow: new gfx.MB(0), terrain: null, mSolid: null, mGlow: null, water: null, lava: null });
    }
    progress(0.3, 'Erguendo cidades e templos…');
    await tick();
    if (G.structs) await G.structs.build(progress, tick);
    progress(0.86, 'Construindo malhas…');
    await tick();
    for (const ch of W.chunks) {
      buildTerrainMesh(ch);
      if (!ch.solid.empty) ch.mSolid = ch.solid.build();
      if (!ch.glow.empty) ch.mGlow = ch.glow.build();
      buildLiquid(ch);
      ch.solid = null; ch.glow = null;
      if (ch.cz % 2 === 0 && ch.cx === 0) { progress(0.86 + 0.13 * (ch.cz / NC), 'Construindo malhas…'); await tick(); }
    }
    W.ready = true;
    progress(1, 'Pronto');
  };
  function plazaColor(reg) {
    return { hub: M.hex('#b9a37c'), agua: M.hex('#cfe4f2'), fogo: M.hex('#4b3a36'), terra: M.hex('#c9a46f'), ar: M.hex('#e6dcc0') }[reg] || C.dirt;
  }
  W.plazaColor = plazaColor;

  function buildTerrainMesh(ch) {
    const mb = new gfx.MB(0.04), W1 = N + 1;
    const i0 = ch.cx * CH, j0 = ch.cz * CH;
    const hAt = (i, j) => H[j * W1 + i];
    const cAt = (i, j) => [COL[(j * W1 + i) * 3], COL[(j * W1 + i) * 3 + 1], COL[(j * W1 + i) * 3 + 2]];
    const w = {};
    for (let j = j0; j < j0 + CH; j++) for (let i = i0; i < i0 + CH; i++) {
      const x0 = i * CELL, z0 = j * CELL, x1 = x0 + CELL, z1 = z0 + CELL;
      const h00 = hAt(i, j), h10 = hAt(i + 1, j), h01 = hAt(i, j + 1), h11 = hAt(i + 1, j + 1);
      const c00 = cAt(i, j), c10 = cAt(i + 1, j), c01 = cAt(i, j + 1), c11 = cAt(i + 1, j + 1);
      const tris = [
        [x0, h00, z0, x0, h01, z1, x1, h10, z0, c00, c01, c10],
        [x1, h10, z0, x0, h01, z1, x1, h11, z1, c10, c01, c11],
      ];
      for (const t of tris) {
        let col = [(t[9][0] + t[10][0] + t[11][0]) / 3, (t[9][1] + t[10][1] + t[11][1]) / 3, (t[9][2] + t[10][2] + t[11][2]) / 3];
        // inclinação da face
        const ux = t[3] - t[0], uy = t[4] - t[1], uz = t[5] - t[2], vx = t[6] - t[0], vy = t[7] - t[1], vz = t[8] - t[2];
        let ny = uz * vx - ux * vz; const nx = uy * vz - uz * vy, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; ny /= l;
        const cxm = (t[0] + t[3] + t[6]) / 3, czm = (t[2] + t[5] + t[8]) / 3, hm = (t[1] + t[4] + t[7]) / 3;
        if (ny < 0.82 && hm > 0.2) {
          regionW(cxm, czm, w);
          const rc = [0, 0, 0]; for (const k of KEYS) { const cc = { hub: C.rockHub, agua: C.rockAgua, fogo: C.rockFogo, terra: C.rockTerra, ar: C.rockAr }[k]; rc[0] += cc[0] * w[k]; rc[1] += cc[1] * w[k]; rc[2] += cc[2] * w[k]; }
          if (w.terra > 0.5) { const band = 0.5 + 0.5 * Math.sin(hm * 2.3); rc[0] *= 0.85 + 0.2 * band; rc[1] *= 0.85 + 0.15 * band; rc[2] *= 0.85 + 0.1 * band; }
          col = M.mixc(col, rc, M.sstep(0.82, 0.55, ny));
        }
        mb.w(t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8], col);
      }
    }
    ch.terrain = mb.build();
    ch.hmax = -99; ch.hmin = 99;
    for (let j = j0; j <= j0 + CH; j++) for (let i = i0; i <= i0 + CH; i++) { const h = hAt(i, j); if (h > ch.hmax) ch.hmax = h; if (h < ch.hmin) ch.hmin = h; }
  }

  function buildLiquid(ch) {
    const W1 = N + 1, i0 = ch.cx * CH, j0 = ch.cz * CH;
    const wa = [], la = [];
    const hAt = (i, j) => H[j * W1 + i];
    const w = {};
    for (let j = j0; j < j0 + CH; j++) for (let i = i0; i < i0 + CH; i++) {
      const hs = [hAt(i, j), hAt(i + 1, j), hAt(i, j + 1), hAt(i + 1, j + 1)];
      const mn = Math.min(...hs);
      const x0 = i * CELL, z0 = j * CELL, x1 = x0 + CELL, z1 = z0 + CELL;
      const cxm = x0 + CELL / 2, czm = z0 + CELL / 2;
      let lava = false;
      if (mn < LAVA_Y + 0.3) { regionW(cxm, czm, w); lava = w.fogo > 0.5 && lavaMaskAt(cxm, czm, w) > 0.22 && Math.hypot(cxm - CENTER, czm - CENTER) < 250; }
      if (lava) {
        const d = hs.map((h) => M.clamp((LAVA_Y - h) / 4, 0, 1));
        const Y = LAVA_Y;
        la.push(x0, Y, z0, d[0], x0, Y, z1, d[2], x1, Y, z0, d[1], x1, Y, z0, d[1], x0, Y, z1, d[2], x1, Y, z1, d[3]);
      } else if (mn < SEA + 0.05) {
        const d = hs.map((h) => M.clamp((SEA - h) / 4.5, 0, 1));
        wa.push(x0, SEA, z0, d[0], x0, SEA, z1, d[2], x1, SEA, z0, d[1], x1, SEA, z0, d[1], x0, SEA, z1, d[2], x1, SEA, z1, d[3]);
      }
    }
    if (wa.length) ch.water = gfx.liqMesh(new Float32Array(wa));
    if (la.length) ch.lava = gfx.liqMesh(new Float32Array(la));
  }

  /* ---------- desenho ---------- */
  const _m = M.mat();
  W.draw = function (cam) {
    if (!W.ready) return;
    const far = gfx.env.fogFar + 70, e = gfx.eye;
    const vis = [];
    for (const ch of W.chunks) {
      const cx = ch.x + CHS / 2, cz = ch.z + CHS / 2;
      const d = Math.hypot(cx - e[0], cz - e[2]);
      if (d > far + CHS * 0.7) continue;
      const my = (ch.hmax + ch.hmin) / 2 + 10;
      if (!gfx.sphereVisible(cx, my, cz, CHS * 0.75 + (ch.hmax - ch.hmin) * 0.5 + 6)) continue;
      vis.push(ch);
      gfx.draw(ch.terrain, null);
      if (ch.mSolid) { gfx.sway = gfx.q.sway; gfx.draw(ch.mSolid, null); gfx.sway = 0; }
    }
    const night = G.env ? G.env.night : 0;
    const emis = 0.45 + night * 0.55;
    for (const ch of vis) if (ch.mGlow) gfx.draw(ch.mGlow, null, { emis });
    W.visChunks = vis;
  };
  W.drawShadow = function () {
    if (!W.ready) return;
    const c = gfx.shC, R = gfx.shR + CHS;
    for (const ch of W.chunks) {
      const cx = ch.x + CHS / 2, cz = ch.z + CHS / 2;
      if (Math.hypot(cx - c[0], cz - c[2]) > R + CHS * 0.7) continue;
      gfx.draw(ch.terrain, null);
      if (ch.mSolid) gfx.draw(ch.mSolid, null);
    }
  };
  W.drawLiquids = function () {
    if (!W.ready || !W.visChunks) return;
    gfx.beginLiquid();
    gfx.setLiquid('water');
    for (const ch of W.visChunks) if (ch.water) gfx.drawLiquid(ch.water);
    gfx.setLiquid('lava');
    for (const ch of W.visChunks) if (ch.lava) gfx.drawLiquid(ch.lava);
    // mar aberto além da ilha
    if (!W.ocean) {
      const s = 2600, y = SEA, q = [];
      const rect = (x0, z0, x1, z1) => q.push(x0, y, z0, 1, x0, y, z1, 1, x1, y, z0, 1, x1, y, z0, 1, x0, y, z1, 1, x1, y, z1, 1);
      rect(-s, -s, 0, s); rect(SIZE, -s, s, s); rect(0, -s, SIZE, 0); rect(0, SIZE, SIZE, s);
      W.ocean = gfx.liqMesh(new Float32Array(q));
    }
    gfx.setLiquid('water');
    gfx.drawLiquid(W.ocean);
    gfx.endLiquid();
  };
})();
