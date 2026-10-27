/* FNAF clássico — modo normal: usa IMAGENS (quadros pré-renderizados trocados como slides, a técnica dos jogos originais).
   Escritório, 18 câmeras e as criaturas são imagens em web/img/fnaf. A lógica segue o método clássico: nível de IA de 0 a 20,
   "oportunidade de movimento" a cada poucos segundos (sorteia 1–20; se ≤ nível, anda), energia, portas e luzes. */
(function () {
  'use strict';
  const G = window.G, F = G.fnaf;
  const C = (G.fnafc = { active: false });
  const KEY = 'ew_fnafc_n';
  const get = () => { try { return Math.max(1, Math.min(5, parseInt(localStorage.getItem(KEY), 10) || 1)); } catch (e) { return 1; } };
  const put = (n) => { try { localStorage.setItem(KEY, String(n)); } catch (e) { /* sem storage */ } };

  const css = document.createElement('style');
  css.textContent = `
#fc{position:fixed;inset:0;z-index:90;background:#000;display:none;touch-action:none;user-select:none;-webkit-user-select:none}
#fc canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
#fc .b{position:absolute;font:700 12px system-ui,sans-serif;color:#fff;background:rgba(40,40,44,.85);border:2px solid #666;border-radius:9px;padding:11px 8px;touch-action:none;text-align:center;min-width:56px}
#fc .b.on{background:#b3261a;border-color:#ff7a66}
#fc #fc-ld{left:6px;top:30%}#fc #fc-ll{left:6px;top:48%}#fc #fc-rd{right:6px;top:30%}#fc #fc-rl{right:6px;top:48%}
#fc #fc-cam{left:50%;transform:translateX(-50%);bottom:6px;min-width:150px}
#fc #fc-x{top:6px;right:6px;font-size:11px;padding:5px 9px;min-width:0}
#fc #fc-hud{position:absolute;top:6px;left:10px;color:#e8e0d0;font:700 14px ui-monospace,monospace;text-shadow:0 0 5px #000;pointer-events:none}
#fc #fc-cams{position:absolute;right:6px;bottom:6px;display:none;width:min(250px,38vw);height:min(285px,74vh);background:rgba(0,6,10,.82);border:2px solid #9fb6cc;border-radius:6px}
#fc #fc-cams svg{position:absolute;inset:0;width:100%;height:100%}
#fc #fc-cams .b{position:absolute;transform:translate(-50%,-50%);min-width:0;padding:3px 5px;font:700 10px ui-monospace,monospace;border-width:1px;background:rgba(10,20,30,.9);border-color:#9fb6cc;border-radius:3px;line-height:1.1}
#fc #fc-cams .b.sel{background:#2f7a52;border-color:#9affb8}
#fc #fc-cams .b.door{border-color:#ffd45a}
#fc #fc-cams .b i{font-style:normal;display:block;font-size:9px;color:#ff6a5a;min-height:10px}
#fc #fc-cams .you{position:absolute;left:50%;bottom:2%;transform:translateX(-50%);font:700 11px ui-monospace,monospace;color:#fff;border:1px solid #fff;padding:2px 8px}
#fc #fc-m{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#e8e0d0;font:700 20px system-ui,sans-serif;text-align:center;background:rgba(0,0,0,.8);padding:20px;white-space:pre-line}
#fc #fc-m button{font:700 15px system-ui,sans-serif;padding:12px 20px;border-radius:10px;border:0;background:#b3261a;color:#fff}`;
  document.head.appendChild(css);
  const root = document.createElement('div'); root.id = 'fc';
  root.innerHTML = '<canvas></canvas><div id="fc-hud"></div><button class="b" id="fc-x" type="button">SAIR</button>' +
    '<button class="b" id="fc-ld" type="button">PORTA ESQ</button><button class="b" id="fc-ll" type="button">LUZ ESQ</button>' +
    '<button class="b" id="fc-rd" type="button">PORTA DIR</button><button class="b" id="fc-rl" type="button">LUZ DIR</button>' +
    '<button class="b" id="fc-cam" type="button">CÂMERAS</button><div id="fc-cams"></div><div id="fc-m" hidden></div>';
  document.body.appendChild(root);
  const $ = (id) => document.getElementById(id);
  const cv = root.querySelector('canvas'), g = cv.getContext('2d'), msg = $('fc-m');
  const W = 1280, H = 720; cv.width = W; cv.height = H;

  /* ---------- imagens ---------- */
  const IMG = {}; let loaded = 0, total = 0, ready = false;
  const CAMS = ['1A', '1B', '1C', '2A', '2B', '3', '4A', '4B', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'];
  const WHO = ['freddy', 'bonnie', 'chica', 'foxy'];
  const NAMES = ['Freddy', 'Bonnie', 'Chica', 'Foxy'];
  function load() {
    if (total) return;
    const list = ['office', 'door'].concat(CAMS.map((c) => 'cam' + c), WHO.map((w) => w + '_far'), WHO.map((w) => w + '_close'));
    total = list.length;
    list.forEach((n) => { const im = new Image(); im.onload = im.onerror = () => { loaded++; if (loaded >= total) ready = true; }; im.src = 'img/fnaf/' + n + '.jpg'; IMG[n] = im; });
  }

  /* ---------- caminhos (cada criatura percorre as câmeras até uma porta) ---------- */
  const ROUTE = [['1B', '2A', '3', '4B', '10', 'R'], ['1B', '1C', '5', '4A', '12', 'L'], ['1B', '2B', '8', '9', '13', 'R'], ['1A', '7', '6', '11', 'L']];
  const LVL = [[2, 2, 2, 1], [4, 4, 3, 3], [6, 6, 5, 5], [9, 9, 8, 8], [13, 13, 12, 12]];
  let S = null, raf = 0, last = 0;
  const held = {};
  const HOUR = 45;
  function mk(n) { return { n, t: 0, hour: 0, pow: 100, ai: LVL[n - 1].slice(), pos: [0, 0, 0, 0], wait: [3, 5, 7, 6], door: [0, 0], dpos: [0, 0], light: [false, false], cam: false, camSel: '1B', scroll: 0.5, dead: -1, killer: -1, out: false, outT: 0, over: false, win: false, atk: [0, 0, 0, 0], flick: 0 }; }
  const at = (i) => ROUTE[i][S.pos[i]];
  const atDoor = (i) => { const r = at(i); return r === 'L' ? 0 : r === 'R' ? 1 : -1; };

  function die(id) { if (S.dead >= 0) return; S.dead = 0; S.killer = id; F.audio.scare(); }
  function powerOut() { S.out = true; S.door = [0, 0]; S.light = [false, false]; S.cam = false; S.outT = 0; $('fc-cams').style.display = 'none'; ['ld', 'rd', 'll', 'rl', 'cam'].forEach((k) => btn[k].classList.remove('on')); const a = F.audio; if (a.ctx()) a.tone(a.ctx().currentTime, 300, 40, 1.8, 'sawtooth', 0.4, 500); }
  function update(dt) {
    if (S.win || S.over) return;
    for (let i = 0; i < 2; i++) S.dpos[i] += (S.door[i] - S.dpos[i]) * Math.min(1, dt * 12);
    if (S.dead >= 0) { S.dead += dt; if (S.dead > 2.6) { S.over = true; end(false); } return; }
    S.t += dt; const h = Math.floor(S.t / HOUR);
    if (h !== S.hour) { S.hour = h; if (h >= 6) { S.win = true; F.audio.bell(3); end(true); return; } F.audio.bell(1); if (h >= 2) S.ai = S.ai.map((a, i) => a + (h === 2 && i === 3 ? 0 : 1)); }
    if (!S.out) {
      const use = 1 + S.door.filter(Boolean).length + S.light.filter(Boolean).length + (S.cam ? 1 : 0);
      S.pow -= dt * use * 0.28; if (S.pow <= 0) { S.pow = 0; powerOut(); }
    } else { S.outT += dt; if (S.outT > 9) die(0); }
    const watching = (i) => S.cam && S.camSel === at(i);
    for (let i = 0; i < 4; i++) {
      S.wait[i] -= dt; if (S.wait[i] > 0) continue; S.wait[i] = 4.2 + i * 0.4 + Math.random() * 1.2;
      if (S.ai[i] <= 0 || (!S.out && Math.random() * 20 > S.ai[i])) continue;
      const last = ROUTE[i].length - 1, d = atDoor(i);
      if (d < 0) {
        if (i === 0 && watching(i)) continue; // Freddy não anda enquanto você o observa
        if (i === 2 && !S.cam) continue; // Chica só anda com a câmera aberta
        if (i === 3 && S.cam) continue; // Foxy só anda com a câmera abaixada
        S.pos[i]++; if (atDoor(i) >= 0) { S.atk[i] = 0; F.audio.step(atDoor(i) ? 2 : 0); } else F.audio.step(1);
      } else if (!S.door[d] || S.out) { die(i); return; } else { S.pos[i] = Math.max(0, last - 3); F.audio.slam(); }
    }
    for (let i = 0; i < 4; i++) { const d = atDoor(i); if (d >= 0) { S.atk[i] += dt; if (S.atk[i] > 11 && !S.door[d]) { die(i); return; } } }
  }

  /* ---------- desenho ---------- */
  const OPEN = [[108, 118, 160, 520], [1090, 118, 160, 520]]; // vãos das portas no quadro do escritório (x, y, w, h)
  function cover(im, x, y, w, h) { const r = Math.max(w / im.width, h / im.height), sw = w / r, sh = h / r; g.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, w, h); }
  function noise(a) { for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(255,255,255,' + Math.random() * a + ')'; g.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 12, 1 + Math.random() * 2); } }
  function drawOffice() {
    const im = IMG.office, k = 1.18, sw = im.width / k, sh = im.height / k, sx = S.scroll * (im.width - sw), sy = (im.height - sh) * 0.55, fx = W / sw, fy = H / sh;
    g.drawImage(im, sx, sy, sw, sh, 0, 0, W, H);
    for (let i = 0; i < 2; i++) {
      const o = OPEN[i], x = (o[0] - sx) * fx, y = (o[1] - sy) * fy, w = o[2] * fx, hh = o[3] * fy;
      g.save(); g.beginPath(); g.rect(x, y, w, hh); g.clip();
      const lit = S.light[i];
      if (lit && !S.out) { // luz do corredor
        const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(i ? 1 : 0, 'rgba(255,238,190,0.55)'); gr.addColorStop(i ? 0 : 1, 'rgba(255,238,190,0.12)'); g.fillStyle = gr; g.fillRect(x, y, w, hh);
        for (let c = 0; c < 4; c++) if (atDoor(c) === i && !S.door[i]) { g.globalAlpha = 0.95; cover(IMG[WHO[c] + '_close'], x, y, w, hh); g.globalAlpha = 1; }
      }
      if (S.dpos[i] > 0.02) { // porta de aço descendo
        const dh = hh * Math.min(1, S.dpos[i]); g.drawImage(IMG.door, 0, 0, IMG.door.width, IMG.door.height, x - w * 0.12, y + hh - dh, w * 1.24, hh * 1.04);
        g.fillStyle = 'rgba(0,0,0,' + (1 - S.dpos[i]) * 0.6 + ')'; g.fillRect(x, y, w, hh - dh);
      }
      g.restore();
    }
    const dk = S.out ? 0.88 : (S.pow < 20 ? 0.12 + 0.25 * (Math.sin(S.t * 31) > 0.7 ? 1 : 0) : 0);
    if (dk) { g.fillStyle = 'rgba(0,0,0,' + dk + ')'; g.fillRect(0, 0, W, H); }
    if (S.out && S.outT > 5 && Math.floor(S.t * 3) % 2) { g.globalAlpha = 0.5; cover(IMG.freddy_close, W * 0.3, H * 0.15, W * 0.4, H * 0.7); g.globalAlpha = 1; }
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.65); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
  function drawCam() {
    let who = -1; for (let i = 0; i < 4; i++) if (at(i) === S.camSel) { who = i; break; }
    const im = who >= 0 ? IMG[WHO[who] + '_far'] : IMG['cam' + S.camSel];
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H); const m = 60; cover(im, m, 30, W - m * 2, H - 60);
    noise(0.14); g.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 30; y < H - 30; y += 4) g.fillRect(m, y, W - m * 2, 1);
    g.strokeStyle = 'rgba(200,220,255,0.6)'; g.lineWidth = 3; g.strokeRect(m, 30, W - m * 2, H - 60);
    g.fillStyle = 'rgba(230,230,220,0.9)'; g.font = '700 22px ui-monospace,monospace'; g.fillText('CÂMERA ' + S.camSel, m + 16, 64);
    if (Math.floor(S.t * 2) % 2) { g.fillStyle = '#e33'; g.beginPath(); g.arc(W - m - 30, 62, 8, 0, 7); g.fill(); }
  }
  function draw() {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    if (S.dead >= 0) {
      const k = S.dead, s = Math.min(1, k / 0.12), im = IMG[WHO[S.killer] + '_close'], z = 1.1 + 0.8 * s + Math.random() * 0.05;
      g.save(); g.translate(W / 2 + (Math.random() - 0.5) * 30, H / 2 + (Math.random() - 0.5) * 30); g.scale(z, z); g.filter = 'brightness(' + (1 + Math.random() * 0.8) + ') contrast(1.3)'; cover(im, -W / 2, -H / 2, W, H); g.restore(); g.filter = 'none';
      for (let q = 0; q < 40; q++) { g.fillStyle = 'rgba(255,' + (Math.random() < 0.3 ? '30,20' : '255,255') + ',' + Math.random() * 0.3 + ')'; g.fillRect(0, Math.random() * H, W, 1 + Math.random() * 5); }
      if (k > 1.8) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); } return;
    }
    if (S.cam && !S.out) drawCam(); else drawOffice();
    noise(0.04);
  }
  function loop(ts) {
    if (!C.active) return; const dt = Math.min(0.1, (ts - last) / 1000 || 0.016); last = ts;
    if (G.player) G.player.iframes = 2;
    if (msg.hidden && S && ready) {
      if (held.sl) S.scroll = Math.max(0, S.scroll - dt * 0.7); if (held.sr) S.scroll = Math.min(1, S.scroll + dt * 0.7);
      update(dt); draw(); if (S.cam) C.mapRefresh();
      const hh = S.hour === 0 ? 12 : S.hour; $('fc-hud').textContent = hh + ' AM · NOITE ' + S.n + ' · ENERGIA ' + Math.ceil(S.pow) + '%';
    }
    raf = requestAnimationFrame(loop);
  }
  function show(text, label, fn) { msg.hidden = false; msg.innerHTML = ''; const d = document.createElement('div'); d.textContent = text; msg.appendChild(d); const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', fn); msg.appendChild(b); }
  function begin() { S = mk(get()); msg.hidden = true; held.sl = held.sr = false; Object.keys(btn).forEach((k) => btn[k].classList.remove('on')); $('fc-cams').style.display = 'none'; F.audio.init(); }
  function end(ok) {
    F.report(ok, S.n);
    if (ok) { put(Math.min(5, S.n + 1)); show('06:00 AM\nSobreviveu à Noite ' + S.n + '.', S.n >= 5 ? 'SAIR' : 'PRÓXIMA NOITE', () => { if (S.n >= 5) C.stop(); else begin(); }); }
    else show('Você foi pego por ' + NAMES[S.killer] + '.', 'TENTAR DE NOVO', begin);
  }
  C.start = function () {
    if (C.active) return; C.active = true; if (G.main.running) G.main.paused = false; root.style.display = 'block'; last = performance.now(); load(); begin();
    raf = requestAnimationFrame(loop);
    show('FNAF · NOITE ' + get() + '\nVigie as câmeras e feche as portas.\nA luz mostra quem está na porta.\nA energia acaba: economize!\nToque nas bordas (ou ←/→) para olhar de lado.\nPC: A/D portas · Z/X luz · W câmeras · Q/E troca câmera · Esc sai.', 'COMEÇAR', () => { if (ready) msg.hidden = true; });
  };
  C.stop = function () { C.active = false; root.style.display = 'none'; cancelAnimationFrame(raf); if (G.main.running) { G.main.paused = false; G.ui.menu(null); } else G.ui.menu('title'); };
  C.state = () => S;
  $('fc-x').addEventListener('click', C.stop);
  // acesso para todos os jogadores: o clássico fica no menu de pausa; o multiplayer só depois de terminar a Noite 1
  const pzF = $('pz-fnaf'), pzM = $('pz-fnafmp');
  const unlockedMp = () => { try { return (parseInt(localStorage.getItem(KEY), 10) || 1) >= 2; } catch (e) { return false; } };
  pzF.hidden = false; pzF.addEventListener('click', () => { G.ui.menu(null); C.start(); });
  // multiplayer: quem já passou a Noite 1 pode iniciar a pizzaria para todos; os outros só entram quando o admin inicia
  pzM.hidden = false;
  pzM.addEventListener('click', () => {
    G.ui.menu(null);
    if (G.pizza && G.pizza.inside) { G.ui.toast('Você já está no FNAF multiplayer.'); return; }
    if (!G.mp || G.mp.state !== 'on') { G.fnafMode = true; G.ui.menu('multi'); G.ui.toast('Crie uma sala: a pizzaria começa para quem entrar.'); return; }
    const t0 = Date.now(); G.mp.send({ t: 'ev', to: 'all', k: 'fnaf', t0 }); G.pizza.enter(t0);
  });
  const btn = { ld: $('fc-ld'), ll: $('fc-ll'), rd: $('fc-rd'), rl: $('fc-rl'), cam: $('fc-cam') };
  const tog = (sd) => { if (!S || S.out || S.dead >= 0) return; S.door[sd] = S.door[sd] ? 0 : 1; btn[sd ? 'rd' : 'ld'].classList.toggle('on', !!S.door[sd]); F.audio.slam(); };
  btn.ld.addEventListener('click', () => tog(0)); btn.rd.addEventListener('click', () => tog(1));
  [['ll', 0], ['rl', 1]].forEach(([id, sd]) => {
    const on = (v) => (e) => { e.preventDefault(); if (!S || S.out || S.dead >= 0) return; S.light[sd] = v; btn[id].classList.toggle('on', v); if (v) { S.light[1 - sd] = false; btn[sd ? 'll' : 'rl'].classList.remove('on'); } };
    btn[id].addEventListener('pointerdown', on(true)); ['pointerup', 'pointerleave', 'pointercancel'].forEach((n) => btn[id].addEventListener(n, on(false)));
  });
  const cl = $('fc-cams');
  // mapa das câmeras: cada botão é uma câmera; marcadores mostram quem está nela (F Freddy, B Bonnie, C Chica, X Foxy)
  const MAP = { '1A': [24, 8], '1B': [50, 8], '2A': [68, 22], '2B': [90, 22], '1C': [38, 22], '7': [12, 22], '5': [38, 38], '3': [68, 38], '8': [90, 38], '6': [12, 38], '4A': [38, 54], '4B': [68, 54], '9': [90, 54], '11': [12, 54], '12': [24, 70], '10': [64, 70], '13': [90, 70], '14': [50, 22] };
  const DOORS = { '12': 'ESQ', '11': 'ESQ', '10': 'DIR', '13': 'DIR' };
  let svg = '<svg viewBox="0 0 100 100" preserveAspectRatio="none">';
  [['1A', '7'], ['7', '6'], ['6', '11'], ['1B', '2A'], ['2A', '3'], ['3', '4B'], ['4B', '10'], ['1B', '1C'], ['1C', '5'], ['5', '4A'], ['4A', '12'], ['1B', '2B'], ['2B', '8'], ['8', '9'], ['9', '13'], ['1A', '1B'], ['11', '12'], ['10', '13']].forEach(([a, b]) => { svg += '<line x1="' + MAP[a][0] + '" y1="' + MAP[a][1] + '" x2="' + MAP[b][0] + '" y2="' + MAP[b][1] + '" stroke="#5f7a90" stroke-width="0.7"/>'; });
  svg += '<line x1="50" y1="88" x2="24" y2="70" stroke="#ffd45a" stroke-width="0.7"/><line x1="50" y1="88" x2="64" y2="70" stroke="#ffd45a" stroke-width="0.7"/><line x1="50" y1="88" x2="90" y2="70" stroke="#ffd45a" stroke-width="0.7"/><line x1="50" y1="88" x2="12" y2="54" stroke="#ffd45a" stroke-width="0.7"/></svg>';
  cl.innerHTML = svg; const mb = {};
  CAMS.forEach((n) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'b' + (DOORS[n] ? ' door' : ''); b.style.left = MAP[n][0] + '%'; b.style.top = MAP[n][1] + '%'; b.innerHTML = n + '<i></i>'; b.addEventListener('click', () => { if (S) S.camSel = n; }); cl.appendChild(b); mb[n] = b; });
  const you = document.createElement('div'); you.className = 'you'; you.textContent = 'VOCÊ'; cl.appendChild(you);
  const INI = ['F', 'B', 'C', 'X'];
  C.mapRefresh = function () { if (!S) return; CAMS.forEach((n) => { let t = ''; for (let i = 0; i < 4; i++) if (at(i) === n) t += INI[i]; const el = mb[n].lastChild; if (el.textContent !== t) el.textContent = t; mb[n].classList.toggle('sel', S.camSel === n); });
    let l = '', r = ''; for (let i = 0; i < 4; i++) { if (at(i) === 'L') l += INI[i]; if (at(i) === 'R') r += INI[i]; } const t = (l ? 'ESQ:' + l + ' ' : '') + 'VOCÊ' + (r ? ' DIR:' + r : ''); if (you.textContent !== t) you.textContent = t; };
  btn.cam.addEventListener('click', () => { if (!S || S.out || S.dead >= 0) return; S.cam = !S.cam; btn.cam.classList.toggle('on', S.cam); cl.style.display = S.cam ? 'block' : 'none'; S.light = [false, false]; btn.ll.classList.remove('on'); btn.rl.classList.remove('on'); });
  const edge = (e) => { if (e.target !== cv || !S) return; const x = e.clientX / window.innerWidth; held.sl = x < 0.18; held.sr = x > 0.82; };
  root.addEventListener('pointermove', edge); root.addEventListener('pointerdown', edge); root.addEventListener('pointerup', () => { held.sl = held.sr = false; });
  window.addEventListener('keydown', (e) => { if (!C.active) return; if (e.key === 'ArrowLeft') held.sl = true; else if (e.key === 'ArrowRight') held.sr = true; else return; e.preventDefault(); e.stopPropagation(); }, true);
  window.addEventListener('keyup', (e) => { if (e.key === 'ArrowLeft') held.sl = false; if (e.key === 'ArrowRight') held.sr = false; }, true);
  // teclado para PC: A/D portas, Z/X luzes (segure), W câmeras
  window.addEventListener('keydown', (e) => { if (!C.active || !S || S.out || S.dead >= 0) return; const k = e.key.toLowerCase(); if (k === 'a') tog(0); else if (k === 'd') tog(1); else if (k === 'w') btn.cam.click(); else if (k === 'escape') C.stop(); else if ((k === 'q' || k === 'e') && S.cam) { const i = Math.max(0, CAMS.indexOf(S.camSel)); mb[CAMS[(i + (k === 'e' ? 1 : CAMS.length - 1)) % CAMS.length]].click(); } else if (k === 'z' || k === 'x') { const sd = k === 'z' ? 0 : 1; S.light[sd] = true; S.light[1 - sd] = false; btn[sd ? 'rl' : 'll'].classList.add('on'); } });
  window.addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); if (!S) return; if (k === 'z' || k === 'x') { const sd = k === 'z' ? 0 : 1; S.light[sd] = false; btn[sd ? 'rl' : 'll'].classList.remove('on'); } });
  // botões também na tela de início, para todos
  const tF = $('m-fnaf'), tM = $('m-fnafmp');
  if (tF) tF.addEventListener('click', () => { G.ui.menu(null); C.start(); });
  if (tM) tM.addEventListener('click', () => { $('pz-fnafmp').click(); });
})();
