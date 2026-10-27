'use strict';
/* Elemental World — modo terror secreto (estilo Halloween: assusta, mas sem trauma).
   Só existe com multiplayer: o código de administrador é validado pelo servidor de salas (server/src/core.js);
   nada aqui contém o código. O servidor guarda o estado do terror e sincroniza com todos da sala. */
(function () {
  const G = window.G, M = G.M;
  const H = (G.horror = { on: false, k: 0, admin: false, mode: false, imm: true, admins: [], immune: [], reduce: false, panelOpen: false, strong: true, near: 0 });
  const PHRASE = 'THEY WILL CATCH YOU';
  const norm = (s) => String(s == null ? '' : s).toUpperCase().replace(/\s+/g, ' ').trim();
  try { H.reduce = localStorage.getItem('ew_reduce_flash') === '1'; } catch (e) { /* sem storage */ }
  H.isPhrase = (t) => norm(t) === PHRASE;
  H.isAdmin = () => H.admin && H.mode;
  /* imunidade às criaturas: pid de outro jogador, ou o próprio jogador se omitido */
  H.isImmune = (pid) => (pid == null ? H.isAdmin() && H.imm : H.immune.indexOf(pid) >= 0);
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const send = (o) => { if (G.mp && G.mp.state === 'on') G.mp.send(o); };

  /* ---------- interface ---------- */
  const css = document.createElement('style');
  css.textContent = `
#hz-vig{position:fixed;inset:0;z-index:6;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 38%,rgba(70,6,6,.5) 78%,rgba(25,0,0,.85) 100%)}
#hz-auth,#hz-panel{position:fixed;z-index:60;background:rgba(18,10,12,.95);border:2px solid #aa2a1e;border-radius:12px;color:#fff;font:14px system-ui,sans-serif;pointer-events:auto}
#hz-auth{left:50%;top:50%;transform:translate(-50%,-50%);width:min(320px,86vw);padding:16px;display:flex;flex-direction:column;gap:10px}
#hz-auth h3{margin:0;text-align:center;color:#e0533a;letter-spacing:2px;font-size:18px}
#hz-auth input{font:20px ui-monospace,monospace;padding:12px;border-radius:8px;border:1px solid #6a3a36;background:#2a1618;color:#fff;text-align:center;letter-spacing:4px;min-width:0}
#hz-st{min-height:18px;color:#ff9a86;font-size:13px;text-align:center}
#hz-panel{right:8px;top:50%;transform:translateY(-50%);width:min(150px,40vw);padding:6px;display:flex;flex-direction:column;gap:5px}
#hz-auth button,#hz-panel button,#hz-acc{font:700 11px system-ui,sans-serif;color:#fff;border:0;border-radius:6px;padding:8px 6px;background:#7a1f16;touch-action:manipulation}
#hz-panel button.o{background:#b0560e}#hz-panel button.v{background:#4a2f6a}#hz-panel button.x,#hz-auth button.x{background:#3b2a2c}
#hz-acc,#hz-str{position:fixed;bottom:6px;z-index:45;padding:5px 9px;font-size:11px;background:rgba(30,16,18,.8);border:1px solid rgba(255,255,255,.3);pointer-events:auto}
#hz-note{font-size:10px;color:#e6c3b6;line-height:1.25}
#hz-ent{position:fixed;inset:0;z-index:7;pointer-events:none}
#hz-str{left:calc(50% + 120px)}`;
  document.head.appendChild(css);

  const vig = document.createElement('div'); vig.id = 'hz-vig'; document.body.appendChild(vig);
  const auth = document.createElement('div'); auth.id = 'hz-auth'; auth.hidden = true;
  auth.innerHTML = '<h3>ACESSO RESTRITO</h3><input id="hz-code" type="password" maxlength="64" autocomplete="off" inputmode="numeric" placeholder="código"><div id="hz-st"></div><button id="hz-go" type="button">ENVIAR</button><button id="hz-x" class="x" type="button">FECHAR</button>';
  const panel = document.createElement('div'); panel.id = 'hz-panel'; panel.hidden = true;
  const acc = document.createElement('button'); acc.id = 'hz-acc'; acc.type = 'button'; acc.hidden = true;
  const str = document.createElement('button'); str.id = 'hz-str'; str.type = 'button'; str.hidden = true;
  const ent = document.createElement('canvas'); ent.id = 'hz-ent';
  document.body.append(auth, panel, acc, str, ent);
  const $ = (id) => document.getElementById(id);
  const code = $('hz-code'), st = $('hz-st');
  for (const el of [auth, panel, acc, str]) for (const ev of ['pointerdown', 'touchstart', 'mousedown']) el.addEventListener(ev, (e) => e.stopPropagation());
  for (const ev of ['keydown', 'keyup', 'keypress']) code.addEventListener(ev, (e) => e.stopPropagation());

  const mkBtn = (cls, fn) => { const b = document.createElement('button'); b.type = 'button'; if (cls) b.className = cls; b.addEventListener('click', fn); panel.appendChild(b); return b; };
  const bMode = mkBtn('', () => send({ t: 'adm', k: 'mode', on: !H.mode }));
  const bHz = mkBtn('o', () => send({ t: 'adm', k: 'horror', on: !H.on }));
  const bEnt = mkBtn('o', () => { H.spawnEnt(true); send({ t: 'ev', to: 'all', k: 'hzent' }); });
  const bImm = mkBtn('v', () => send({ t: 'adm', k: 'imm', on: !H.imm }));
  const note = document.createElement('div'); note.id = 'hz-note'; panel.appendChild(note);
  const bFn = mkBtn('o', () => { if (G.fnafc) G.fnafc.start(false); });
  const bFnAll = mkBtn('o', () => { if (G.pizza && G.pizza.inside) { send({ t: 'ev', to: 'all', k: 'fnafend' }); G.pizza.exit(); } else { const t0 = Date.now(); send({ t: 'ev', to: 'all', k: 'fnaf', t0 }); G.pizza.enter(t0); } });
  const bClose = mkBtn('x', () => { H.panelOpen = false; refresh(); });
  bClose.textContent = 'FECHAR PAINEL';

  function refresh() {
    panel.hidden = !(H.admin && H.panelOpen);
    bMode.textContent = H.mode ? 'DESATIVAR MODO ADMIN' : 'ATIVAR MODO ADMIN';
    bHz.hidden = !H.mode; bImm.hidden = !H.mode; bEnt.hidden = !(H.mode && H.on); bEnt.textContent = 'INVOCAR O ALTO';
    bFn.hidden = !H.mode; bFn.textContent = 'JOGAR FNAF'; bFnAll.hidden = !H.mode; bFnAll.textContent = G.pizza && G.pizza.inside ? 'ENCERRAR FNAF' : 'FNAF MULTIPLAYER';
    bHz.textContent = H.on ? 'DESATIVAR TERROR' : 'ATIVAR TERROR';
    bImm.textContent = 'IMUNIDADE: ' + (H.imm ? 'LIGADA' : 'DESLIGADA');
    note.textContent = H.mode ? 'Imunidade: criaturas ignoram você.' : 'Ative o modo admin.';
    str.hidden = !H.on; str.textContent = 'Sustos fortes: ' + (H.strong ? 'LIGADO' : 'DESLIGADO');
    acc.hidden = !H.on;
    acc.textContent = 'Reduzir flashes: ' + (H.reduce ? 'LIGADO' : 'DESLIGADO');
  }
  try { H.strong = localStorage.getItem('ew_strong') !== '0'; } catch (e) { H.strong = true; }
  str.addEventListener('click', () => { H.strong = !H.strong; try { localStorage.setItem('ew_strong', H.strong ? '1' : '0'); } catch (e) { /* sem storage */ } if (!H.strong) E.on = false; refresh(); });
  acc.addEventListener('click', () => { H.reduce = !H.reduce; try { localStorage.setItem('ew_reduce_flash', H.reduce ? '1' : '0'); } catch (e) { /* sem storage */ } refresh(); });
  $('hz-x').addEventListener('click', () => { auth.hidden = true; });
  $('hz-go').addEventListener('click', () => {
    const v = code.value; code.value = '';
    if (!G.mp || G.mp.state !== 'on') { st.textContent = 'Entre em uma sala multiplayer: o código é conferido pelo servidor.'; return; }
    if (!v) return;
    st.textContent = 'Verificando…';
    send({ t: 'auth', code: v });
  });
  code.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('hz-go').click(); });

  /* a frase secreta (digitada no chat) abre a autenticação, ou o painel se já autenticado */
  H.openAuth = function () {
    if (H.admin) { H.panelOpen = true; refresh(); return; }
    st.textContent = ''; auth.hidden = false; code.focus();
  };

  /* ---------- estado sincronizado ---------- */
  H.set = function (on) {
    on = !!on; if (on === H.on) return;
    H.on = on; lastSlot = -1;
    if (on) { audioStart(); if (G.ui && G.ui.banner) G.ui.banner('A noite mudou…', 'Fiquem juntos. Não corram.'); }
    else if (G.ui && G.ui.banner) G.ui.banner('O silêncio voltou', 'Tudo está como antes.');
    refresh();
  };
  H.onMsg = function (m) {
    if (m.t === 'auth') {
      if (m.ok) {
        H.admin = true; H.admins = m.admin || []; H.immune = m.immune || [];
        H.imm = H.immune.indexOf(G.mp.pid) >= 0 || !H.mode;
        auth.hidden = true; H.panelOpen = true; st.textContent = '';
        if (typeof m.horror === 'boolean') H.set(m.horror);
      } else st.textContent = m.msg || 'Código incorreto.';
      refresh(); return true;
    }
    if (m.t === 'adm' && m.k === 'mode') { H.mode = !!m.on; refresh(); return true; }
    if (m.t === 'admins') { H.admins = m.admin || []; H.immune = m.immune || []; if (H.admin && H.mode) H.imm = H.immune.indexOf(G.mp.pid) >= 0; refresh(); return true; }
    if (m.t === 'horror') { H.set(m.on); return true; }
    if (m.t === 'ev' && m.k === 'fnaf') { if (G.pizza) G.pizza.onMsg(m); return true; }
    if (m.t === 'ev' && m.k === 'fnafend') { if (G.pizza) G.pizza.exit(); return true; }
    if (m.t === 'ev' && m.k === 'fnafres') { if (G.fnaf) G.fnaf.onResult(m); return true; }
    if (m.t === 'ev' && m.k === 'hzent') { H.spawnEnt(); return true; }
    return false;
  };
  H.onWelcome = function (m) {
    H.admin = false; H.mode = false; H.panelOpen = false; H.imm = true;
    H.admins = m.admin || []; H.immune = m.immune || [];
    H.set(!!m.horror); refresh();
  };
  H.reset = function () {
    H.on = false; H.k = 0; H.admin = false; H.mode = false; H.panelOpen = false; H.imm = true; H.admins = []; H.immune = [];
    auth.hidden = true; vig.style.opacity = 0; audioStop(); refresh();
  };

  /* ---------- ambiente: céu avermelhado, névoa, escuridão e luz piscando ---------- */
  let fl = 1, flT = 5, seq = [], seqT = 0;
  function flicker(dt) {
    flT -= dt;
    if (flT <= 0 && !seq.length) {
      flT = 4 + Math.random() * 9;
      seq = H.reduce ? [{ d: 0.6, v: 0.93 }, { d: 0.6, v: 0.86 }, { d: 0.6, v: 0.93 }] : [{ d: 0.06, v: 0.35 }, { d: 0.08, v: 1 }, { d: 0.05, v: 0.55 }, { d: 0.1, v: 1 }];
      seqT = seq[0].d;
    }
    if (seq.length) { fl = seq[0].v; seqT -= dt; if (seqT <= 0) { seq.shift(); if (seq.length) seqT = seq[0].d; else fl = 1; } } else fl = 1;
  }
  function applyEnv(kk) {
    const e = G.gfx && G.gfx.env; if (!e) return;
    e.top = mix(e.top, [0.22, 0.035, 0.04], kk * 0.92);
    e.hor = mix(e.hor, [0.40, 0.07, 0.04], kk * 0.92);
    e.bot = mix(e.bot, [0.12, 0.02, 0.02], kk * 0.9);
    e.fogCol = mix(e.fogCol, [0.34, 0.07, 0.05], kk * 0.9);
    e.amb = M.shade(mix(e.amb, [0.20, 0.09, 0.10], kk * 0.85), fl * (1 - 0.3 * kk) * (1 - 0.5 * H.near));
    e.sunCol = M.shade(mix(e.sunCol, [0.5, 0.18, 0.12], kk * 0.85), (1 - 0.6 * kk) * fl * (1 - 0.5 * H.near));
    e.stars = e.stars * (1 - kk);
    e.cloud = mix(e.cloud, [0.55, 0.18, 0.16], kk);
    e.fogNear = lerp(e.fogNear, 8, kk);
    e.fogFar = lerp(e.fogFar, e.fogFar * 0.38, kk);
  }

  /* ---------- chat amaldiçoado: a cada 25 s, a mesma mensagem para toda a sala (semente = relógio) ---------- */
  const GL = 'ЖΨΩΔΣΞФЦЧШЭЯ†‡§¶∴'.split('');
  const CLUES = ['não corra... elas ouvem seus passos', 'a luz as incomoda', 'fiquem perto uns dos outros', 'algo observa quem fica parado', 'as sombras mudam de lugar'];
  function rng(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  H.curseText = function (slot) {
    const r = rng(slot * 2654435761);
    if (r() < 0.25) return CLUES[Math.floor(r() * CLUES.length)];
    const words = [], nw = 2 + Math.floor(r() * 3);
    for (let i = 0; i < nw; i++) { let w = ''; const nl = 3 + Math.floor(r() * 5); for (let j = 0; j < nl; j++) w += GL[Math.floor(r() * GL.length)]; words.push(w); }
    return words.join(' ');
  };
  let lastSlot = -1;

  /* ---------- áudio: zumbido grave, ruídos metálicos e sussurros distantes (sintetizados) ---------- */
  let ac = null, gain = null, sg = null, hitT = 6, started = false;
  function audioStart() {
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        ac = new AC(); gain = ac.createGain(); gain.gain.value = 0; gain.connect(ac.destination);
        sg = ac.createGain(); sg.gain.value = 0; sg.connect(ac.destination);
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; lp.connect(gain);
        [[55, 'sawtooth'], [55.8, 'sawtooth'], [82.4, 'triangle']].forEach((o) => { const os = ac.createOscillator(), g = ac.createGain(); os.type = o[1]; os.frequency.value = o[0]; g.gain.value = 0.25; os.connect(g); g.connect(lp); os.start(); });
        const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.09; lg.gain.value = 90; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
        started = true;
      }
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { /* sem áudio */ }
  }
  function audioStop() { if (gain) gain.gain.value = 0; if (sg) sg.gain.value = 0; }
  function hit() {
    if (!ac || !sg) return;
    const t = ac.currentTime;
    if (Math.random() < 0.5) {
      const base = 150 + Math.random() * 200;
      [1, 2.76, 5.4].forEach((r, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = base * r; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 / (i + 1), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8); o.connect(g); g.connect(sg); o.start(t); o.stop(t + 1.9); });
    } else {
      const n = Math.floor(ac.sampleRate * 1.6), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / n);
      const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 1500; f.Q.value = 4;
      const g = ac.createGain(); g.gain.value = 0.5; s.connect(f); f.connect(g); g.connect(sg); s.start(t);
    }
  }

  /* ---------- "O Alto": criatura original (feita por código) que se aproxima devagar e não para ---------- */
  const E = (H.ent = { on: false, x: 0, z: 0, y: 0, d: 99, t: 0, kill: -1 });
  const cv = document.getElementById('hz-ent'), c2 = cv.getContext('2d');
  function fit() { cv.width = window.innerWidth; cv.height = window.innerHeight; }
  window.addEventListener('resize', fit); fit();
  H.spawnEnt = function (demo) {
    const P = G.player;
    if (E.on || !H.on || !P || !P.alive) return;
    if (!demo && (!H.strong || H.isImmune())) return; // quem invoca (admin) sempre vê
    E.demo = !!demo;
    const a = G.cam.yaw + (Math.random() - 0.5) * 1.2;
    E.x = P.x + Math.sin(a) * 38; E.z = P.z + Math.cos(a) * 38; E.on = true; E.t = 0; E.kill = -1; E.d = 38; beatT = 0; E.jumpT = 4; E.glitch = 0; E.swell = false; E.breT = 1; E.warn = 0;
  };
  function figure(x, foot, h, t) { // silhueta altíssima e magra, pescoço longo, braços até o chão com dedos, rosto esticado
    const jit = Math.random() < 0.07 ? (Math.random() - 0.5) * h * 0.05 : 0;
    const sw = Math.sin(t * 1.1) * h * 0.012 + jit, hx = x + sw * 2, hy = foot - h * 0.95, r = h * 0.06;
    c2.shadowColor = 'rgba(200,30,20,0.85)'; c2.shadowBlur = Math.max(6, h * 0.08);
    c2.fillStyle = '#020202'; c2.strokeStyle = '#020202'; c2.lineCap = 'round'; c2.lineJoin = 'round';
    c2.beginPath(); c2.moveTo(x - h * 0.05, foot - h * 0.8); c2.lineTo(x + h * 0.05, foot - h * 0.8); c2.lineTo(x + h * 0.028, foot - h * 0.4); c2.lineTo(x + h * 0.045, foot); c2.lineTo(x + h * 0.012, foot); c2.lineTo(x, foot - h * 0.37); c2.lineTo(x - h * 0.012, foot); c2.lineTo(x - h * 0.045, foot); c2.lineTo(x - h * 0.028, foot - h * 0.4); c2.closePath(); c2.fill();
    c2.lineWidth = Math.max(2, h * 0.016); c2.beginPath(); c2.moveTo(x, foot - h * 0.8); c2.bezierCurveTo(x + sw * 3, foot - h * 0.86, hx - h * 0.03, foot - h * 0.9, hx, hy + r * 1.3); c2.stroke();
    c2.lineWidth = Math.max(1.5, h * 0.012);
    for (const sd of [-1, 1]) {
      const hxn = x + sd * h * 0.09 + sw * 2, hyn = foot - h * 0.1 + Math.sin(t * 1.7 + sd) * h * 0.012;
      c2.beginPath(); c2.moveTo(x + sd * h * 0.05, foot - h * 0.78); c2.quadraticCurveTo(x + sd * h * 0.15 + sw, foot - h * 0.45, hxn, hyn); c2.stroke();
      c2.lineWidth = Math.max(1, h * 0.006);
      for (let f = 0; f < 4; f++) { c2.beginPath(); c2.moveTo(hxn, hyn); c2.lineTo(hxn + (f - 1.5) * h * 0.016 + sd * h * 0.01, hyn + h * (0.07 + 0.015 * (f % 2))); c2.stroke(); }
      c2.lineWidth = Math.max(1.5, h * 0.012);
    }
    face(hx, hy, r, t, 1); c2.shadowBlur = 0;
  }
  function face(x, y, r, t, k) { // rosto esticado: olhos desiguais, rachaduras e sorriso rasgado com dentes finos
    c2.save(); c2.translate(x, y);
    c2.fillStyle = '#c9bcae'; c2.beginPath(); c2.ellipse(0, r * 0.2, r * 0.85, r * 1.45, 0, 0, 7); c2.fill();
    const gr = c2.createRadialGradient(0, 0, r * 0.3, 0, r * 0.2, r * 1.5); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.6)');
    c2.fillStyle = gr; c2.beginPath(); c2.ellipse(0, r * 0.2, r * 0.85, r * 1.45, 0, 0, 7); c2.fill();
    c2.strokeStyle = 'rgba(40,10,10,0.7)'; c2.lineWidth = Math.max(1, r * 0.03);
    for (const cr of [[-0.5, -1.1, -0.3, -0.6], [0.6, -0.9, 0.45, -0.4], [0.1, -1.3, 0.2, -0.9]]) { c2.beginPath(); c2.moveTo(cr[0] * r, cr[1] * r); c2.lineTo(cr[2] * r, cr[3] * r); c2.stroke(); }
    c2.fillStyle = '#030303';
    c2.beginPath(); c2.ellipse(-r * 0.42, -r * 0.35, r * 0.27, r * 0.44, -0.15, 0, 7); c2.fill();
    c2.beginPath(); c2.ellipse(r * 0.4, -r * 0.22, r * 0.2, r * 0.3, 0.1, 0, 7); c2.fill();
    c2.fillStyle = '#fff'; c2.beginPath(); c2.arc(-r * 0.4, -r * 0.3 + Math.sin(t * 2) * r * 0.03, Math.max(1, r * 0.045), 0, 7); c2.fill(); c2.beginPath(); c2.arc(r * 0.42, -r * 0.2, Math.max(1, r * 0.035), 0, 7); c2.fill();
    const op = k > 1 ? 0.35 + 0.25 * Math.sin(t * 45) : 0.06 * Math.sin(t * 3);
    const mw = r * 0.95, my = r * 0.6, dp = r * (0.55 + op * 2.2);
    c2.fillStyle = '#030303'; c2.beginPath(); c2.moveTo(-mw, my - r * 0.15); c2.quadraticCurveTo(0, my + dp * 1.5, mw, my - r * 0.2); c2.quadraticCurveTo(0, my + dp * 0.25 + (k > 1 ? dp * 0.5 : 0), -mw, my - r * 0.15); c2.fill();
    c2.strokeStyle = '#ddd5c4'; c2.lineWidth = Math.max(1, r * 0.028);
    for (let i = -9; i <= 9; i++) { const u = i / 9, px = u * mw * 0.92, tp = my - r * 0.17 + Math.abs(u) * -r * 0.02 + (1 - u * u) * dp * 0.2; c2.beginPath(); c2.moveTo(px, tp); c2.lineTo(px, tp + r * (0.1 + 0.1 * (i % 2 ? 1 : 0.4)) * (k > 1 ? 2 : 1)); c2.stroke(); }
    c2.restore();
  }
  let beatT = 0;
  H.entUpdate = function (dt) {
    c2.clearRect(0, 0, cv.width, cv.height); cv.style.transform = '';
    if (!E.on) { H.near = 0; return; }
    const P = G.player;
    if (!H.on || !P.alive || (!E.demo && (H.isImmune() || !H.strong))) { E.on = false; H.near = 0; return; }
    E.t += dt; E.glitch = Math.max(0, E.glitch - dt);
    const W = cv.width, Hh = cv.height;
    if (E.kill < 0) {
      const dx = P.x - E.x, dz = P.z - E.z; E.d = Math.hypot(dx, dz) || 0.01;
      const top = G.gfx.project ? G.gfx.project(E.x, E.y + 3, E.z) : null, bot = G.gfx.project ? G.gfx.project(E.x, E.y, E.z) : null;
      const seen = !!(top && bot && bot[0] > -W * 0.1 && bot[0] < W * 1.1);
      // quando você olha ele quase para; quando vira as costas ele corre
      let sp = (seen ? 0.7 : 2.4) * dt;
      E.jumpT -= dt;
      if (E.jumpT <= 0 && E.d > 7) { E.jumpT = 3 + Math.random() * 3.5; sp += 2.5; E.glitch = 0.35; click(); } // pula para mais perto
      E.x += dx / E.d * sp; E.z += dz / E.d * sp; E.y = G.world.groundY(E.x, E.z);
      H.near = M.clamp(1 - E.d / 25, 0, 1);
      beatT -= dt; if (beatT <= 0 && started) { beatT = M.clamp(E.d / 30, 0.34, 1.3); heart(); }
      E.breT -= dt; if (E.breT <= 0 && started) { E.breT = M.clamp(E.d / 14, 0.7, 2.2); breath(1 - E.d / 40); if (E.d < 20 && Math.random() < 0.5) hit(); }
      if (!E.swell && E.d < 4.4) { E.swell = true; swell(); }
      if (top && bot && bot[1] > top[1]) { c2.globalAlpha = M.clamp(1 - (E.d - 6) / 40, 0.3, 1); figure(bot[0], bot[1], bot[1] - top[1], E.t); c2.globalAlpha = 1; }
      // estática, vinheta vermelha e tremor da tela conforme ele chega perto
      const it = H.near * 0.6 + (E.glitch > 0 ? 0.5 : 0);
      for (let q = 0, n = Math.floor(4 + it * 70); q < n; q++) { c2.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.25 * (0.3 + it)) + ')'; c2.fillRect(0, Math.random() * Hh, W, 1 + Math.random() * 2); }
      if (H.near > 0.5) cv.style.transform = 'translate(' + ((Math.random() - 0.5) * 8 * H.near) + 'px,' + ((Math.random() - 0.5) * 8 * H.near) + 'px)';
      if (E.d < 1.4) { E.kill = 0; scream(); growl(); setTimeout(chew, 650); }
    } else {
      E.kill += dt; const s = Math.min(1, E.kill / 0.18), r = Math.min(W, Hh) * (0.3 + 0.75 * s);
      c2.fillStyle = 'rgba(0,0,0,' + (0.6 + 0.4 * s) + ')'; c2.fillRect(0, 0, W, Hh);
      c2.save(); c2.translate(W / 2 + (Math.random() - 0.5) * 30, Hh / 2 + (Math.random() - 0.5) * 30); c2.scale(1 + Math.random() * 0.06, 1); face(0, 0, r, E.t, 2); c2.restore();
      for (let q = 0; q < 40; q++) { c2.fillStyle = 'rgba(' + (Math.random() < 0.3 ? '255,30,20' : '255,255,255') + ',' + Math.random() * 0.35 + ')'; c2.fillRect(0, Math.random() * Hh, W, 1 + Math.random() * 5); }
      if (Math.random() < 0.18) { c2.fillStyle = 'rgba(200,0,0,0.5)'; c2.fillRect(0, 0, W, Hh); }
      if (E.kill > 2.6) { c2.fillStyle = '#000'; c2.fillRect(0, 0, W, Hh); }
      if (E.demo && E.kill > 2.4) { E.on = false; H.near = 0; return; } // demonstração do admin: assusta mas não mata
      if (E.kill > 3.6) { E.on = false; H.near = 0; P.iframes = 0; P.guard = false; P.armorT = 0; P.hurt(99999, { fall: true }); }
    }
  };

  /* sons sintetizados originais, em camadas: batimento, respiração, estalo, crescendo, grito, rosnado e mastigação */
  const noiseBuf = (sec, shape) => { const n = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (shape ? shape(i / n) : 1); return b; };
  const burst = (t, sec, type, freq, q, vol, shape) => { const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf(sec, shape); f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(sg); s.start(t); };
  const tone = (t, f0, f1, dur, type, vol, cutoff) => { const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur); f.type = 'lowpass'; f.frequency.value = cutoff || 4000; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(f); f.connect(g); g.connect(sg); o.start(t); o.stop(t + dur + 0.05); };
  function heart() { if (!ac || !sg) return; const t = ac.currentTime; tone(t, 62, 40, 0.2, 'sine', 0.9); tone(t + 0.17, 58, 38, 0.2, 'sine', 0.7); }
  function breath(v) { if (!ac || !sg) return; const t = ac.currentTime; burst(t, 1.1, 'bandpass', 700 + Math.random() * 300, 1.2, 0.5 * M.clamp(v, 0.15, 1), (u) => Math.sin(Math.PI * u) ** 2); }
  function click() { if (!ac || !sg) return; const t = ac.currentTime; burst(t, 0.06, 'highpass', 3000, 1, 1.2, (u) => 1 - u); tone(t, 900, 80, 0.12, 'square', 0.35, 1500); }
  function swell() { // crescendo invertido logo antes do ataque
    if (!ac || !sg) return; const t = ac.currentTime; burst(t, 3, 'highpass', 800, 0.7, 1.0, (u) => u * u * u);
    tone(t, 50, 140, 3, 'sawtooth', 0.7, 400); tone(t, 1200, 4200, 3, 'sine', 0.18, 6000);
  }
  function growl() { if (!ac || !sg) return; const t = ac.currentTime; tone(t, 60, 42, 2.4, 'sawtooth', 1.0, 320); tone(t + 0.05, 91, 61, 2.2, 'square', 0.5, 420); burst(t, 2.2, 'lowpass', 220, 0.6, 0.9, (u) => 1 - u * 0.6); }
  function scream() {
    if (!ac || !sg) return; const t = ac.currentTime;
    const cur = new Float32Array(256); for (let i = 0; i < 256; i++) cur[i] = Math.tanh((i / 128 - 1) * 6);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 14; lg.gain.value = 60; lfo.connect(lg); lfo.start(t); lfo.stop(t + 2.6);
    // [onda, f0, f1, f2, filtro, Q, volume]: grito agudo, grito médio, rugido grave, coro desafinado e guincho metálico
    [['sawtooth', 700, 2100, 1500, 2200, 1, 0.5], ['square', 420, 1300, 900, 1400, 0.8, 0.6], ['sawtooth', 110, 75, 60, 500, 0.7, 0.9],
      ['sawtooth', 500, 1400, 1000, 1600, 1, 0.35], ['sawtooth', 507, 1407, 1007, 1650, 1, 0.35], ['sawtooth', 493, 1393, 993, 1550, 1, 0.35], ['square', 3100, 2800, 2300, 3500, 2, 0.2]].forEach((L) => {
      const o = ac.createOscillator(), ws = ac.createWaveShaper(), f = ac.createBiquadFilter(), g = ac.createGain(); ws.curve = cur;
      o.type = L[0]; o.frequency.setValueAtTime(L[1], t); o.frequency.exponentialRampToValueAtTime(L[2], t + 0.25); o.frequency.exponentialRampToValueAtTime(L[3], t + 1.9); lg.connect(o.frequency);
      f.type = 'bandpass'; f.frequency.value = L[4]; f.Q.value = L[5];
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(L[6], t + 0.04); g.gain.setValueAtTime(L[6], t + 1.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
      o.connect(ws); ws.connect(f); f.connect(g); g.connect(sg); o.start(t); o.stop(t + 2.6);
    });
    burst(t, 2.4, 'highpass', 2500, 0.7, 0.3, (u) => 1 - u * 0.5);
    tone(t, 130, 32, 0.7, 'sine', 1.2, 300); burst(t, 0.4, 'lowpass', 600, 0.7, 1.2, (u) => (1 - u) ** 2); // impacto
  }
  function chew() {
    if (!ac || !sg) return; const t = ac.currentTime; let d = 0;
    for (let i = 0; i < 26; i++) {
      d += 0.1 + Math.random() * 0.13;
      burst(t + d, 0.08, 'bandpass', 300 + Math.random() * 900, 3, 1.3, (u) => (1 - u) ** 2); // crocância molhada
      tone(t + d, 95, 55, 0.14, 'sine', 0.55, 300);
      if (i % 3 === 0) burst(t + d + 0.04, 0.03, 'highpass', 4000, 1, 0.5, (u) => 1 - u); // estalo de boca
      if (i % 5 === 0) tone(t + d, 70, 50, 0.35, 'sawtooth', 0.25, 250); // grunhido por baixo
    }
  }
  /* voz própria (grave e lenta) com a síntese do aparelho; não usa gravações de terceiros */
  const SAY = ['Eu estou atrás de você.', 'Não olhe para trás.', 'Eu vejo você.', 'Fique parado.', 'Estou mais perto.'];
  let voiceT = 40;
  function voice() {
    if (!window.speechSynthesis || (G.save.settings && G.save.settings.sound === false)) return;
    try { const u = new SpeechSynthesisUtterance(SAY[Math.floor(Math.random() * SAY.length)]); u.lang = 'pt-BR'; u.pitch = 0.1; u.rate = 0.55; u.volume = 0.7; window.speechSynthesis.speak(u); } catch (e) { /* sem voz */ }
  }
  let rollT = 20;

  /* ---------- por quadro (chamado logo depois do ciclo de ambiente) ---------- */
  H.tick = function (dt) {
    const tgt = H.on ? 1 : 0, rate = dt / 8; // transformação progressiva em ~8 s
    H.k = tgt > H.k ? Math.min(tgt, H.k + rate) : Math.max(tgt, H.k - rate);
    const kk = H.k * H.k * (3 - 2 * H.k);
    if (H.k > 0.001) { flicker(dt); applyEnv(kk); } else fl = 1;
    vig.style.opacity = (kk * (0.75 + 0.15 * Math.sin(performance.now() / 900))).toFixed(3);
    if (started) {
      const s = G.save && G.save.settings || {};
      const t = ac.currentTime;
      gain.gain.setTargetAtTime(s.music === false ? 0 : 0.12 * kk, t, 0.5);
      sg.gain.setTargetAtTime(s.sound === false ? 0 : 0.5 * kk, t, 0.3);
      if (H.on) { hitT -= dt; if (hitT <= 0) { hitT = 8 + Math.random() * 14; hit(); } }
    }
    H.entUpdate(dt);
    if (H.on) {
      rollT -= dt; if (rollT <= 0) { rollT = 20; if (Math.random() < 0.02) H.spawnEnt(); } // 2% a cada 20 s
      voiceT -= dt; if (voiceT <= 0) { voiceT = 40 + Math.random() * 50; voice(); }
      const slot = Math.floor(Date.now() / 25000);
      if (slot !== lastSlot) { if (lastSlot !== -1 && G.chat && G.chat.curse) G.chat.curse(H.curseText(slot)); lastSlot = slot; }
    }
  };
  const envUpdate = G.env.update;
  G.env.update = function () { envUpdate.apply(this, arguments); H.tick(arguments[0]); };

  /* ---------- NPCs comuns somem (e voltam quando o evento acaba) ---------- */
  function hideNpcs() { if (H.k > 0.6 && G.npcs) for (const n of G.npcs.list) n.inside = true; }
  const npcUpdate = G.npcs.update;
  G.npcs.update = function () { const r = npcUpdate.apply(this, arguments); hideNpcs(); return r; };
  const mpUpdate = G.mp.update;
  G.mp.update = function () { const r = mpUpdate.apply(this, arguments); hideNpcs(); return r; };

  /* ---------- dobras bloqueadas para jogadores comuns (o servidor também descarta os efeitos) ---------- */
  const bendCast = G.bend.cast;
  G.bend.cast = function () {
    if (H.on && !H.isAdmin()) { G.bend.warn('As dobras estão silenciadas…'); return false; }
    return bendCast.apply(this, arguments);
  };

  /* ---------- música normal dá lugar à trilha de terror ---------- */
  if (G.audio && G.audio.music) {
    const music = G.audio.music;
    G.audio.music = function () { if (H.on || H.k > 0.01) return; return music.apply(this, arguments); };
  }
  refresh();
})();
