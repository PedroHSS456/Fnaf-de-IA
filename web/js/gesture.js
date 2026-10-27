'use strict';
/* Elemental World — controle de dobra por gesto.
   Toque curto = golpe; segurar = elemento sustentado (ou carregado); arrastar = forma conforme a direção:
   cima = arremesso, baixo = impacto no chão, lados = varredura, círculo = anel. A mira segue a câmera. */
(function () {
  const G = window.G, M = G.M, B = G.bend;
  const Gs = (G.gesture = { id: null, active: false, x0: 0, y0: 0, x: 0, y: 0, t: 0, maxD: 0, path: 0, hold: false, lastX: 0, lastY: 0, mod: false, tapT: 0, tapX: 0, tapY: 0 });
  /* Técnicas rápidas (4 por elemento) ficam no 'toque duplo': o 2º toque curto usa a técnica 0;
     se o 2º toque for arrastado: cima = 1, baixo = 2, lados = 3. Os gestos normais continuam iguais. */
  Gs.claims = function (x, y) {
    if (!G.main || !G.main.running || G.main.paused || (G.train && G.train.cut)) return false;
    const r = document.getElementById('pad').getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return Math.hypot(x - cx, y - cy) < r.width / 2 + 8;
  };
  Gs.init = function (layer) {
    layer.addEventListener('pointerdown', (e) => {
      if (Gs.active || !Gs.claims(e.clientX, e.clientY)) return;
      Gs.active = true; Gs.id = e.pointerId; Gs.x0 = Gs.x = Gs.lastX = e.clientX; Gs.y0 = Gs.y = Gs.lastY = e.clientY;
      Gs.t = 0; Gs.maxD = 0; Gs.path = 0; Gs.hold = false;
      Gs.mod = performance.now() - Gs.tapT < 380 && Math.hypot(e.clientX - Gs.tapX, e.clientY - Gs.tapY) < 70;
      const tr = document.getElementById('gtrail'); tr.style.left = e.clientX + 'px'; tr.style.top = e.clientY + 'px'; tr.classList.add('on');
    });
    layer.addEventListener('pointermove', (e) => {
      if (!Gs.active || e.pointerId !== Gs.id) return;
      Gs.path += Math.hypot(e.clientX - Gs.lastX, e.clientY - Gs.lastY);
      Gs.lastX = Gs.x = e.clientX; Gs.lastY = Gs.y = e.clientY;
      Gs.maxD = Math.max(Gs.maxD, Math.hypot(Gs.x - Gs.x0, Gs.y - Gs.y0));
    });
    const end = (e) => {
      if (!Gs.active || e.pointerId !== Gs.id) return;
      Gs.finish(); Gs.active = false; Gs.id = null;
      document.getElementById('gtrail').classList.remove('on');
    };
    layer.addEventListener('pointerup', end);
    layer.addEventListener('pointercancel', end);
  };
  /* chamado todo quadro: sustentar elemento */
  Gs.update = function (dt) {
    if (!Gs.active) return;
    Gs.t += dt;
    if (!Gs.hold && Gs.t > 0.22 && Gs.maxD < 18 && !G.drag.held) {
      Gs.hold = true; const E = G.elements[G.player.el()];
      if (E && E.hold) B.holdStart(); else Gs.chargeMode = true;
    }
    if (Gs.hold && B.hold) B.holdUpdate(dt, Gs.yawOff());
    if (Gs.hold && !B.hold && !Gs.chargeMode) { /* elemento sem sustentação: nada */ }
    const tr = document.getElementById('gtrail'); tr.style.width = tr.style.height = (60 + Math.min(40, Gs.t * 30)) + 'px';
  };
  Gs.yawOff = () => M.clamp((Gs.x - Gs.x0) / 140, -1, 1) * 0.7;
  Gs.finish = function () {
    const dur = Math.max(0.01, Gs.t);
    if (G.drag.held) { G.drag.throw(M.clamp(dur / 0.7, 0.2, 1)); return; }
    if (Gs.mod && !Gs.hold) { // toque duplo: técnica rápida
      Gs.mod = false; Gs.tapT = 0;
      let q = 0;
      if (Gs.maxD >= 18) { const dx = Gs.x - Gs.x0, dy = Gs.y - Gs.y0; q = Math.abs(dy) > Math.abs(dx) * 1.2 ? (dy < 0 ? 1 : 2) : 3; }
      B.castQuick(q); return;
    }
    if (Gs.hold) {
      if (B.hold) B.holdEnd({ yawOff: Gs.yawOff() });
      else if (Gs.chargeMode) { const c = M.clamp(dur / 1.2, 0, 1); B.cast(B.makeIntent('charged', { charge: c })); }
      Gs.chargeMode = false; return;
    }
    if (Gs.maxD < 18) { Gs.tapT = performance.now(); Gs.tapX = Gs.x0; Gs.tapY = Gs.y0; B.cast(B.makeIntent('jab', { speed: 0.6, len: 0.5 })); return; }
    const dx = Gs.x - Gs.x0, dy = Gs.y - Gs.y0, len = Math.hypot(dx, dy);
    const speed = M.clamp(len / dur / 1400, 0.1, 1), lenN = M.clamp(len / 260, 0.2, 1);
    const yawOff = M.clamp(dx / 200, -1, 1) * 0.6;
    let shape;
    if (Gs.path > 2.6 * len && len < 90 && Gs.path > 150) shape = 'ring';
    else if (Math.abs(dy) > Math.abs(dx) * 1.2) shape = dy < 0 ? 'launch' : 'slam';
    else shape = 'sweep';
    B.cast(B.makeIntent(shape, { speed, len: lenN, curve: M.clamp(dx / 160, -1, 1), side: Math.sign(dx) || 1, yawOff, charge: M.clamp(0.3 + speed * 0.7, 0, 1) }));
  };
})();
