'use strict';
/* Elemental World — partículas (aditivas e normais) e fontes de fogo persistentes */
(function () {
  const G = window.G; const M = G.M; const gfx = G.gfx;
  const fx = (G.fx = {});
  const CAP = 2800, IMC = 400;
  const IM = [new Float32Array(IMC * 8), new Float32Array(IMC * 8)], imn = [0, 0];
  function Pool(additive) {
    this.add = additive; this.n = 0;
    this.px = new Float32Array(CAP); this.py = new Float32Array(CAP); this.pz = new Float32Array(CAP);
    this.vx = new Float32Array(CAP); this.vy = new Float32Array(CAP); this.vz = new Float32Array(CAP);
    this.life = new Float32Array(CAP); this.max = new Float32Array(CAP);
    this.s0 = new Float32Array(CAP); this.s1 = new Float32Array(CAP);
    this.r = new Float32Array(CAP); this.g = new Float32Array(CAP); this.b = new Float32Array(CAP); this.a = new Float32Array(CAP);
    this.grav = new Float32Array(CAP); this.drag = new Float32Array(CAP);
    this.out = new Float32Array((CAP + IMC) * 8);
  }
  const A = new Pool(true), B = new Pool(false);
  fx.count = () => A.n + B.n;
  fx.quality = 1; // 0.4..1: reduz emissão em aparelhos fracos
  /* add: aditivo (fogo/magia) ou normal (fumaça/poeira/chuva). */
  fx.p = function (add, x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a, grav, drag) {
    if (G.gfx.shadowPass) return;
    const P = add ? A : B; if (P.n >= CAP) return;
    const i = P.n++;
    P.px[i] = x; P.py[i] = y; P.pz[i] = z; P.vx[i] = vx; P.vy[i] = vy; P.vz[i] = vz;
    P.life[i] = life; P.max[i] = life; P.s0[i] = s0; P.s1[i] = s1; P.r[i] = r; P.g[i] = g; P.b[i] = b; P.a[i] = a;
    P.grav[i] = grav || 0; P.drag[i] = drag || 0;
  };
  fx.clear = () => { A.n = 0; B.n = 0; };
  function upd(P, dt) {
    for (let i = 0; i < P.n;) {
      P.life[i] -= dt;
      if (P.life[i] <= 0) { // remove por troca
        const l = --P.n;
        if (i !== l) for (const k of ['px', 'py', 'pz', 'vx', 'vy', 'vz', 'life', 'max', 's0', 's1', 'r', 'g', 'b', 'a', 'grav', 'drag']) P[k][i] = P[k][l];
        continue;
      }
      const d = Math.max(0, 1 - P.drag[i] * dt);
      P.vx[i] *= d; P.vy[i] = (P.vy[i] - P.grav[i] * dt) * d; P.vz[i] *= d;
      P.px[i] += P.vx[i] * dt; P.py[i] += P.vy[i] * dt; P.pz[i] += P.vz[i] * dt;
      i++;
    }
  }
  function fill(P) {
    const o = P.out;
    for (let i = 0; i < P.n; i++) {
      const t = 1 - P.life[i] / P.max[i], k = i * 8;
      const fade = t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88;
      o[k] = P.px[i]; o[k + 1] = P.py[i]; o[k + 2] = P.pz[i];
      o[k + 3] = P.r[i]; o[k + 4] = P.g[i]; o[k + 5] = P.b[i]; o[k + 6] = P.a[i] * fade;
      o[k + 7] = P.s0[i] + (P.s1[i] - P.s0[i]) * t;
    }
  }
  fx.update = function (dt) {
    upd(A, dt); upd(B, dt);
    updateFires(dt);
  };
  /* sprite de um quadro só (sombras, brilhos): não precisa de vida */
  fx.imm = function (add, x, y, z, size, r, g, b, a) {
    if (G.gfx.shadowPass) return;
    const k = add ? 1 : 0; if (imn[k] >= IMC) return; const o = IM[k], i = imn[k]++ * 8;
    o[i] = x; o[i + 1] = y; o[i + 2] = z; o[i + 3] = r; o[i + 4] = g; o[i + 5] = b; o[i + 6] = a; o[i + 7] = size;
  };
  fx.draw = function () {
    fill(B); fill(A);
    for (const P of [B, A]) { const k = P.add ? 1 : 0; if (imn[k]) { P.out.set(IM[k].subarray(0, imn[k] * 8), P.n * 8); } }
    gfx.points(B.out, B.n + imn[0], false);
    gfx.points(A.out, A.n + imn[1], true);
    imn[0] = imn[1] = 0;
  };
  const R = M.rnd;
  /* ---- emissores prontos ---- */
  fx.burst = function (x, y, z, n, col, speed, size, life, add, grav) {
    n = Math.ceil(n * fx.quality);
    for (let i = 0; i < n; i++) {
      const a = R(0, M.TAU), e = R(-0.4, 1), s = R(0.3, 1) * speed, c = Math.sqrt(1 - e * e);
      fx.p(add !== false, x, y, z, Math.cos(a) * c * s, e * s, Math.sin(a) * c * s, life * R(0.6, 1.2), size, size * 0.2, col[0], col[1], col[2], 0.9, grav == null ? 3 : grav, 1.5);
    }
  };
  fx.smoke = function (x, y, z, n, size) {
    n = Math.ceil(n * fx.quality);
    for (let i = 0; i < n; i++) fx.p(false, x + R(-0.2, 0.2), y, z + R(-0.2, 0.2), R(-0.3, 0.3), R(0.6, 1.6), R(-0.3, 0.3), R(0.8, 1.6), size, size * 2.2, 0.35, 0.34, 0.36, 0.5, -0.2, 0.6);
  };
  fx.dust = function (x, y, z, n, col) {
    n = Math.ceil(n * fx.quality); col = col || [0.7, 0.62, 0.5];
    for (let i = 0; i < n; i++) { const a = R(0, M.TAU), s = R(0.5, 2.2); fx.p(false, x, y + 0.1, z, Math.cos(a) * s, R(0.3, 1.4), Math.sin(a) * s, R(0.4, 0.9), 0.5, 1.4, col[0], col[1], col[2], 0.55, 1.5, 2); }
  };
  fx.flame = function (x, y, z, s) {
    if (Math.random() > fx.quality) return;
    fx.p(true, x + R(-0.12, 0.12) * s, y, z + R(-0.12, 0.12) * s, R(-0.2, 0.2), R(0.8, 1.8) * s, R(-0.2, 0.2), R(0.35, 0.7), 0.55 * s, 0.1, 1, R(0.35, 0.65), 0.08, 0.95, -0.3, 0.5);
    if (Math.random() < 0.25) fx.p(false, x, y + 0.3 * s, z, R(-0.2, 0.2), R(0.8, 1.4), R(-0.2, 0.2), R(0.8, 1.4), 0.35 * s, 0.9 * s, 0.25, 0.24, 0.25, 0.35, -0.2, 0.7);
  };
  fx.ring = function (x, y, z, r, n, col, add, up) {
    n = Math.ceil(n * fx.quality);
    for (let i = 0; i < n; i++) { const a = (i / n) * M.TAU; fx.p(add !== false, x + Math.cos(a) * r, y, z + Math.sin(a) * r, Math.cos(a) * 3, up || 0.4, Math.sin(a) * 3, 0.5, 0.5, 0.15, col[0], col[1], col[2], 0.9, 0, 1.5); }
  };
  fx.num = []; // textos flutuantes (dano) são feitos pelo UI

  /* fogueiras/tochas fixas do mundo */
  let fireT = 0;
  function updateFires(dt) {
    fireT += dt; if (fireT < 0.07) return; const step = fireT; fireT = 0;
    const W = G.world; if (!W.fires || !G.cam) return;
    const e = G.cam.eye;
    let n = 0;
    for (const f of W.fires) {
      const dx = f.x - e[0], dz = f.z - e[2];
      if (dx * dx + dz * dz > 3600) continue;
      if (++n > 26) break;
      if (f.col) { // santuário: orbes
        fx.p(true, f.x + R(-0.4, 0.4), f.y + R(-0.3, 0.6), f.z + R(-0.4, 0.4), 0, R(0.3, 0.9), 0, 1.2, 0.35, 0.05, f.col[0], f.col[1], f.col[2], 0.8, 0, 0);
      } else fx.flame(f.x, f.y, f.z, f.s);
    }
  }

  /* clima */
  fx.weatherT = 0;
  fx.weather = function (dt, env, cam, reg) {
    if (!env.weather.type) return;
    const e = cam.eye, I = env.weather.intensity;
    const n = Math.min(10, (env.weather.type === 'rain' ? 70 : env.weather.type === 'snow' ? 28 : 12) * I * dt * 60 * fx.quality * 0.5);
    let k = n; k = Math.floor(k) + (Math.random() < k % 1 ? 1 : 0);
    for (let i = 0; i < k; i++) {
      const x = e[0] + R(-26, 26), z = e[2] + R(-26, 26), y = e[1] + R(8, 16);
      if (env.weather.type === 'rain') fx.p(false, x, y, z, 1.5, -26, 0.8, 0.9, 0.18, 0.18, 0.7, 0.8, 0.95, 0.4, 0, 0);
      else if (env.weather.type === 'snow') fx.p(false, x, y, z, R(-0.6, 0.6) + 1.0, -2.2, R(-0.6, 0.6), 7, 0.22, 0.22, 1, 1, 1, 0.8, 0, 0);
      else if (env.weather.type === 'ash') fx.p(true, x, y - 4, z, R(0.3, 1.2), R(-1.2, 0.6), R(-0.5, 0.5), 6, 0.2, 0.1, 1, R(0.35, 0.6), 0.1, 0.65, 0, 0);
      else if (env.weather.type === 'leaves') fx.p(false, x, y - 4, z, R(2, 4), R(-0.6, 0.4), R(-1, 1), 5, 0.22, 0.22, 0.75, 0.9, 0.6, 0.7, 0, 0);
    }
  };
})();
