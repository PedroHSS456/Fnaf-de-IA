'use strict';
/* Elemental World — entrada: joystick flutuante, câmera por arrasto, botões e teclado (para testes) */
(function () {
  const G = window.G; const M = G.M;
  const In = (G.input = { mv: [0, 0], camDX: 0, camDY: 0, held: {}, edge: {}, keys: {}, joyActive: false, joyBase: [0, 0], joyKnob: [0, 0], joyR: 52 });
  const ptrs = new Map();
  In.press = (n) => { In.edge[n] = true; In.held[n] = true; };
  In.release = (n) => { In.held[n] = false; };
  In.take = (n) => { if (In.edge[n]) { In.edge[n] = false; return true; } return false; };
  In.clearEdges = () => { In.edge = {}; };
  In.reset = () => { In.mv = [0, 0]; In.joyActive = false; ptrs.clear(); In.held = {}; In.edge = {}; In.camDX = In.camDY = 0; };

  In.init = function (layer) {
    layer.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (ptrs.has(e.pointerId)) return;
      const W = layer.clientWidth;
      const joyTaken = [...ptrs.values()].some((p) => p.role === 'joy');
      const role = (G.gesture && G.gesture.claims && G.gesture.claims(e.clientX, e.clientY)) ? 'bend' : (e.clientX < W * 0.42 && !joyTaken) ? 'joy' : 'cam';
      const p = { role, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY };
      ptrs.set(e.pointerId, p);
      try { layer.setPointerCapture(e.pointerId); } catch (er) {}
      if (role === 'joy') { In.joyActive = true; In.joyBase = [e.clientX, e.clientY]; In.joyKnob = [e.clientX, e.clientY]; In.mv = [0, 0]; }
    });
    layer.addEventListener('pointermove', (e) => {
      const p = ptrs.get(e.pointerId); if (!p) return;
      e.preventDefault();
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      const S = G.save.settings;
      if (p.role === 'cam') { In.camDX += dx * 0.0062 * S.camSens; In.camDY += dy * 0.0045 * S.camSens; }
      else if (p.role === 'joy') { // só o joystick move o personagem; o círculo de dobra usa gesture.js
        const R = In.joyR * S.joySize * S.hudScale;
        let vx = e.clientX - In.joyBase[0], vy = e.clientY - In.joyBase[1]; const l = Math.hypot(vx, vy);
        if (l > R) { vx = (vx / l) * R; vy = (vy / l) * R; }
        In.joyKnob = [In.joyBase[0] + vx, In.joyBase[1] + vy];
        let mx = vx / R, my = -vy / R; const m = Math.hypot(mx, my);
        if (m < 0.14) { mx = 0; my = 0; } else { const k = (m - 0.14) / 0.86 / m; mx *= k; my *= k; }
        In.mv = [mx, my];
      }
    });
    const up = (e) => {
      const p = ptrs.get(e.pointerId); if (!p) return;
      ptrs.delete(e.pointerId);
      if (p.role === 'joy') { In.joyActive = false; In.mv = [0, 0]; }
    };
    layer.addEventListener('pointerup', up); layer.addEventListener('pointercancel', up);
    layer.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return; const k = e.key.toLowerCase(); In.keys[k] = true;
      const map = { ' ': 'jump', shift: 'dodge', e: 'act', f: 'act', q: 'mode', tab: 'avatar', escape: 'menu', m: 'map', c: 'guard' };
      if (map[k]) { In.press(map[k]); if (k === 'tab') e.preventDefault(); }
      if (k >= '1' && k <= '4') In.press('s' + (+k - 1));
      if (k === 'r') In.press('el0'); if (k === 't') In.press('el1'); if (k === 'y') In.press('el2'); if (k === 'u') In.press('el3');
    });
    window.addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); In.keys[k] = false; if (k === 'c') In.release('guard'); });
    window.addEventListener('blur', () => { In.keys = {}; });
  };
  /* vetor de movimento combinando joystick e teclado */
  In.move = function () {
    let x = In.mv[0], y = In.mv[1];
    const K = In.keys;
    if (K.w || K.arrowup) y += 1; if (K.s || K.arrowdown) y -= 1; if (K.d || K.arrowright) x += 1; if (K.a || K.arrowleft) x -= 1;
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    return [x, y];
  };
})();
