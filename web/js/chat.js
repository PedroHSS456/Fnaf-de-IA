'use strict';
/* Elemental World — chat de texto e chat de voz entre jogadores (WebRTC, sinalização pelo servidor da sala).
   Só funciona com conexão multiplayer ativa. Nada aqui muda o jogo single-player. */
(function () {
  const G = window.G;
  const C = (G.chat = { open: false, voice: false, log: [], handle: null });
  const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };
  const pcs = new Map(); // pid -> { pc, audio, pend }
  let stream = null;

  const css = document.createElement('style');
  css.textContent = `
#chat-tools{position:fixed;left:8px;top:122px;z-index:40;display:flex;gap:6px;pointer-events:auto}
#chat-tools button{font:600 12px system-ui,sans-serif;padding:6px 10px;border-radius:14px;border:1px solid rgba(255,255,255,.35);background:rgba(10,14,24,.7);color:#fff}
#chat-tools button.on{background:#2e7d32;border-color:#66bb6a}
#chat-panel{position:fixed;left:8px;top:160px;z-index:40;width:min(300px,78vw);background:rgba(10,14,24,.82);border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:8px;color:#fff;font:13px/1.35 system-ui,sans-serif;pointer-events:auto}
#chat-log{max-height:30vh;overflow-y:auto;margin-bottom:6px;display:flex;flex-direction:column;gap:3px}
#chat-log div{word-wrap:break-word;overflow-wrap:anywhere}
#chat-log .sys{color:#aab;font-style:italic}
#chat-log .curse{color:#ff6b5a;font-style:italic;letter-spacing:.5px}
#chat-log b{color:#ffd24a;font-weight:700}
#chat-form{display:flex;gap:6px}
#chat-in{flex:1;min-width:0;font:13px system-ui,sans-serif;padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff}
#chat-form button{font:600 13px system-ui,sans-serif;padding:6px 10px;border-radius:8px;border:0;background:#ffd24a;color:#222}`;
  document.head.appendChild(css);

  const tools = document.createElement('div'); tools.id = 'chat-tools';
  tools.innerHTML = '<button id="ch-btn" type="button">💬 Chat</button><button id="vc-btn" type="button">🎤 Voz: desligada</button>';
  const panel = document.createElement('div'); panel.id = 'chat-panel'; panel.hidden = true;
  panel.innerHTML = '<div id="chat-log"></div><form id="chat-form"><input id="chat-in" maxlength="140" autocomplete="off" placeholder="Digite e Enter"><button type="submit">Enviar</button></form>';
  document.body.appendChild(tools); document.body.appendChild(panel);
  const logEl = panel.querySelector('#chat-log'), input = panel.querySelector('#chat-in'), vbtn = tools.querySelector('#vc-btn');

  // o toque no painel não deve mover a câmera nem atacar
  for (const el of [tools, panel]) {
    for (const ev of ['pointerdown', 'touchstart', 'mousedown']) el.addEventListener(ev, (e) => e.stopPropagation());
  }
  for (const ev of ['keydown', 'keyup', 'keypress']) input.addEventListener(ev, (e) => e.stopPropagation());

  function addLine(name, text, kind) {
    const d = document.createElement('div');
    if (kind === 'sys') { d.className = 'sys'; d.textContent = text; }
    else if (kind === 'curse') { d.className = 'curse'; d.textContent = text; }
    else { const b = document.createElement('b'); b.textContent = name + ': '; d.appendChild(b); d.appendChild(document.createTextNode(text)); }
    logEl.appendChild(d);
    C.log.push(1); if (C.log.length > 80) { C.log.shift(); if (logEl.firstChild) logEl.removeChild(logEl.firstChild); }
    logEl.scrollTop = logEl.scrollHeight;
  }

  tools.querySelector('#ch-btn').addEventListener('click', () => { C.open = !C.open; panel.hidden = !C.open; if (C.open) input.focus(); });
  panel.querySelector('#chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = input.value.trim().slice(0, 140); if (!t) return;
    input.value = '';
    if (G.horror && G.horror.isPhrase(t)) { G.horror.openAuth(); return; } // frase secreta: não vai para o chat
    const MP = G.mp;
    if (!MP || MP.state !== 'on') { addLine('', 'Entre em uma sala multiplayer para conversar.', 'sys'); return; }
    MP.send({ t: 'ev', to: 'all', k: 'chat', m: t });
    addLine(G.save.settings.name || 'Você', t, 'me');
  });

  /* ---------- voz ---------- */
  function sig(pid, d) { G.mp.send({ t: 'ev', to: pid, k: 'vsig', d }); }
  function peer(pid) {
    if (pcs.has(pid)) return pcs.get(pid);
    const pc = new RTCPeerConnection(ICE);
    const rec = { pc, audio: null, pend: [] };
    if (stream) stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.onicecandidate = (e) => { if (e.candidate) sig(pid, { ice: e.candidate.toJSON() }); };
    pc.ontrack = (e) => {
      if (!rec.audio) { rec.audio = document.createElement('audio'); rec.audio.autoplay = true; rec.audio.playsInline = true; document.body.appendChild(rec.audio); }
      rec.audio.srcObject = e.streams[0] || new MediaStream([e.track]);
      const p = rec.audio.play && rec.audio.play(); if (p && p.catch) p.catch(() => {});
    };
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' || pc.connectionState === 'closed') drop(pid); };
    pcs.set(pid, rec);
    return rec;
  }
  function drop(pid) {
    const rec = pcs.get(pid); if (!rec) return;
    try { rec.pc.close(); } catch (e) { /* já fechada */ }
    if (rec.audio) rec.audio.remove();
    pcs.delete(pid);
  }
  async function offerTo(pid) {
    if (pcs.has(pid)) return;
    const rec = peer(pid);
    try { const o = await rec.pc.createOffer(); await rec.pc.setLocalDescription(o); sig(pid, { sdp: rec.pc.localDescription }); } catch (e) { drop(pid); }
  }
  function onHi(pid) {
    if (!C.voice || !G.mp || !G.mp.pid || pid === G.mp.pid) return;
    // o de menor id oferece a conexão; o outro responde para ele oferecer
    if (G.mp.pid < pid) offerTo(pid);
    else G.mp.send({ t: 'ev', to: pid, k: 'vhi' });
  }
  async function onSig(pid, d) {
    if (!C.voice || !d) return;
    const rec = peer(pid);
    try {
      if (d.sdp) {
        await rec.pc.setRemoteDescription(d.sdp);
        for (const c of rec.pend.splice(0)) await rec.pc.addIceCandidate(c);
        if (d.sdp.type === 'offer') {
          const a = await rec.pc.createAnswer(); await rec.pc.setLocalDescription(a); sig(pid, { sdp: rec.pc.localDescription });
        }
      } else if (d.ice) {
        if (rec.pc.remoteDescription) await rec.pc.addIceCandidate(d.ice); else rec.pend.push(d.ice);
      }
    } catch (e) { /* sinal atrasado ou inválido: ignora */ }
  }
  async function setVoice(on) {
    if (on) {
      if (!G.mp || G.mp.state !== 'on') { G.ui.toast('Entre em uma sala multiplayer para usar a voz.', 'err'); return; }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { G.ui.toast('Este aparelho não permite usar o microfone aqui.', 'err'); return; }
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); }
      catch (e) { G.ui.toast('Microfone não permitido.', 'err'); return; }
      C.voice = true; vbtn.textContent = '🎤 Voz: ligada'; vbtn.classList.add('on');
      G.mp.send({ t: 'ev', to: 'all', k: 'vhi' });
      addLine('', 'Voz ligada. Quem também ligar a voz vai te ouvir.', 'sys');
    } else {
      C.voice = false; vbtn.textContent = '🎤 Voz: desligada'; vbtn.classList.remove('on');
      for (const pid of [...pcs.keys()]) drop(pid);
      if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    }
  }
  vbtn.addEventListener('click', () => setVoice(!C.voice));

  // quem sai da sala perde o áudio; se a sala cair, a voz desliga
  setInterval(() => {
    const MP = G.mp;
    if (C.voice && (!MP || MP.state !== 'on')) { setVoice(false); return; }
    if (!MP || !MP.players) return;
    for (const pid of [...pcs.keys()]) if (!MP.players.has(pid)) drop(pid);
  }, 1000);

  C.curse = function (text) { addLine('', text, 'curse'); if (!C.open) { C.open = true; panel.hidden = false; } };

  /* mensagens recebidas (chamado por multi.js) */
  C.handle = function (m) {
    if (m.k === 'chat') {
      const p = G.mp && G.mp.players && G.mp.players.get(m.from);
      addLine((p && p.name) || 'Jogador', String(m.m || '').slice(0, 140), 'in');
      return true;
    }
    if (m.k === 'vhi') { onHi(m.from); return true; }
    if (m.k === 'vsig') { onSig(m.from, m.d); return true; }
    return false;
  };
  addLine('', 'Chat: digite aqui para falar com os outros jogadores da sala.', 'sys');
})();
