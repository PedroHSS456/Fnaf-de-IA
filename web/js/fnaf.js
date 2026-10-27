/* Modo FNAF (original): sobreviva da meia-noite às 6h num quarto escuro, ouvindo a respiração nas portas.
   Noite 1 sempre disponível; completar a Noite 1 libera as próximas noites e o FNAF para todos na sala. */
(function () {
  'use strict';
  const G = window.G;
  const F = (G.fnaf = { active: false });
  const KEY = 'ew_fnaf_n';
  const get = () => { try { return Math.max(1, Math.min(5, parseInt(localStorage.getItem(KEY), 10) || 1)); } catch (e) { return 1; } };
  const put = (n) => { try { localStorage.setItem(KEY, String(n)); } catch (e) { /* sem storage */ } };
  F.unlocked = () => { try { return (parseInt(localStorage.getItem('ew_fnafc_n'), 10) || 1) >= 2 || get() >= 2; } catch (e) { return false; } };
  F.night = get;

  /* ---------- interface ---------- */
  const css = document.createElement('style');
  css.textContent = `
#fn{position:fixed;inset:0;z-index:90;background:#000;display:none;touch-action:none;user-select:none;-webkit-user-select:none}
#fn canvas{position:absolute;inset:0;width:100%;height:100%}
#fn .b{position:absolute;bottom:10px;font:700 13px system-ui,sans-serif;color:#fff;background:rgba(60,12,10,.82);border:2px solid #7a2a22;border-radius:10px;padding:14px 10px;touch-action:none;min-width:70px;text-align:center}
#fn .b.on{background:#b3261a}
#fn #fn-l{left:8px}#fn #fn-r{left:92px}#fn #fn-d{right:112px}#fn #fn-f{right:8px;min-width:96px}
#fn #fn-x{top:8px;right:8px;bottom:auto;padding:6px 10px;font-size:11px;min-width:0;background:rgba(30,16,18,.8)}
#fn #fn-t{position:absolute;top:8px;left:12px;color:#d8c9b4;font:700 15px ui-monospace,monospace;text-shadow:0 0 6px #000}
#fn #fn-m{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#e8d8c4;font:700 20px system-ui,sans-serif;text-align:center;background:rgba(0,0,0,.78);padding:20px;white-space:pre-line}
#fn #fn-m button{font:700 15px system-ui,sans-serif;padding:12px 20px;border-radius:10px;border:0;background:#b3261a;color:#fff}`;
  document.head.appendChild(css);
  const root = document.createElement('div'); root.id = 'fn';
  root.innerHTML = '<canvas></canvas><div id="fn-t"></div><button class="b" id="fn-x" type="button">SAIR</button>' +
    '<button class="b" id="fn-l" type="button">◀</button><button class="b" id="fn-r" type="button">▶</button>' +
    '<button class="b" id="fn-d" type="button">FECHAR PORTA</button><button class="b" id="fn-f" type="button">LANTERNA</button><div id="fn-m" hidden></div>';
  document.body.appendChild(root);
  const $ = (id) => document.getElementById(id);
  const cv = root.querySelector('canvas'), msg = $('fn-m'); let c = cv.getContext('2d');
  function fit() { cv.width = Math.min(960, window.innerWidth); cv.height = Math.round(cv.width * window.innerHeight / window.innerWidth); }
  window.addEventListener('resize', fit);

  /* ---------- estado ---------- */
  const VN = ['ESQUERDA', 'FRENTE (ARMÁRIO)', 'DIREITA', 'ATRÁS (CAMA)'];
  const NAMES = ['O Sorriso', 'A Agulha', 'O Rastejante', 'Meia-Noite'];
  let S = null, raf = 0, last = 0, multi = false;
  const held = { door: false, light: false };

  function mk(n) {
    const hourLen = Math.max(28, 44 - 4 * (n - 1));
    const cr = [{ id: 0, door: 0 }, { id: 1, door: 2 }];
    if (n >= 2) cr.push({ id: 2, door: 1 });
    cr.forEach((x) => { x.stage = 0; x.t = 6 + Math.random() * 6; x.atk = 0; x.away = 0; });
    return { n, hourLen, t: 0, hour: 0, view: 1, cr, bed: { on: false, t: 0, lit: 0, next: n >= 2 ? 25 : 1e9 }, dead: -1, win: false, killer: 0, hold: 0, flash: 0, shake: 0, aggr: 0.55 + 0.1 * n, pend: 0 };
  }

  /* ---------- áudio (sintetizado, em camadas) ---------- */
  let ac = null, mst = null, amb = null;
  function aInit() {
    if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ac = new AC(); mst = ac.createGain(); mst.gain.value = 0.8; mst.connect(ac.destination); }
    if (ac.state === 'suspended') ac.resume();
    if (amb) amb.gain.value = 0.07;
    if (amb) amb.gain.value = 0.07;
    if (!amb) { // zumbido grave do quarto
      amb = ac.createGain(); amb.gain.value = 0.07; amb.connect(mst);
      [48, 72, 96.5].forEach((f, i) => { const o = ac.createOscillator(); o.type = i ? 'sine' : 'sawtooth'; o.frequency.value = f; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; o.connect(lp); lp.connect(amb); o.start(); });
    }
  }
  const nb = (sec, sh) => { const n = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (sh ? sh(i / n) : 1); return b; };
  function out(pan, vol) { const g = ac.createGain(); g.gain.value = vol; if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(mst); } else g.connect(mst); return g; }
  function burst(t, sec, type, f, q, vol, sh, pan) { const s = ac.createBufferSource(), fl = ac.createBiquadFilter(); s.buffer = nb(sec, sh); fl.type = type; fl.frequency.value = f; fl.Q.value = q; s.connect(fl); fl.connect(out(pan || 0, vol)); s.start(t); }
  function tone(t, f0, f1, dur, type, vol, cut, pan) { const o = ac.createOscillator(), g = ac.createGain(), fl = ac.createBiquadFilter(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur); fl.type = 'lowpass'; fl.frequency.value = cut || 4000; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(fl); fl.connect(g); g.connect(out(pan || 0, 1)); o.start(t); o.stop(t + dur + 0.05); }
  const door = [-0.9, 0, 0.9];
  function breath(d, v) { if (!ac) return; const t = ac.currentTime; burst(t, 1.3, 'bandpass', 520 + Math.random() * 200, 1.4, 0.9 * v, (u) => Math.sin(Math.PI * u) ** 2, door[d]); burst(t + 0.05, 1.3, 'lowpass', 180, 0.7, 0.5 * v, (u) => Math.sin(Math.PI * u) ** 2, door[d]); }
  function step(d) { if (!ac) return; const t = ac.currentTime; tone(t, 90, 45, 0.18, 'sine', 0.8, 300, door[d]); burst(t, 0.1, 'lowpass', 500, 0.7, 0.6, (u) => (1 - u) ** 2, door[d]); }
  function bell(n) { if (!ac) return; const t = ac.currentTime; for (let i = 0; i < n; i++) [523, 784, 1318].forEach((f, k) => tone(t + i * 0.9, f, f * 0.995, 2.2, 'sine', 0.22 / (k + 1), 5000)); }
  function creak() { if (!ac) return; const t = ac.currentTime; tone(t, 200, 330, 0.9, 'sawtooth', 0.12, 600, Math.random() * 2 - 1); }
  function heart(v) { if (!ac) return; const t = ac.currentTime; tone(t, 62, 40, 0.2, 'sine', 0.9 * v, 300); tone(t + 0.17, 58, 38, 0.2, 'sine', 0.7 * v, 300); }
  function slam() { if (!ac) return; const t = ac.currentTime; tone(t, 120, 40, 0.3, 'sine', 1, 300); burst(t, 0.2, 'lowpass', 700, 0.7, 0.8, (u) => (1 - u) ** 2); }
  function scare() {
    if (!ac) return; const t = ac.currentTime;
    const cur = new Float32Array(256); for (let i = 0; i < 256; i++) cur[i] = Math.tanh((i / 128 - 1) * 6);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 13; lg.gain.value = 70; lfo.connect(lg); lfo.start(t); lfo.stop(t + 2.4);
    [['sawtooth', 650, 2000, 1400, 2100, 0.5], ['square', 400, 1200, 850, 1300, 0.55], ['sawtooth', 105, 72, 58, 480, 0.9], ['sawtooth', 480, 1350, 960, 1500, 0.35], ['sawtooth', 520, 1450, 1030, 1600, 0.35], ['square', 3000, 2700, 2200, 3400, 0.18]].forEach((L) => {
      const o = ac.createOscillator(), ws = ac.createWaveShaper(), fl = ac.createBiquadFilter(), g = ac.createGain(); ws.curve = cur;
      o.type = L[0]; o.frequency.setValueAtTime(L[1], t); o.frequency.exponentialRampToValueAtTime(L[2], t + 0.25); o.frequency.exponentialRampToValueAtTime(L[3], t + 1.7); lg.connect(o.frequency);
      fl.type = 'bandpass'; fl.frequency.value = L[4]; fl.Q.value = 1;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(L[5], t + 0.03); g.gain.setValueAtTime(L[5], t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      o.connect(ws); ws.connect(fl); fl.connect(g); g.connect(mst); o.start(t); o.stop(t + 2.3);
    });
    burst(t, 2.2, 'highpass', 2500, 0.7, 0.3, (u) => 1 - u * 0.5); tone(t, 130, 32, 0.7, 'sine', 1.2, 300); burst(t, 0.4, 'lowpass', 600, 0.7, 1.2, (u) => (1 - u) ** 2);
  }

  /* ---------- desenho ---------- */
  function monster(id, x, y, s, t, mouth) { // 4 criaturas originais
    c.save(); c.translate(x, y); c.scale(s, s);
    const body = ['#0b0608', '#050505', '#0a0a0d', '#120a0a'][id];
    c.fillStyle = body; c.strokeStyle = body; c.lineCap = 'round';
    if (id === 1) { c.lineWidth = 9; c.beginPath(); c.moveTo(0, 40); c.lineTo(0, 220); c.stroke(); for (const sd of [-1, 1]) { c.lineWidth = 5; c.beginPath(); c.moveTo(0, 70); c.quadraticCurveTo(sd * 60, 120, sd * 40, 230); c.stroke(); } }
    else if (id === 2) { c.beginPath(); c.ellipse(0, 70, 120, 55, 0, 0, 7); c.fill(); for (let i = -3; i <= 3; i++) { c.lineWidth = 6; c.beginPath(); c.moveTo(i * 28, 90); c.lineTo(i * 40, 130 + Math.sin(t * 3 + i) * 6); c.stroke(); } }
    else { c.beginPath(); c.ellipse(0, 150, 70, 130, 0, 0, 7); c.fill(); }
    c.beginPath(); c.ellipse(0, 0, id === 2 ? 70 : 52, id === 3 ? 48 : 64, 0, 0, 7); c.fill();
    c.fillStyle = id === 3 ? '#e9d6a8' : '#f2f2e6';
    const eyes = id === 2 ? [[-40, -12, 9], [-18, -22, 6], [10, -20, 7], [38, -8, 10], [0, 4, 5]] : [[-20, -14, 9], [20, -14, 9]];
    eyes.forEach((e) => { c.beginPath(); c.arc(e[0], e[1], e[2] * (1 + 0.1 * Math.sin(t * 4)), 0, 7); c.fill(); });
    const m = 6 + mouth * 22; c.fillStyle = '#000'; c.beginPath(); c.ellipse(0, 26, id === 0 ? 40 : 28, m, 0, 0, 7); c.fill();
    c.fillStyle = '#efe8d6'; const nT = id === 0 ? 9 : 6;
    for (let i = 0; i < nT; i++) { const u = (i / (nT - 1) - 0.5) * (id === 0 ? 70 : 48); c.beginPath(); c.moveTo(u - 3, 26 - m * 0.9); c.lineTo(u + 3, 26 - m * 0.9); c.lineTo(u, 26 - m * 0.9 + 9 + mouth * 8); c.fill(); }
    c.restore();
  }
  function frame() {
    const W = cv.width, H = cv.height, t = S.t;
    c.save(); if (S.shake > 0) c.translate((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake);
    c.fillStyle = '#050304'; c.fillRect(0, 0, W, H);
    const v = S.view, lit = held.light && S.dead < 0;
    // paredes e piso
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0d0809'); g.addColorStop(1, '#030203'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = '#080506'; c.fillRect(0, H * 0.78, W, H * 0.22);
    const dw = W * 0.34, dh = H * 0.62, dx = W / 2 - dw / 2, dy = H * 0.14;
    if (v <= 2) { // porta (ou armário) à frente
      c.fillStyle = '#000'; c.fillRect(dx, dy, dw, dh); c.strokeStyle = '#1b1210'; c.lineWidth = 10; c.strokeRect(dx, dy, dw, dh);
      if (v === 1) { c.strokeStyle = '#150e0c'; c.lineWidth = 4; c.beginPath(); c.moveTo(W / 2, dy); c.lineTo(W / 2, dy + dh); c.stroke(); }
      const cr = S.cr.find((x) => x.door === v && x.stage > 0);
      if (held.door && S.dead < 0) { c.fillStyle = '#2a1a16'; c.fillRect(dx, dy, dw, dh); c.strokeStyle = '#4a2a22'; c.lineWidth = 6; c.strokeRect(dx + 6, dy + 6, dw - 12, dh - 12); c.fillStyle = '#6a4a3a'; c.beginPath(); c.arc(dx + dw * 0.85, dy + dh * 0.55, 8, 0, 7); c.fill(); }
      else if (cr) {
        if (cr.stage === 1) { c.fillStyle = 'rgba(240,240,230,' + (0.15 + 0.1 * Math.sin(t * 3)) + ')'; c.beginPath(); c.arc(W / 2 - 14, dy + dh * 0.4, 3, 0, 7); c.arc(W / 2 + 14, dy + dh * 0.4, 3, 0, 7); c.fill(); }
        else if (lit) monster(cr.id, W / 2, dy + dh * (cr.stage === 2 ? 0.38 : 0.5), (cr.stage === 2 ? 0.7 : 1.1) * dh / 300, t, 0);
      }
    } else { // cama atrás
      c.fillStyle = '#12090a'; c.fillRect(W * 0.18, H * 0.5, W * 0.64, H * 0.28); c.fillStyle = '#1a0e0e'; c.fillRect(W * 0.18, H * 0.46, W * 0.64, H * 0.08);
      if (S.bed.on && lit) monster(3, W / 2, H * 0.44, 0.9 * H / 480, t, 0);
    }
    // lanterna
    if (lit) { const gr = c.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H * 0.45, W * 0.55); gr.addColorStop(0, 'rgba(255,240,200,0.32)'); gr.addColorStop(0.6, 'rgba(255,240,200,0.08)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, H); }
    // vinheta escura e ruído
    const vg = c.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, W * 0.7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.85)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 18; i++) { c.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.05 + ')'; c.fillRect(0, Math.random() * H, W, 1); }
    c.fillStyle = 'rgba(210,190,160,0.5)'; c.font = '700 ' + Math.round(H * 0.04) + 'px system-ui'; c.textAlign = 'center'; c.fillText(VN[v], W / 2, H * 0.94 - 70);
    if (S.flash > 0) { c.fillStyle = 'rgba(255,255,255,' + S.flash + ')'; c.fillRect(0, 0, W, H); }
    if (S.dead >= 0) { // sustos
      const k = S.dead, s = Math.min(1, k / 0.15);
      c.fillStyle = 'rgba(0,0,0,' + (0.7 + 0.3 * s) + ')'; c.fillRect(0, 0, W, H);
      c.save(); c.translate(W / 2 + (Math.random() - 0.5) * 24, H * 0.45 + (Math.random() - 0.5) * 24); monster(S.killer, 0, 0, (H / 380) * (0.9 + 1.8 * s), k * 3, 0.5 + 0.5 * Math.sin(k * 50)); c.restore();
      for (let q = 0; q < 30; q++) { c.fillStyle = 'rgba(' + (Math.random() < 0.3 ? '255,30,20' : '255,255,255') + ',' + Math.random() * 0.3 + ')'; c.fillRect(0, Math.random() * H, W, 1 + Math.random() * 4); }
      if (k > 1.8) { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }
    }
    c.restore();
  }

  /* ---------- lógica ---------- */
  function die(who) { if (S.dead >= 0 || S.win) return; S.dead = 0; S.killer = who; S.shake = 20; scare(); }
  function update(dt) {
    if (S.win) return;
    if (S.dead >= 0) { S.dead += dt; if (S.dead > 2.6 && !S.over) { S.over = true; finish(false); } return; }
    S.t += dt; S.shake = Math.max(0, S.shake - dt * 40); S.flash = Math.max(0, S.flash - dt * 2);
    const h = Math.floor(S.t / S.hourLen);
    if (h !== S.hour) { S.hour = h; if (h < 6) bell(1); }
    if (S.hour >= 6) { S.win = true; bell(3); finish(true); return; }
    const dr = held.door && S.view <= 2 ? S.view : -1, lt = held.light && dr < 0 ? S.view : -1;
    S.hold = dr >= 0 ? S.hold + dt : 0;
    S.aggr = (0.5 + 0.1 * S.n) * (1 + S.hour * 0.12);
    for (const x of S.cr) {
      if (x.away > 0) { x.away -= dt; continue; }
      x.t -= dt;
      if (x.stage === 0 && x.t <= 0) { x.t = 4 + Math.random() * 5 / S.aggr; if (Math.random() < S.aggr) { x.stage = 1; x.door = Math.floor(Math.random() * 3); step(x.door); } else x.t = 3 + Math.random() * 4; }
      else if (x.stage === 1 && x.t <= 0) { x.stage = 2; x.t = 3 + Math.random() * 2; x.atk = 0; step(x.door); }
      else if (x.stage === 2 && x.t <= 0) { x.stage = 3; x.t = 1; x.atk = Math.max(2.2, 4.2 - 0.3 * S.n); step(x.door); }
      if (x.stage >= 2) {
        const muf = dr >= 0 && dr !== x.door ? 0.25 : 1; x.bt = (x.bt || 0) - dt;
        if (x.bt <= 0) { x.bt = x.stage === 3 ? 1.5 : 2.2; if (dr !== x.door) breath(x.door, (x.stage === 3 ? 1 : 0.6) * muf); }
        if (x.stage === 3 && dr !== x.door) { x.atk -= dt; if (x.atk <= 0) { die(x.id); return; } }
        if (lt === x.door) { die(x.id); return; } // lanterna na criatura = sustos
        if (dr === x.door && S.hold > 1.5) { x.stage = 0; x.t = 8 + Math.random() * 8; x.away = 2; slam(); }
      }
    }
    // criatura na cama (a partir da noite 2): acenda a lanterna nela
    const b = S.bed; b.next -= dt;
    if (!b.on && b.next <= 0) { b.on = true; b.t = 0; b.lit = 0; creak(); }
    if (b.on) {
      b.t += dt; b.bt = (b.bt || 0) - dt; if (b.bt <= 0) { b.bt = 0.9; if (ac) { tone(ac.currentTime, 1500, 1480, 0.1, 'sine', 0.12, 4000, 0); } }
      if (S.view === 3 && held.light) { b.lit += dt; if (b.lit > 1.1) { b.on = false; b.next = 14 + Math.random() * 14; S.flash = 0.35; slam(); } } else b.lit = Math.max(0, b.lit - dt);
      if (b.t > 9) { die(3); return; }
    }
    S.pend -= dt; if (S.pend <= 0) { S.pend = 14 + Math.random() * 14; creak(); }
    const near = S.cr.some((x) => x.stage === 3); S.hb = (S.hb || 0) - dt; if (near && S.hb <= 0) { S.hb = 0.7; heart(0.9); }
  }
  function loop(ts) {
    if (!F.active) return;
    const dt = Math.min(0.1, (ts - last) / 1000 || 0.016); last = ts;
    if (G.player) G.player.iframes = 2; // o personagem fica seguro no mundo enquanto você joga
    if (S && !msg.hidden === false) { update(dt); frame(); const hh = S.hour, ap = hh === 0 ? 12 : hh; $('fn-t').textContent = ap + ' AM · NOITE ' + S.n; }
    raf = requestAnimationFrame(loop);
  }
  function show(text, btn, fn) {
    msg.hidden = false; msg.innerHTML = ''; const d = document.createElement('div'); d.textContent = text; msg.appendChild(d);
    const b = document.createElement('button'); b.type = 'button'; b.textContent = btn; b.addEventListener('click', fn); msg.appendChild(b);
  }
  function begin() { S = mk(get()); S.over = false; held.door = held.light = false; msg.hidden = true; aInit(); }
  function report(ok) {
    if (!multi || !G.mp || G.mp.state !== 'on') return;
    G.mp.send({ t: 'ev', to: 'all', k: 'fnafres', ok: !!ok, n: S.n, name: (G.save && G.save.name) || 'Jogador' });
  }
  function finish(ok) {
    report(ok);
    if (ok) {
      const first = S.n === 1; put(Math.min(5, S.n + 1));
      show('06:00 AM\nVocê sobreviveu à Noite ' + S.n + '.' + (first ? '\n\nNOITE 2 e FNAF PARA TODOS desbloqueados!' : ''), S.n >= 5 ? 'SAIR' : 'PRÓXIMA NOITE', () => { if (S.n >= 5) F.stop(); else begin(); });
    } else show('Você foi pego por ' + NAMES[S.killer] + '.', 'TENTAR DE NOVO', begin);
  }
  F.audio = { init: aInit, off: () => { if (amb) amb.gain.value = 0; }, off: () => { if (amb) amb.gain.value = 0; }, burst: (...a) => ac && burst(...a), tone: (...a) => ac && tone(...a), bell, step, slam, heart, scare, creak, ctx: () => ac };
  F.draw = function (ctx, id, x, y, s, t, m) { const o = c; c = ctx; monster(id, x, y, s, t, m); c = o; };
  F.report = function (ok, n) { if (!multi || !G.mp || G.mp.state !== 'on') return; G.mp.send({ t: 'ev', to: 'all', k: 'fnafres', ok: !!ok, n, name: (G.save && G.save.name) || 'Jogador', cl: 1 }); };
  F.multi = () => multi;
  F.start = function (all) {
    if (F.active) return; F.active = true; multi = !!all; root.style.display = 'block'; fit();
    begin(); S.t = 0; last = performance.now(); raf = requestAnimationFrame(loop);
    show('FNAF · NOITE ' + get() + '\nOuça a respiração nas portas.\nFeche a porta (segure) até parar.\nNunca acenda a lanterna na porta com respiração.\nA cama: acenda a lanterna nela.', 'COMEÇAR', () => { msg.hidden = true; });
    S.hold = 0;
    const tg = document.createElement('button'); tg.type = 'button';
    const lab = () => { tg.textContent = 'VERSÃO: ' + (cls() ? 'CLÁSSICA (câmeras)' : 'MODERNA (quarto)'); };
    tg.addEventListener('click', () => { try { localStorage.setItem('ew_fnaf_cls', cls() ? '0' : '1'); } catch (e) { /* sem storage */ } lab(); });
    lab(); msg.appendChild(tg);
    const go = msg.querySelector('button'); go.addEventListener('click', () => { if (cls() && G.fnafc) { F.stop(); G.fnafc.start(multi); } }, true);
  };
  const cls = () => { try { return localStorage.getItem('ew_fnaf_cls') === '1'; } catch (e) { return false; } };
  F.stop = function () { F.active = false; root.style.display = 'none'; cancelAnimationFrame(raf); if (amb) { amb.gain.value = 0; } };
  F.onResult = function (m) { if (G.chat && G.chat.curse) G.chat.curse(m.name + (m.ok ? ' sobreviveu à Noite ' + m.n + ' do FNAF.' : ' foi pego no FNAF.')); };
  $('fn-x').addEventListener('click', F.stop);
  const turn = (d) => { if (S && S.dead < 0) S.view = (S.view + d + 4) % 4; };
  $('fn-l').addEventListener('click', () => turn(-1)); $('fn-r').addEventListener('click', () => turn(1));
  const hold = (id, k) => { const b = $(id); const on = (v) => (e) => { e.preventDefault(); held[k] = v; b.classList.toggle('on', v); if (v && k === 'door') S.hold = 0; }; b.addEventListener('pointerdown', on(true)); ['pointerup', 'pointerleave', 'pointercancel'].forEach((n) => b.addEventListener(n, on(false))); };
  hold('fn-d', 'door'); hold('fn-f', 'light');
  const KM = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r', ' ': 'door', f: 'light', F: 'light' };
  window.addEventListener('keydown', (e) => { if (!F.active || !KM[e.key]) return; e.preventDefault(); e.stopPropagation(); const k = KM[e.key]; if (k === 'l') turn(-1); else if (k === 'r') turn(1); else if (!held[k]) { held[k] = true; if (k === 'door' && S) S.hold = 0; $(k === 'door' ? 'fn-d' : 'fn-f').classList.add('on'); } }, true);
  window.addEventListener('keyup', (e) => { if (!F.active || !KM[e.key]) return; const k = KM[e.key]; if (k === 'door' || k === 'light') { held[k] = false; $(k === 'door' ? 'fn-d' : 'fn-f').classList.remove('on'); } }, true);
})();
