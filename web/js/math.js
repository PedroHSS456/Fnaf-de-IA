'use strict';
/* Elemental World — utilidades matemáticas (sem dependências) */
(function () {
  const G = (window.G = window.G || {});
  const M = (G.M = {});
  const PI = Math.PI;
  M.PI = PI;
  M.TAU = PI * 2;
  M.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  M.lerp = (a, b, t) => a + (b - a) * t;
  M.sstep = (a, b, x) => { const t = M.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  M.rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
  M.rint = (a, b) => Math.floor(M.rnd(a, b + 1));
  M.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  M.dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
  M.angDiff = (a, b) => { let d = b - a; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI; return d; };
  M.lerpAng = (a, b, t) => a + M.angDiff(a, b) * M.clamp(t, 0, 1);
  M.damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  M.seeded = (seed) => {
    let s = seed >>> 0;
    return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  M.hash2 = (x, y, s) => {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  M.noise2 = (x, y, s) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = M.hash2(xi, yi, s), b = M.hash2(xi + 1, yi, s), c = M.hash2(xi, yi + 1, s), d = M.hash2(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  M.fbm = (x, y, s, oct = 4) => {
    let amp = 0.5, f = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) { sum += M.noise2(x * f, y * f, s + i * 17) * amp; norm += amp; amp *= 0.5; f *= 2.03; }
    return sum / norm;
  };
  /* cores */
  M.hex = (h) => {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
  };
  M.mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  M.shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  M.css = (c) => 'rgb(' + Math.round(M.clamp(c[0], 0, 1) * 255) + ',' + Math.round(M.clamp(c[1], 0, 1) * 255) + ',' + Math.round(M.clamp(c[2], 0, 1) * 255) + ')';

  /* matrizes 4x4, coluna-maior (formato WebGL) */
  M.mat = () => new Float32Array(16);
  M.ident = (o) => { o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o; };
  M.persp = (o, fovy, asp, n, f) => {
    const t = 1 / Math.tan(fovy / 2);
    o.fill(0); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = (2 * f * n) / (n - f);
    return o;
  };
  M.lookAt = (o, e, c, up) => {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2];
    let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0;
    o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0;
    o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * e[0] + xy * e[1] + xz * e[2]);
    o[13] = -(yx * e[0] + yy * e[1] + yz * e[2]);
    o[14] = -(zx * e[0] + zy * e[1] + zz * e[2]);
    o[15] = 1;
    return o;
  };
  const _t = new Float32Array(16);
  M.mul = (o, a, b) => {
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      _t[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    o.set(_t); return o;
  };
  /* T * Ry * Rx * Rz * S  (frente do personagem = (sin yaw, 0, cos yaw)) */
  M.trs = (o, px, py, pz, rx, ry, rz, sx, sy, sz) => {
    const cx = Math.cos(rx), sxr = Math.sin(rx), cy = Math.cos(ry), syr = Math.sin(ry), cz = Math.cos(rz), szr = Math.sin(rz);
    const r00 = cy * cz + syr * sxr * szr, r01 = -cy * szr + syr * sxr * cz, r02 = syr * cx;
    const r10 = cx * szr, r11 = cx * cz, r12 = -sxr;
    const r20 = -syr * cz + cy * sxr * szr, r21 = syr * szr + cy * sxr * cz, r22 = cy * cx;
    o[0] = r00 * sx; o[1] = r10 * sx; o[2] = r20 * sx; o[3] = 0;
    o[4] = r01 * sy; o[5] = r11 * sy; o[6] = r21 * sy; o[7] = 0;
    o[8] = r02 * sz; o[9] = r12 * sz; o[10] = r22 * sz; o[11] = 0;
    o[12] = px; o[13] = py; o[14] = pz; o[15] = 1;
    return o;
  };
  /* atalho: nova matriz de TRS */
  M.T = (px, py, pz, sx = 1, sy = sx, sz = sx, ry = 0, rx = 0, rz = 0) => M.trs(new Float32Array(16), px, py, pz, rx, ry, rz, sx, sy, sz);
  M.xf = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
})();
