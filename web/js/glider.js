'use strict';
/* Elemental World — planador dos dobradores de Ar: segure o pulo no ar para abrir o planador e voar para onde aponta. */
(function () {
  const G = window.G, M = G.M, gfx = G.gfx;
  const Gl = (G.glider = { mesh: null });
  const I = (px, py, pz, sx, sy, sz, ry, rx, rz) => M.trs(new Float32Array(16), px, py, pz, rx || 0, ry || 0, rz || 0, sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
  const H = M.hex;
  /* malha única: asas em V, vara central e cauda; frente = +z */
  Gl.build = function () {
    if (Gl.mesh) return Gl.mesh;
    const b = new gfx.MB(0.02), wing = H('#fff4d8'), edge = H('#f0b13a'), tail = H('#e07a2a');
    b.box(I(0, 0.02, 0.1, 0.12, 0.05, 1.7), H('#7a5a38'));
    for (const s of [-1, 1]) {
      b.box(I(s * 0.8, 0.06, 0.25, 1.4, 0.03, 0.85, 0, 0, s * 0.14), s < 0 ? wing : edge);
      b.box(I(s * 0.8, 0.07, 0.8, 1.35, 0.03, 0.12, 0, 0, s * 0.14), edge);
    }
    b.box(I(0, 0.2, -0.75, 0.05, 0.55, 0.5), tail);
    Gl.mesh = b.build();
    return Gl.mesh;
  };
  /* desenha no mundo (3ª pessoa) ou na frente da câmera (1ª pessoa) */
  const _m = M.mat();
  Gl.draw = function (x, y, z, yaw, roll, pitch, scale) {
    const m = Gl.build();
    M.trs(_m, x, y, z, pitch || 0, yaw, roll || 0, scale || 1, scale || 1, scale || 1);
    gfx.draw(m, _m, { outline: 0.02 });
  };
})();
