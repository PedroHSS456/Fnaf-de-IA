'use strict';
/* Elemental World — interface: menus, roleta, HUD, diálogo, diário, configurações */
(function () {
  const G = window.G, $ = (id) => document.getElementById(id);
  const UI = (G.ui = {});
  const PANELS = ['title', 'roulette', 'pause', 'journal', 'settings', 'dialog', 'death', 'inv', 'shop', 'name', 'multi'];
  const ESC = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ELN = { fogo: 'Fogo', agua: 'Água', terra: 'Terra', ar: 'Ar', avatar: 'Avatar' };
  const LABELS = ['Fogo', 'Água', 'Terra', 'Ar', 'Avatar'];

  UI.fade = function (cb, hold) {
    const f = $('fade'); f.classList.add('on');
    setTimeout(() => { try { cb && cb(); } catch (e) { console.error(e); } setTimeout(() => f.classList.remove('on'), hold || 250); }, 420);
  };
  const GQ = ['Realista · Baixo', 'Realista · Médio', 'Realista · Alto', 'Realista · Ultra', 'Desenho · Baixo', 'Desenho · Médio', 'Desenho · Alto'];
  const FXQ = [0.4, 0.7, 1, 1.25, 0.6, 0.85, 1], DSC = [0.7, 0.85, 1, 1.15, 0.75, 0.95, 1.1];
  const RES = [['Baixa', 0.5], ['Média', 0.75], ['Alta', 1], ['Ultra', 1.5]], DIFF = [['Fácil', 0.7, 0.6, 1.25, 0.85, 0.8], ['Normal', 1, 1, 1, 1, 1], ['Difícil', 1.5, 1.45, 0.75, 1.2, 1.3]];
  const SQ = ['Baixa', 'Média', 'Alta'];
  /* tela de nome */
  UI.nameFlow = function (next, back) {
    const st = G.save.settings;
    const inp = $('nm-in'); inp.value = st.name || ''; inp.placeholder = 'Player ' + ((st.pn || 0) + 1);
    $('nm-ok').onclick = () => {
      let n = inp.value.trim().slice(0, 16);
      if (!n) { st.pn = (st.pn || 0) + 1; n = 'Player ' + st.pn; }
      st.name = n; G.save.saveSettings(); UI.refreshName && UI.refreshName();
      if (next) next(); else UI.menu('title');
    };
    UI.nameBack = back || 'title';
    UI.menu('name');
    setTimeout(() => inp.focus(), 50);
  };
  UI.refreshName = function () { const b = $('s-nm'); if (b) b.textContent = 'Seu nome: ' + (G.save.settings.name || '—'); };
  UI.reloadApply = function () {
    G.ui.toast('Aplicando estilo: o mundo será reconstruído…');
    try { if (G.main.running) G.main.save(); sessionStorage.setItem('ew:resume', G.main.running ? '1' : ''); } catch (e) {}
    setTimeout(() => location.reload(), 500);
  };
  UI.applyGfx = function () {
    const s = G.save.settings, q = G.gfx.applyQ(), draw = s.style === 'draw', gq = draw ? 5 : q.lvl, r = RES[s.res == null ? 2 : s.res], d = DIFF[s.diff == null ? 1 : s.diff];
    const au = draw ? (G.gfx.auto || 1) : 1;
    G.gfx.quality = r[1]; G.fx.quality = FXQ[gq] * au; G.gfx.drawScale = DSC[gq] * Math.min(1, au + 0.1); G.gfx.resize && G.gfx.resize();
    G.diff = { hp: d[1], dmg: d[2], regen: d[3], cost: d[4], delay: d[5], nome: d[0] };
    if (UI.$gfx) {
      $('s-gfx').textContent = 'Estilo: ' + (draw ? 'Desenho de papel' : 'Realista'); $('s-gq').hidden = draw; $('s-gq').textContent = 'Qualidade realista: ' + ['Baixo', 'Médio', 'Alto', 'Ultra'][q.lvl]; $('s-res').textContent = 'Resolução: ' + r[0]; $('s-diff').textContent = 'Dificuldade: ' + d[0];
      $('s-sq').textContent = 'Qualidade sísmica: ' + SQ[s.seisQ == null ? 2 : s.seisQ];
      $('s-sh').textContent = 'Shaders: ' + ['Desligado', 'Baixo', 'Médio', 'Alto'][s.shader == null ? 2 : s.shader];
      UI.refreshName();
      $('s-ff').textContent = 'Fogo amigo: ' + (s.ff ? 'Ativado' : 'Desativado');
    }
    return q;
  };
  /* estilo Desenho: céu e cores mais vivos (o estilo Realista mantém as cores do ciclo do dia) */
  UI.styleEnv = function () {
    if (!G.gfx.q.draw) return; const e = G.gfx.env;
    for (const k of ['top', 'hor', 'bot']) { const c = e[k], l = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; e[k] = [l + (c[0] - l) * 1.25, l + (c[1] - l) * 1.25, l + (c[2] - l) * 1.25]; }
  };
  UI.refreshSeis = function () {
    const se = G.seis, un = se.unlocked(), bl = se.blind(), s = G.save.settings;
    if (!$('s-seis')) return;
    $('b-seis').hidden = !(un && !bl);
    $('s-seis').disabled = bl || !un;
    $('s-seis').textContent = bl ? 'Visão sísmica: permanente (nascido cego)' : 'Visão sísmica: ' + (G.S && G.S.flags.seis ? 'ligada' : 'desligada');
    $('s-seis-note').textContent = bl ? 'Você nasceu cego: não pode desligar a visão sísmica nem usar a visão comum. Água profunda, areia solta e o ar escondem o mundo de você.' : (un ? 'Alterne entre a visão comum e a sísmica. Inimigos no ar não são percebidos.' : 'Bloqueada: dobradores de Terra a aprendem no nível 6.');
    set('s-si', 'o-si', s.seisInt == null ? 1 : s.seisInt, (v) => (+v).toFixed(2));
    set('s-sg', 'o-sg', s.seisGlow == null ? 1 : s.seisGlow, (v) => (+v).toFixed(2));
  };
  function set(id, out, v, fmt) { $(id).value = v; $(out).textContent = fmt(v); }
  UI.loader = (p, t) => { $('ld-bar').style.width = Math.round(p * 100) + '%'; if (t) $('ld-txt').textContent = t; };
  UI.loaderHide = () => { $('loader').hidden = true; };

  /* painéis */
  UI.menu = function (name) {
    for (const p of PANELS) $('p-' + p).hidden = p !== name;
    $('menus').hidden = !name;
    $('menus').classList.toggle('scene', name === 'title' || name === 'roulette');
    $('menus').classList.toggle('dlg-mode', name === 'dialog');
  };
  UI.hud = (on) => { $('hud').hidden = !on; };
  UI.onBack = function () {
    if (!$('menus').hidden) {
      if ($('p-multi').hidden === false) { UI.menu('title'); return true; }
      if ($('p-name').hidden === false) { UI.menu(UI.nameBack === 'settings' ? 'settings' : 'title'); return true; }
      if ($('p-journal').hidden === false || $('p-settings').hidden === false) { UI.menu('pause'); return true; }
      if ($('p-pause').hidden === false && G.main.running) { G.main.resume(); return true; }
      if ($('p-dialog').hidden === false || $('p-inv').hidden === false || $('p-shop').hidden === false) { UI.closeDialog(); return true; }
      return false;
    }
    if (G.main.running) { G.main.pause(); return true; }
    return false;
  };

  /* título */
  UI.refreshTitle = function () {
    const d = G.save.load(), has = !!d;
    $('m-cont').disabled = !has;
    $('m-wipe').hidden = !G.save.exists();
    $('m-wipe').textContent = 'Apagar dados';
    const done = !!(d && d.roulette && d.roulette.done);
    $('m-new').disabled = done;
    $('m-note').textContent = done ? 'Seu elemento já foi escolhido. Apague os dados para rolar a roleta de novo.' : (has ? '' : 'Nenhum save encontrado.');
  };

  /* roleta */
  UI.spin = function (res, done) {
    const el = $('rl-name'); let k = 0; const N = 26;
    $('rl-spin').disabled = true; $('rl-go').hidden = true;
    const step = () => {
      if (k < N) { el.textContent = LABELS[Math.floor(Math.random() * LABELS.length)]; k++; setTimeout(step, 50 + k * k * 0.9); return; }
      el.textContent = ELN[res] || res;
      $('rl-res').textContent = res === 'avatar' ? 'Avatar! Você começa com um elemento e aprende os outros pelos mestres.' : 'Seu elemento está definido. Ele não muda até apagar os dados.';
      $('rl-go').hidden = false; if (done) done();
    };
    step();
  };

  /* HUD */
  UI.refreshHud = function () {
    const G_ = G, P = G.player, S = G.S;
    if (!S) return;
    const st = G.prog.stats();
    const rg = G.world.REGIONS[G.world.regionAt(P.x, P.z)];
    $('reg').textContent = rg ? rg.nome : '';
    $('elname').textContent = (S.active ? ELN[S.active] : ELN[S.element] || '') + (S.element === 'avatar' ? (P.avatarT > 0 ? ' · Estado Avatar' : '') : '');
    const E = G.elements[P.el()];
    if (E && E.quick) {
      document.querySelectorAll('#qk button').forEach((b, i) => {
        const q = E.quick[i], st = q ? (G.mastery.can(P.el(), i) ? 'ok' : G.mastery.state(P.el(), i)) : 'ok';
        b.classList.toggle('lock', st === 'lock'); b.classList.toggle('learn', st === 'learn');
        b.innerHTML = q ? (st === 'lock' ? '🔒' : st === 'learn' ? '❗' : q.ico) + '<small>' + (st === 'lock' ? (G.mastery.REQ[i] > 0 && G.mastery.any(P.el()) ? 'Maestria ' + G.mastery.REQ[i] : 'Bloqueada') : st === 'learn' ? 'Aprender' : ESC(q.nome)) + '</small>' : '';
      });
    }
    const ac = S.active || S.element || ''; document.body.dataset.el = S.element === 'avatar' && P.avatarT > 0 ? 'avatar' : ac;
    $('emb-i').textContent = { fogo: '🔥', agua: '💧', terra: '⛰', ar: '🌀', avatar: '✦' }[ac] || '✦';
    UI.refreshSeis && UI.refreshSeis();
    $('b-elc').hidden = S.element !== 'avatar';
    const tq = G.quests && G.quests.tracked ? G.quests.tracked() : null;
    $('quest').innerHTML = tq ? '<b>' + ESC(tq.nome) + '</b>' + ESC(tq.txt) : '';
    $('tm').textContent = G.env.timeStr ? G.env.timeStr() : '';
    $('wbox').hidden = P.el() !== 'agua';
  };
  UI.frameHud = function (dt) {
    const P = G.player, S = G.S;
    const st = G.prog.stats();
    $('hpt').textContent = Math.max(0, Math.ceil(P.hp)) + ' / ' + st.hpMax; $('cht').textContent = Math.max(0, Math.ceil(P.chi)) + ' / ' + st.chiMax;
    if (S) { $('lv').textContent = S.lvl; $('xpb').style.width = Math.min(100, (S.xp / G.prog.xpFor(S.lvl)) * 100) + '%'; }
    { const Ms = G.mastery, el = P.el(), m = Ms.get(el), nx = Ms.next(el), lo = nx ? Ms.REQ[Math.max(0, nx.i - 1)] : 75;
      if (!Ms.any(el)) { $('msb').style.width = '0%'; $('mst').textContent = 'Sem técnica · procure um mestre'; }
      else if (nx && Ms.learnable(el, nx.i)) { $('msb').style.width = '100%'; $('mst').textContent = 'Maestria ' + Math.floor(m) + ' · técnica pronta p/ aprender'; }
      else { $('msb').style.width = (nx ? Math.max(0, Math.min(100, ((m - lo) / (nx.need - lo)) * 100)) : 100) + '%'; $('mst').textContent = 'Maestria ' + Math.floor(m) + (nx ? ' · próxima técnica ' + nx.need : ' · tudo aprendido'); } }
    $('vig').classList.toggle('on', P.alive && P.hp < st.hpMax * 0.3);
    { const h = (180 - (G.cam.yaw * 180) / Math.PI + 720) % 360; $('compass').textContent = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(h / 45) % 8] + '  ·  ' + Math.round(h) + '°'; }
    $('hpb').style.width = Math.max(0, (P.hp / st.hpMax) * 100) + '%';
    $('chib').style.width = Math.max(0, (P.chi / st.chiMax) * 100) + '%';
    if (S) $('wb').style.width = Math.max(0, (S.water / 100) * 100) + '%';
    const E = G.elements[P.el()];
    document.querySelectorAll('#qk button').forEach((b, i) => {
      const cd = (G.bend.qcd[P.el() + i] || 0) > 0;
      b.classList.toggle('cd', cd); const r = G.bend.qcd[P.el() + i] || 0; b.dataset.cd = r > 0 ? r.toFixed(r < 10 ? 1 : 0) : '';
    });
    $('pad').firstChild.textContent = G.drag.held ? 'LANÇAR' : 'DOBRAR';
    $('tm').textContent = G.env.timeStr ? G.env.timeStr() : '';
    if (!UI._hudT || (UI._hudT -= dt) < 0) { UI._hudT = 0.5; UI.refreshHud(); }
  };
  UI.flashChi = () => { const b = $('chib').parentNode; b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); };
  UI.setBoss = function (b) {
    const box = $('boss'); if (!b) { box.hidden = true; return; }
    box.hidden = false; $('boss-n').textContent = b.nome || 'Mestre';
    $('boss-b').style.width = Math.max(0, (b.hp / b.hpMax) * 100) + '%';
  };
  UI.showDeath = (on) => { if (on) UI.menu('death'); else UI.menu(null); };

  /* avisos */
  let tT = 0;
  UI.toast = function (msg, kind) {
    const t = $('toast'); t.textContent = msg; t.className = 'on' + (kind === 'err' ? ' err' : '');
    clearTimeout(tT); tT = setTimeout(() => (t.className = ''), 1900);
  };
  let bT = 0;
  UI.banner = function (title, sub) {
    const b = $('banner'); b.querySelector('b').textContent = title || ''; b.querySelector('span').textContent = sub || '';
    b.classList.add('on'); clearTimeout(bT); bT = setTimeout(() => b.classList.remove('on'), 2600);
  };
  UI.pick = function (text) {
    const box = $('pick'); const d = document.createElement('div'); d.textContent = text; box.appendChild(d);
    setTimeout(() => d.remove(), 1900);
  };
  UI.dmgNum = function (x, y, z, n, el) {
    const p = G.gfx.project ? G.gfx.project(x, y, z) : null; if (!p) return;
    const d = document.createElement('div'); d.textContent = n; d.style.left = p[0] + 'px'; d.style.top = p[1] + 'px';
    const col = { fogo: '#ffae5a', agua: '#8fd3ff', terra: '#e0b070', ar: '#e8f2ff' }[el] || '#fff';
    d.style.color = col; $('dmgs').appendChild(d); setTimeout(() => d.remove(), 1000);
  };

  /* diálogo */
  UI.dialog = function (name, text, buttons) {
    $('dl-n').textContent = name || ''; $('dl-t').textContent = text || '';
    const box = $('dl-b'); box.innerHTML = '';
    for (const b of buttons || []) {
      const el = document.createElement('button'); el.textContent = b.t;
      el.onclick = () => { b.fn && b.fn(); if (b.keep) UI.talkRefresh(); };
      box.appendChild(el);
    }
    UI.menu('dialog');
  };
  UI.closeDialog = function () { if (G.main.running) { G.main.paused = false; UI.menu(null); } else UI.menu('title'); };
  UI.talkRefresh = function () { if (G.act && G.act.cur) G.act.talk(G.act.cur, true); };
  UI.setPrompt = function (label) { const b = $('b-act'); b.hidden = !label; if (label) b.textContent = label; };

  /* diário */
  UI.journal = function () {
    const S = G.S;
    const qs = G.quests.active ? G.quests.active() : [];
    $('jr-q').innerHTML = qs.length ? qs.map((id) => '<div><b>' + ESC(G.quests.DEFS[id].nome) + '</b><small>' + ESC(G.quests.desc(id)) + '</small></div>').join('') : '<div>Nenhuma missão ativa.</div>';
    const inv = S.inv;
    const arts = Object.keys(S.flags.art || {}).filter((k) => S.flags.art[k] && G.story.ART[k]);
    const NM = { fogo: 'Fogo', agua: 'Água', terra: 'Terra', ar: 'Ar' };
    const Ms = G.mastery, els = S.element === 'avatar' ? ['fogo', 'agua', 'terra', 'ar'] : [S.origin];
    $('jr-m').innerHTML = '<div><small>Nível ' + S.lvl + ' = força (vida, chi, dano). Maestria = técnicas novas.</small></div>' + els.map((el) => { const m = Math.floor(Ms.get(el)), q = G.elements[el].quick;
      return '<div><b>' + NM[el] + ' · maestria ' + m + '</b>' + q.map((t, i) => '<small>' + (Ms.learned(el, i) ? '✔ ' : Ms.learnable(el, i) ? '❗ ' : '🔒 ') + ESC(t.nome) + (Ms.learned(el, i) ? '' : Ms.learnable(el, i) ? ' — pronta: procure um mestre' : ' — maestria ' + Ms.REQ[i]) + '</small>').join('') + '</div>'; }).join('');
    $('jr-i').innerHTML = '<div>Moedas: ' + inv.coins + '</div><div>Ervas: ' + inv.herb + ' · Brasas: ' + inv.ember + ' · Fragmentos: ' + inv.shard + '</div>' +
      (arts.length ? arts.map((k) => '<div><b>' + ESC(G.story.ART[k].nome) + '</b><small>' + ESC(G.story.ART[k].desc) + '</small></div>').join('') : '<div><small>Nenhum artefato ainda. Explore ruínas e templos.</small></div>') +
      '<div><small>Descobertas: ' + Object.keys(S.flags.chests || {}).length + ' baús · ' + Object.keys(S.flags.shrines || {}).length + ' santuários · ' + Object.keys(S.flags.read || {}).length + ' inscrições</small></div>';
    UI.menu('journal');
  };

  /* configurações */
  UI.settings = function () {
    const s = G.save.settings;
    const set = (id, out, v, fmt) => { $(id).value = v; $(out).textContent = fmt(v); };
    set('s-cs', 'o-cs', s.camSens, (v) => (+v).toFixed(2));
    set('s-js', 'o-js', s.joySize, (v) => (+v).toFixed(2));
    set('s-hs', 'o-hs', s.hudScale, (v) => (+v).toFixed(2));
    set('s-fv', 'o-fv', s.fovBoost, (v) => (+v > 0 ? '+' : '') + v);
    $('s-fp').textContent = 'Câmera: ' + (s.fp !== false ? 'primeira pessoa' : 'terceira pessoa');
    $('s-sync').textContent = 'Horário do mundo: ' + (s.syncClock !== false ? 'igual ao do aparelho' : 'ciclo do jogo');
    UI.$gfx = true; UI.applyGfx(); UI.refreshSeis();
    UI.applyHudScale();
    UI.menu('settings');
  };
  UI.applyHudScale = () => { $('hud').style.zoom = G.save.settings.hudScale || 1; };
  UI.bindSettings = function () {
    const bind = (id, key, out, fmt) => $(id).addEventListener('input', (e) => {
      G.save.settings[key] = +e.target.value; $(out).textContent = fmt(+e.target.value);
      G.save.saveSettings(); UI.applyHudScale();
    });
    bind('s-cs', 'camSens', 'o-cs', (v) => v.toFixed(2));
    bind('s-js', 'joySize', 'o-js', (v) => v.toFixed(2));
    bind('s-hs', 'hudScale', 'o-hs', (v) => v.toFixed(2));
    bind('s-fv', 'fovBoost', 'o-fv', (v) => (v > 0 ? '+' : '') + v);
    $('s-sync').onclick = () => {
      G.save.settings.syncClock = G.save.settings.syncClock === false; G.save.saveSettings();
      $('s-sync').textContent = 'Horário do mundo: ' + (G.save.settings.syncClock !== false ? 'igual ao do aparelho' : 'ciclo do jogo');
    };
    const geo = () => { const q = UI.applyGfx(); if (q.draw * 10 + q.detail !== G.gfx.built) UI.reloadApply(); };
    $('m-multi').onclick = () => { $('mp-name').textContent = G.save.settings.name || 'Player 1'; UI.menu('multi'); };
    $('s-nm').onclick = () => UI.nameFlow(() => { UI.menu('settings'); }, 'settings');
    $('s-ff').onclick = () => { const s = G.save.settings; s.ff = !s.ff; G.save.saveSettings(); UI.applyGfx(); G.ui.toast(s.ff ? 'Fogo amigo ativado: golpes ferem outros jogadores que também ativaram' : 'Fogo amigo desativado'); };
    $('s-sh').onclick = () => { const s = G.save.settings; s.shader = ((s.shader == null ? 2 : s.shader) + 1) % 4; G.save.saveSettings(); UI.applyGfx(); };
    $('s-gfx').onclick = () => { const s = G.save.settings; s.style = s.style === 'draw' ? 'real' : 'draw'; if (s.gq == null || s.gq > 3) s.gq = 2; G.save.saveSettings(); geo(); };
    $('s-gq').onclick = () => { const s = G.save.settings; s.gq = ((s.gq == null ? 2 : s.gq) + 1) % 4; G.save.saveSettings(); geo(); };
    $('s-res').onclick = () => { const s = G.save.settings; s.res = ((s.res == null ? 2 : s.res) + 1) % 4; G.save.saveSettings(); UI.applyGfx(); };
    $('s-seis').onclick = () => G.seis.toggle();
    $('s-sq').onclick = () => { const s = G.save.settings; s.seisQ = ((s.seisQ == null ? 2 : s.seisQ) + 1) % 3; G.save.saveSettings(); UI.applyGfx(); };
    for (const [id, key, out] of [['s-si', 'seisInt', 'o-si'], ['s-sg', 'seisGlow', 'o-sg']]) $(id).addEventListener('input', (e) => { G.save.settings[key] = +e.target.value; $(out).textContent = (+e.target.value).toFixed(2); G.save.saveSettings(); });
    $('s-diff').onclick = () => { const s = G.save.settings; s.diff = ((s.diff == null ? 1 : s.diff) + 1) % 3; G.save.saveSettings(); UI.applyGfx(); G.ui.toast('Dificuldade: ' + G.diff.nome); };
    const hurt0 = G.player.hurt; G.player.hurt = function (d, o) { return hurt0.call(this, d * (G.diff ? G.diff.dmg : 1), o); };
    const deal0 = G.combat.deal; G.combat.deal = function (t, d, o) { return deal0.call(this, t, d / (G.diff && t && t !== G.player ? G.diff.hp : 1), o); };
    UI.applyGfx();
    $('s-fp').onclick = () => {
      G.save.settings.fp = G.save.settings.fp === false; G.save.saveSettings();
      if (G.cam) G.cam.fpMode = G.save.settings.fp !== false;
      $('s-fp').textContent = 'Câmera: ' + (G.save.settings.fp !== false ? 'primeira pessoa' : 'terceira pessoa');
    };
  };
})();
