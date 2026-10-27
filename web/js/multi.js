'use strict';
/* Elemental World — multiplayer por salas online.
   Jogo single-player continua igual: tudo aqui só age quando há conexão ativa (G.mp.state === 'on').
   Cada jogador mantém o próprio progresso; o mundo é o mesmo (seed fixa), e aqui só trafegam posição, aparência e nome. */
(function () {
  const G = window.G, M = G.M;
  const MP = (G.mp = { ws: null, state: 'off', pid: null, seq: null, room: null, roomName: '', players: new Map(), sendT: 0, lookSent: '', lookT: 0, tags: null, bossDead: {} });
  const base = () => String(window.MP_SERVER || '').replace(/\/+$/, '');
  const httpBase = () => base().replace(/^ws(s?):/, 'http$1:');
  MP.configured = () => /^wss?:\/\/[^/]+/.test(base());
  const $ = (id) => document.getElementById(id);
  const r2 = (v) => Math.round(v * 100) / 100, r3 = (v) => Math.round(v * 1000) / 1000;
  const look = () => (G.S ? G.models.playerLook(G.S) : { el: 'avatar' });
  // aparência vinda da rede: completa os campos com os mesmos padrões do jogador local
  const norm = (lk) => G.models.playerLook({ element: (lk && lk.el) || 'avatar', look: lk || {} });

  MP.setStatus = function (msg, cls) { const el = $('mp-status'); if (el) { el.textContent = msg; el.dataset.s = cls || ''; } };

  /* ---------- HTTP: lista e criação ---------- */
  MP.list = async function () {
    if (!MP.configured()) throw new Error('servidor não configurado');
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
    try { const r = await fetch(httpBase() + '/rooms', { signal: ctl.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    finally { clearTimeout(t); }
  };
  MP.create = async function (name) {
    const r = await fetch(httpBase() + '/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'não foi possível criar a sala');
    return j;
  };

  /* ---------- WebSocket ---------- */
  MP.join = function (id, name) {
    MP.leave(true);
    return new Promise((resolve, reject) => {
      let done = false, ws = null, timer = null;
      const fail = (msg) => {
        if (done) return; done = true; clearTimeout(timer);
        if (ws) { try { ws.close(); } catch (e) { /* já fechado */ } }
        if (MP.ws === ws) MP.ws = null;
        MP.state = 'off'; MP.room = null; reject(new Error(msg));
      };
      MP.state = 'connecting'; MP.room = id; MP.roomName = name || ''; MP.setStatus('Conectando à sala…');
      timer = setTimeout(() => fail('Tempo esgotado. Verifique sua conexão com a internet e tente de novo.'), 10000);
      try { ws = new WebSocket(base() + '/room/' + encodeURIComponent(id)); } catch (e) { return fail('Não foi possível abrir a conexão.'); }
      MP.ws = ws;
      ws.onopen = () => ws.send(JSON.stringify({ t: 'hi', name: (G.save.settings.name || 'Player').slice(0, 16), look: look() }));
      ws.onmessage = (ev) => {
        let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (!done) {
          if (m.t === 'welcome') {
            done = true; clearTimeout(timer); MP.state = 'on'; MP.pid = m.pid; MP.seq = m.seq; MP.bossDead = {}; MP.players.forEach((p) => dropTag(p)); MP.players.clear();
            (m.players || []).forEach(addRemote); if (G.horror) G.horror.onWelcome(m); MP.lookSent = ''; MP.setStatus('Conectado à sala ' + (MP.roomName || ''), 'ok');
            resolve(m);
          } else if (m.t === 'err') fail(m.msg || 'Sala indisponível.');
          return;
        }
        onMsg(m);
      };
      ws.onerror = () => fail('Falha de conexão com o servidor.');
      ws.onclose = () => { if (!done) fail('O servidor fechou a conexão.'); else if (MP.ws === ws) lost(); };
    });
  };
  MP.leave = function (silent) {
    const ws = MP.ws; MP.ws = null; MP.state = 'off'; MP.room = null; if (MP.sync) MP.sync.clear();
    MP.players.forEach((p) => dropTag(p)); MP.players.clear(); if (G.horror) G.horror.reset();
    if (ws) { try { ws.close(1000); } catch (e) { /* já fechado */ } }
    if (!silent) MP.setStatus('Você saiu da sala.');
  };
  function lost() {
    MP.ws = null; MP.state = 'off'; MP.room = null; if (MP.sync) MP.sync.clear();
    MP.players.forEach((p) => dropTag(p)); MP.players.clear();
    if (G.horror) G.horror.reset();
    MP.setStatus('Conexão perdida. Você continua jogando sozinho.', 'err');
    if (G.main && G.main.running) G.ui.banner('Conexão perdida', 'Você continua jogando sozinho. Entre de novo pelo menu Multiplayer.');
  }
  function send(m) { if (MP.ws && MP.ws.readyState === 1) { try { MP.ws.send(JSON.stringify(m)); } catch (e) { /* conexão caindo */ } } }
  MP.send = send;
  /* host = quem tem o menor seq entre os jogadores da sala (quem entrou primeiro) */
  MP.isHost = function () {
    if (MP.state !== 'on' || MP.seq == null) return false;
    for (const p of MP.players.values()) if (p.seq != null && p.seq < MP.seq) return false;
    return true;
  };
  /* sem host, o jogador não simula o mundo: recebe o estado do host */
  MP.skipSim = () => MP.state === 'on' && !MP.isHost();
  MP.reward = (pid, e) => { if (MP.sync) MP.sync.reward(pid, e); };
  function onMsg(m) {
    if (G.horror && G.horror.onMsg(m)) return; // modo terror: auth, admins, horror
    if (m.t === 'ev' && G.chat && G.chat.handle && G.chat.handle(m)) return; // chat e voz
    if (m.t === 'join') addRemote(m.p, true);
    else if (m.t === 'leave') { const p = MP.players.get(m.p); if (p) { G.ui.toast(p.name + ' saiu da sala'); dropTag(p); MP.players.delete(m.p); } }
    else if (m.t === 'look') { const p = MP.players.get(m.p); if (p) p.look = norm(m.look); }
    else if (m.t === 'snap' || m.t === 'ev') { if (MP.sync) MP.sync.onMsg(m); }
    else if (m.t === 'st') { const p = MP.players.get(m.p); if (p) { p.tx = m.x; p.ty = m.y; p.tz = m.z; p.tyaw = m.yaw; p.sp = m.sp; if (!p.seen) { p.x = m.x; p.y = m.y; p.z = m.z; p.yaw = m.yaw; } p.seen = true; } }
  }
  function addRemote(p, toast) {
    if (!p || !p.pid || p.pid === MP.pid) return;
    let r = MP.players.get(p.pid);
    if (!r) { r = { pid: p.pid, x: 0, y: 0, z: 0, yaw: 0, tx: 0, ty: 0, tz: 0, tyaw: 0, ph: 0, sp: 0, seen: false, look: null, tag: null }; MP.players.set(p.pid, r); }
    r.name = String(p.name || 'Player').slice(0, 16); r.look = norm(p.look || r.look); if (p.seq != null) r.seq = p.seq;
    if (p.x != null) { r.seen = true; r.x = r.tx = p.x; r.y = r.ty = p.y; r.z = r.tz = p.z; r.yaw = r.tyaw = p.yaw; r.sp = p.sp || 0; }
    if (!r.tag) { r.tag = document.createElement('div'); r.tag.textContent = r.name; tagsBox().appendChild(r.tag); }
    if (toast) G.ui.toast(r.name + ' entrou na sala');
  }
  function tagsBox() { if (!MP.tags) { MP.tags = document.createElement('div'); MP.tags.id = 'mpnames'; document.body.appendChild(MP.tags); } return MP.tags; }
  function dropTag(p) { if (p && p.tag) { p.tag.remove(); p.tag = null; } }

  /* ---------- por quadro: envia a própria posição e interpola os outros ---------- */
  MP.update = function (dt) {
    if (MP.state !== 'on') return;
    const P = G.player;
    MP.sendT -= dt;
    if (MP.sendT <= 0 && P) {
      MP.sendT = 0.1;
      send({ t: 'st', x: r3(P.x), y: r3(P.y), z: r3(P.z), yaw: r3(P.yaw), sp: r2(Math.hypot(P.vx || 0, P.vz || 0)) });
    }
    MP.lookT -= dt;
    if (MP.lookT <= 0) { MP.lookT = 1; const lk = JSON.stringify(look()); if (lk !== MP.lookSent) { MP.lookSent = lk; send({ t: 'look', look: look() }); } }
    if (MP.sync) MP.sync.update(dt);
    const k = Math.min(1, dt * 10);
    for (const [pid, r] of MP.players) {
      if (!r.seen || (G.pizza && G.pizza.bodies && G.pizza.bodies.has(pid))) continue; // colega caído: só o corpo aparece
      r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k; r.z += (r.tz - r.z) * k; r.yaw = M.lerpAng(r.yaw, r.tyaw, Math.min(1, dt * 12));
      r.ph += dt * (2 + r.sp * 1.6);
      if (r.tag) {
        const pr = G.gfx.project ? G.gfx.project(r.x, r.y + 2.35, r.z) : null;
        if (pr) { r.tag.style.display = ''; r.tag.style.left = pr[0] + 'px'; r.tag.style.top = pr[1] + 'px'; } else r.tag.style.display = 'none';
      }
    }
  };
  MP.draw = function () {
    if (MP.state !== 'on') return;
    for (const r of MP.players.values()) {
      if (!r.seen) continue;
      G.models.draw(G.models.get('human', r.look), { x: r.x, y: r.y, z: r.z, yaw: r.yaw, scale: 1 }, { ph: r.ph, sp: Math.min(1, r.sp / 5), t: G.player.t || 0 }, { outline: 0.03 });
    }
  };

  /* ---------- telas ---------- */
  MP.refreshList = async function () {
    const box = $('mp-list'); if (!box) return;
    if (!MP.configured()) { box.textContent = 'Nenhuma sala disponível.'; MP.setStatus('Servidor de salas não configurado nesta versão.', 'err'); return; }
    box.textContent = 'Procurando salas…';
    try {
      const rooms = await MP.list(); box.textContent = '';
      if (!rooms.length) { box.textContent = 'Nenhuma sala encontrada. Crie uma!'; MP.setStatus('Nenhuma sala aberta agora.'); return; }
      rooms.forEach((r, n) => {
        const row = document.createElement('div'); row.className = 'mp-row fz-feed';
        const cam = document.createElement('i'); cam.textContent = 'CAM ' + String(n + 1).padStart(2, '0');
        const info = document.createElement('span'); const mt = /^(.*) · N(\d)$/.exec(r.name), nn = mt ? +mt[2] : 1; info.textContent = (mt ? mt[1] : r.name) + ' · NOITE ' + nn + ' · ' + r.count + '/' + r.max;
        const b = document.createElement('button'); const lock = nn > (G.fnafUnlocked ? G.fnafUnlocked() : 1); b.textContent = lock ? 'BLOQUEADA' : r.count >= r.max ? 'LOTADA' : 'ENTRAR'; b.disabled = lock || r.count >= r.max;
        b.onclick = () => enterRoom(r.id, r.name);
        row.append(cam, info, b); box.appendChild(row);
      });
      MP.setStatus('Salas atualizadas.');
    } catch (e) {
      box.textContent = 'Nenhuma sala disponível.';
      MP.setStatus('Não foi possível falar com o servidor: ' + e.message, 'err');
    }
  };
  async function enterRoom(id, name) {
    const mt = /· N(\d)$/.exec(name || ''), night = mt ? +mt[1] : 1;
    if (G.fnafMode && night > (G.fnafUnlocked ? G.fnafUnlocked() : 1)) { MP.setStatus('Noite ' + night + ' bloqueada: conclua a anterior.', 'err'); return; }
    G.fnafNight = night;
    MP.setStatus('Conectando…');
    try { await MP.join(id, name); } catch (e) { MP.setStatus(e.message, 'err'); return; }
        if (G.fnafMode) { G.fnafMode = false; G.main.startFnaf(); const t0 = Date.now(); G.mp.send({ t: 'ev', to: 'all', k: 'fnaf', a: 'q' }); G.pizza.enter(t0); return; }
    // o progresso é o do próprio jogador: continua o save local, ou começa uma partida nova
    const d = G.save.load();
    G.ui.toast('Você entrou na sala ' + (name || ''));
    if (d && d.roulette && d.roulette.done) G.main.continueGame(); else G.main.newGame();
  }
  function bind() {
    const ok = MP.configured();
    for (const id of ['mp-room', 'mp-create', 'mp-refresh']) { const el = $(id); if (el) el.disabled = !ok; }
    $('mp-status') && MP.setStatus(ok ? 'Escolha uma sala ou crie uma nova.' : 'Servidor de salas não configurado nesta versão (web/js/mpconfig.js).', ok ? '' : 'err');
    $('m-multi') && $('m-multi').addEventListener('click', () => MP.refreshList());
    $('mp-refresh') && ($('mp-refresh').onclick = () => MP.refreshList());
    $('mp-create') && ($('mp-create').onclick = async () => {
      const n0 = G.fnafNight || 1; if (n0 > (G.fnafUnlocked ? G.fnafUnlocked() : 1)) { MP.setStatus('Noite bloqueada: conclua a anterior.', 'err'); return; }
      const name = (($('mp-room').value || '').trim() || ('Sala de ' + (G.save.settings.name || 'Player'))).slice(0, 24) + ' · N' + n0;
      $('mp-create').disabled = true;
      try { const j = await MP.create(name); await enterRoom(j.id, name); }
      catch (e) { MP.setStatus(e.message, 'err'); }
      finally { $('mp-create').disabled = !MP.configured(); }
    });
  }
  bind();
})();
