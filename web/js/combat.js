'use strict';
/* Elemental World — aplicação de dano, áreas, cones, defesa perfeita e sequência (streak) */
(function () {
  const G = window.G; const M = G.M;
  const C = (G.combat = { all: [], streak: 0, streakT: 0 });
  C.refresh = function () {
    C.all.length = 0;
    const e = G.enemies.list, d = G.dynprops.list;
    for (let i = 0; i < e.length; i++) if (e[i].alive) C.all.push(e[i]);
    for (let i = 0; i < d.length; i++) if (d[i].alive) C.all.push(d[i]);
    if (G.mp && G.mp.pvpTargets) for (const t of G.mp.pvpTargets()) C.all.push(t);
  };
  C.update = function (dt) { if (C.streakT > 0) { C.streakT -= dt; if (C.streakT <= 0) C.streak = 0; } };
  C.mult = () => 1 + 0.025 * Math.min(C.streak, 12);
  C.hit = function (x, y, z, r) {
    const a = C.all;
    for (let i = 0; i < a.length; i++) {
      const t = a[i]; if (!t.alive) continue;
      const dx = x - t.x, dz = z - t.z, rr = r + t.r;
      if (dx * dx + dz * dz < rr * rr && y > t.y - r && y < t.y + t.h + r) return t;
    }
    return null;
  };
  /* aplica dano do jogador a um alvo */
  C.deal = function (t, d, o) {
    o = o || {};
    if (!t.alive) return 0;
    d = d * C.mult();
    const real = t.hurt(d, o);
    if (real > 0) {
      C.streak++; C.streakT = 2.6 + 0.8 * G.prog.rank('mestria');
      if (o.kb && o.fx != null) {
        let dx = t.x - o.fx, dz = t.z - o.fz; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        if (t.knock) t.knock(dx, dz, o.kb, o.up || 0);
      }
      G.ui.dmgNum(t.x, t.y + t.h + 0.3, t.z, Math.round(real), o.el || 'neutro');
    }
    return real;
  };
  C.area = function (x, y, z, r, d, o) {
    o = Object.assign({ fx: x, fz: z }, o || {}); let n = 0;
    for (const t of C.all) {
      if (!t.alive) continue;
      const hd = Math.hypot(t.x - x, t.z - z);
      if (hd < r + t.r && Math.abs((t.y + t.h * 0.5) - y) < r + t.h + 1.5) { C.deal(t, d * (1 - 0.35 * Math.min(1, hd / r)), o); n++; }
    }
    return n;
  };
  /* cone a partir de (x,z) para direção (dx,dz) */
  C.cone = function (x, z, dx, dz, len, half, d, o) {
    o = Object.assign({ fx: x, fz: z }, o || {}); let n = 0; const cs = Math.cos(half);
    for (const t of C.all) {
      if (!t.alive) continue;
      const vx = t.x - x, vz = t.z - z, dist = Math.hypot(vx, vz);
      if (dist > len + t.r) continue;
      if (dist > t.r + 0.3 && (vx * dx + vz * dz) / dist < cs - t.r / Math.max(dist, 1) * 0.6) continue;
      C.deal(t, d, o); n++;
    }
    return n;
  };
  /* faixa retangular */
  C.line = function (x, z, dx, dz, len, w, d, o) {
    o = Object.assign({ fx: x, fz: z }, o || {}); let n = 0;
    for (const t of C.all) {
      if (!t.alive) continue;
      const vx = t.x - x, vz = t.z - z, a = vx * dx + vz * dz, b = Math.abs(vx * -dz + vz * dx);
      if (a > -t.r && a < len + t.r && b < w + t.r) { C.deal(t, d, o); n++; }
    }
    return n;
  };
  C.counter = function () {
    const P = G.player; G.fx.ring(P.x, P.y + 0.6, P.z, 1.2, 30, [1, 0.95, 0.6], true, 0.6); G.cam.kick(0.12);
    for (const t of G.enemies.list) if (t.alive && Math.hypot(t.x - P.x, t.z - P.z) < 5 + t.r) { t.stunT = 1.4; t.knock(t.x - P.x, t.z - P.z, 7, 2); t.hurt(12 * G.prog.stats().dmg, { el: 'neutro', counter: true }); }
  };
})();
