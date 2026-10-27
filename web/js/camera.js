'use strict';
/* Elemental World — câmera de terceira pessoa */
(function () {
  const G = window.G; const M = G.M; const W = G.world;
  const C = (G.cam = { yaw: 0, pitch: 0.38, dist: 7.2, curDist: 7.2, eye: [0, 10, 0], target: [0, 2, 0], shake: 0, fov: 62, fovT: 62, lock: false });
  C.fwd = () => [Math.sin(C.yaw), 0, Math.cos(C.yaw)];
  C.right = () => [-Math.cos(C.yaw), 0, Math.sin(C.yaw)];
  C.snap = function (P) { C.target = [P.x, P.y + 1.55, P.z]; C.eye = [P.x - Math.sin(C.yaw) * 7, P.y + 4, P.z - Math.cos(C.yaw) * 7]; C.curDist = C.dist; };
  C.kick = (a) => { C.shake = Math.max(C.shake, a); };
  C.update = function (dt, P) {
    const In = G.input;
    C.yaw -= In.camDX; C.pitch = M.clamp(C.pitch + In.camDY, -0.12, 1.25); In.camDX = 0; In.camDY = 0;
    const zoom = G.save.settings.zoom; const want = C.dist * zoom * (P.avatarState ? 1.15 : 1);
    C.target[0] = M.damp(C.target[0], P.x, 18, dt); C.target[1] = M.damp(C.target[1], P.y + (P.swimming ? 0.9 : 1.55), 10, dt); C.target[2] = M.damp(C.target[2], P.z, 18, dt);
    const cp = Math.cos(C.pitch), sp = Math.sin(C.pitch), f = [Math.sin(C.yaw), Math.cos(C.yaw)];
    // colisão com o terreno: encurta a distância
    let d = want;
    for (let t = 0.2; t <= 1.001; t += 0.16) {
      const k = want * t, x = C.target[0] - f[0] * cp * k, z = C.target[2] - f[1] * cp * k, y = C.target[1] + sp * k;
      if (y < Math.max(W.groundY(x, z), W.SEA) + 0.55) { d = Math.max(1.6, want * (t - 0.16)); break; }
    }
    C.curDist = d < C.curDist ? M.damp(C.curDist, d, 22, dt) : M.damp(C.curDist, d, 3.5, dt);
    const ex = C.target[0] - f[0] * cp * C.curDist, ez = C.target[2] - f[1] * cp * C.curDist;
    let ey = C.target[1] + sp * C.curDist;
    ey = Math.max(ey, Math.max(W.groundY(ex, ez), W.SEA) + 0.6);
    C.eye = [ex, ey, ez];
    if (C.shake > 0.001) { C.eye[0] += M.rnd(-1, 1) * C.shake; C.eye[1] += M.rnd(-1, 1) * C.shake; C.eye[2] += M.rnd(-1, 1) * C.shake; C.shake = Math.max(0, C.shake - dt * 1.6); }
    C.fov = M.damp(C.fov, C.fovT + G.save.settings.fovBoost, 6, dt);
  };
  C.viewTarget = () => [C.target[0] + (C.shake ? M.rnd(-1, 1) * C.shake * 0.5 : 0), C.target[1] + 0.3, C.target[2]];
})();
