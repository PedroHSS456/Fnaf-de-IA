'use strict';
/* Elemental World — boot, estado da partida, loop principal e câmera em primeira pessoa */
(function () {
  const G = window.G, M = G.M, gfx = G.gfx, W = G.world, In = G.input, C = G.cam, B = G.bend;
  const cv = document.getElementById('cv');
  const Main = (G.main = { ready: false, running: false, paused: false, dead: false });
  const ELS = ['fogo', 'agua', 'terra', 'ar'];
  let last = 0, saveT = 0;
  const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

  /* ---------- câmera: primeira pessoa (com fallback para a câmera de órbita) ---------- */
  const orbitUpdate = C.update, orbitView = C.viewTarget;
  C.fpMode = true; C.fpPitch = 0;
  C.update = function (dt, P) {
    if (!C.fpMode) return orbitUpdate(dt, P);
    C.yaw -= In.camDX;
    C.fpPitch = M.clamp(C.fpPitch - In.camDY, -1.35, 1.35);
    In.camDX = 0; In.camDY = 0;
    const cp = Math.cos(C.fpPitch), sp = Math.sin(C.fpPitch);
    const ey = M.lerp(P.y + 1.62 + (P.guard ? -0.05 : 0), G.rest.eyeY, G.rest.k);
    const eye = [P.x, ey, P.z];
    if (C.shake > 0.001) { for (let i = 0; i < 3; i++) eye[i] += M.rnd(-1, 1) * C.shake; C.shake = Math.max(0, C.shake - dt * 1.6); }
    C.eye = eye;
    C.target = [P.x + Math.sin(C.yaw) * cp * 12, ey + sp * 12, P.z + Math.cos(C.yaw) * cp * 12];
    C.fov = M.damp(C.fov, C.fovT + G.save.settings.fovBoost, 6, dt);
  };
  C.viewTarget = function () { return C.fpMode ? C.target : orbitView(); };
  /* origem da dobra = mão direita na frente dos olhos */
  const handPos = B.handPos;
  B.handPos = function () {
    if (!C.fpMode) return handPos();
    const f = fwd(), r = right();
    return [C.eye[0] + f[0] * 0.6 + r[0] * 0.24, C.eye[1] - 0.22 + f[1] * 0.6, C.eye[2] + f[2] * 0.6 + r[2] * 0.24];
  };
  function fwd() { const cp = Math.cos(C.fpPitch), sp = Math.sin(C.fpPitch); return [Math.sin(C.yaw) * cp, sp, Math.cos(C.yaw) * cp]; }
  function right() { return [-Math.cos(C.yaw), 0, Math.sin(C.yaw)]; }

  function drawHands() {
    const f = fwd(), r = right(), e = C.eye, col = G.elements[G.player.el()].col || [1, 0.6, 0.3];
    const skin = hex(G.S.look.skin || '#e0b088');
    if (G.player.gliding && G.player.alive) { // planador na 1ª pessoa: segurado à frente
      const pt = Math.max(-0.5, Math.min(0.4, G.player.vy * -0.04));
      G.glider.draw(e[0] + f[0] * 0.9, e[1] - 0.35 + f[1] * 0.9, e[2] + f[2] * 0.9, Math.atan2(f[0], f[2]), G.player.glideRoll || 0, pt, 0.55);
    }
    const Pn = G.punch;
    for (const s of [1, -1]) {
      const ho = Pn.handOff(s);
      const base = [e[0] + f[0] * (0.55 + ho[0]) + r[0] * (0.3 * s + ho[1]), e[1] - 0.3 + ho[2] + f[1] * (0.55 + ho[0]), e[2] + f[2] * (0.55 + ho[0]) + r[2] * (0.3 * s + ho[1])];
      const ry = Math.atan2(f[0], f[2]);
      B.drawPrim('box', base[0], base[1], base[2], 0.07, 0.07, 0.4, ry, -C.fpPitch, 0, skin, null, 0);
      const hp = [base[0] + f[0] * 0.24, base[1] + f[1] * 0.24, base[2] + f[2] * 0.24];
      if (s === 1 && G.bend.hold) G.fx.imm(true, hp[0], hp[1], hp[2], 1.3, col[0], col[1], col[2], 0.45);
      if (s === 1) Pn.drawWeapon(hp, f, r, Math.atan2(f[0], f[2]));
    }
  }

  /* ---------- roleta e início ---------- */
  function rollResult() {
    const x = Math.random();
    return x < 0.24 ? 'fogo' : x < 0.48 ? 'agua' : x < 0.72 ? 'terra' : x < 0.96 ? 'ar' : 'avatar';
  }
  function applyRoll(res) {
    const S = G.S, el = res === 'avatar' ? ELS[Math.floor(Math.random() * 4)] : res;
    S.roulette = { done: true, result: res, roll: Date.now() };
    S.blind = res === 'terra' && !!G._pendingBlind;
    S.element = res; S.active = res === 'avatar' ? el : null; S.unlocked = []; S.origin = el; S.inv.coins = Math.max(S.inv.coins, 40); S.mv = 2; S.mastery = { fogo: 0, agua: 0, terra: 0, ar: 0 }; S.learn = { fogo: [0, 0, 0, 0], agua: [0, 0, 0, 0], terra: [0, 0, 0, 0], ar: [0, 0, 0, 0] }; S.sess = {};
    const t = W.towns.find((q) => q.id === el) || W.towns[0];
    S.pos = { x: t.x + 4, z: t.z + 4, yaw: 0 };
    G.save.write(S);
  }
  Main.newGame = function () {
    G.S = G.save.fresh(); G.S.roulette = { done: false, result: null, roll: null };
    G.ui.menu('roulette');
    document.getElementById('rl-name').textContent = '?';
    document.getElementById('rl-res').textContent = 'Fogo, Água, Terra e Ar: 24% cada. Avatar: 4%.';
    document.getElementById('rl-spin').disabled = false; document.getElementById('rl-go').hidden = true;
    G._pendingRoll = null;
  };
  Main.applyRoll = applyRoll;
  /* modo FNAF: começa um mundo mínimo (sem roleta nem prólogo) para a pizzaria rodar em cima do motor */
  Main.startFnaf = function () {
    G.S = G.save.fresh(); G._pendingBlind = false; applyRoll('fogo');
    G.S.flags.tut = { welcome: true, prologue: true };
    Main.enter(); G.gesture.enabled = false;
  };
  Main.spinRoll = function () {
    if (G._pendingRoll || (G.S && G.S.roulette.done)) return;
    const res = rollResult(); G._pendingRoll = res; G._pendingBlind = res === 'terra' && Math.random() < G.seis.BLIND_CHANCE;
    G.ui.spin(res, () => { applyRoll(res); G.save.write(G.S); if (G.S.blind) document.getElementById('rl-res').textContent = 'Você nasceu cego. Seus pés enxergam: a visão sísmica é permanente e as ondas revelam o mundo.'; });
  };
  /* nome de usuário: pede na primeira vez; vazio vira "Player N" */
  Main.askName = function (next, back) {
    G.ui.nameFlow(next, back);
  };
  Main.continueGame = function () {
    if (!G.save.settings.name) { Main.askName(() => Main.continueGame(), 'title'); return; }
    const d = G.save.load();
    if (!d) { G.ui.toast('Nenhum save válido', 'err'); return; }
    G.S = d; Main.enter();
  };
  Main.enter = function () {
    G.events.reset(); G.quests.prep(); G.animals.init(); G.story.prologue();
    const S = G.S;
    if (!S.roulette.done) { Main.newGame(); return; }
    G.player.init(S); G.extras.restore(); G.drag.reset(); G.train.reset();
    G.npcs.init(); G.enemies.init(); G.dynprops.init();
    C.fpMode = G.save.settings.fp !== false;
    C.yaw = G.player.yaw; C.fpPitch = 0; C.snap(G.player);
    G.ui.menu(null); G.ui.hud(true); G.ui.refreshHud();
    Main.running = true; Main.paused = false; Main.dead = false; last = performance.now();
    G.gesture.enabled = true;
    if (!S.flags.tut || !S.flags.tut.welcome) { S.flags.tut = S.flags.tut || {}; S.flags.tut.welcome = true; G.ui.banner('Bem-vindo! Objetivo 1', 'Você ainda não sabe dobrar. Siga a SETA DOURADA até o Mestre do seu elemento e fale com ele (botão de interagir) para aprender a primeira técnica. Arraste no canto de cima para olhar.'); }
  };
  Main.save = function () {
    const S = G.S, P = G.player; if (!S || !P) return;
    S.pos = { x: P.x, z: P.z, yaw: C.yaw }; S.hp = P.hp; S.chi = P.chi; S.hour = G.env.hour;
    G.save.write(S);
  };
  Main.rest = function (bench) {
    const P = G.player, st = G.prog.stats();
    P.chi = st.chiMax; G.S.water = 100; Main.save();
    G.ui.toast(bench ? 'Você descansou no banco: chi restaurado' : 'Descansou. Jogo salvo.'); G.audio.sfx && G.audio.sfx('pick');
  };
  Main.pause = function () { Main.paused = true; G.ui.menu('pause'); };
  Main.resume = function () { Main.paused = false; G.ui.menu(null); last = performance.now(); };
  Main.toTitle = function () { if (G.fnafOnly && G.pizza && G.pizza.inside) { G.pizza.exit(true); return; } G.mp.leave(true); Main.save(); Main.running = false; Main.paused = false; G.ui.hud(false); G.ui.refreshTitle(); G.ui.menu('title'); };
  Main.onHide = function () { if (Main.running) { Main.save(); if (!Main.paused) Main.pause(); } };

  /* ---------- loop ---------- */
  function update(dt) {
    const P = G.player, S = G.S;
    S.stats.time += dt;
    if (G.save.settings.syncClock !== false) { const d = new Date(); G.env.hour = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; }
    G.env.update(dt, P.x, P.z); G.dungeon.light(); G.houses.light(); G.pizza.light(); G.ui.styleEnv(); G.seis.light();
    if (G.rest.active || G.train.cut) { G.rest.update(dt); if (!G.train.cut) P.yaw = C.yaw; } else { P.update(dt); G.rest.update(dt); }
    if (P.alive && C.fpMode) P.yaw = C.yaw;
    G.dungeon.update(dt); G.houses.update(dt); G.pizza.update(dt); G.seis.update(dt);
    C.update(dt, P); G.mastery.update(dt); G.train.update(dt); G.items.update(dt);
    G.drag.update(dt);
    G.gesture.update(dt);
    G.combat.update(dt); G.combat.refresh();
    B.update(dt);
    G.enemies.update(dt);
    G.combat.refresh();
    G.npcs.update(dt); G.animals.update(dt); G.guide.update(dt); G.mp.update(dt); G.events.update(dt);
    G.dynprops.update(dt);
    G.act.update(dt);
    G.inter.update(dt);
    G.fx.update(dt);
    if (!G.dungeon.inside && !G.houses.inside && !G.pizza.inside) G.fx.weather(dt, G.env, C, null);
    if (G.audio.music) G.audio.music(dt, W.regionAt(P.x, P.z), G.env.night, false);
    G.ui.frameHud(dt);
    if (!P.alive && !Main.dead) { Main.dead = true; G.ui.showDeath(true); G.audio.sfx && G.audio.sfx('death'); }
    saveT += dt; if (saveT > 25) { saveT = 0; Main.save(); }
  }
  function render() {
    const P = G.player;
    if (!G.seis.on && gfx.shadowBegin(P.x, P.y, P.z)) { // passe de sombras: o que o sol vê
      W.drawShadow(); G.dynprops.draw(); G.npcs.draw(); G.enemies.draw(); G.animals.draw(); if (P.alive) P.draw();
      gfx.shadowEnd();
    }
    if (G.pizza && G.pizza.preView) G.pizza.preView();
    gfx.begin(C.eye, C.viewTarget(), C.fov);
    W.draw(C); G.dungeon.draw(); G.houses.draw(); G.pizza.draw();
    const sz = G.seis.on;
    if (!sz) W.drawLiquids();
    G.dynprops.draw(); G.npcs.draw(); G.drag.draw(); G.enemies.draw(); G.animals.draw(); G.guide.draw(); G.mp.draw();
    B.draw(); G.train.draw();
    if (!C.fpMode) P.draw(); else if (P.alive && !G.rest.active && !sz && !G.train.cut) drawHands();
    if (!sz) G.fx.draw();
  }
  let pf = 0, pn = 0;
  function perf(dt) { // ajuste automático do Desenho: reduz/aumenta partículas e distância conforme o desempenho
    if (G.save.settings.style !== 'draw' || Main.paused) return;
    pf += dt; if (++pn < 150) return;
    const avg = pf / pn; pf = 0; pn = 0; const a = G.gfx.auto || 1;
    if (avg > 0.036 && a > 0.65) { G.gfx.auto = a - 0.1; G.ui.applyGfx(); } else if (avg < 0.02 && a < 1.1) { G.gfx.auto = Math.min(1.1, a + 0.05); G.ui.applyGfx(); }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)) || 0.016;
    last = now;
    if (!Main.running) return;
    if (!Main.paused && !Main.dead) update(dt);
    render();
    perf(dt);
  }

  /* ---------- boot ---------- */
  Main.boot = async function () {
    G.save.loadSettings(); gfx.applyQ();
    if (G.save.settings.fp === undefined) G.save.settings.fp = true;
    gfx.init(cv);
    G.bend.initMeshes(); G.drag.init();
    const rs = () => gfx.resize(); window.addEventListener('resize', rs); rs();
    G.input.init(document.getElementById('touch'));
    G.gesture.init(document.getElementById('touch'));
    G.ui.bindSettings();
    document.addEventListener('pointerdown', () => G.audio.unlock && G.audio.unlock(), { once: true });
    const prog = (p, t) => G.ui.loader(p, t);
    await W.build(prog);
    G.ui.loaderHide();
    Main.ready = true; window.__ready = true;
    let rs2 = false; try { rs2 = sessionStorage.getItem('ew:resume') === '1'; sessionStorage.removeItem('ew:resume'); } catch (e) {}
    if (rs2 && G.save.exists()) { G.ui.refreshTitle(); Main.continueGame(); }
    G.ui.refreshTitle(); G.ui.menu('title');
    requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
  };

  /* botões */
  const on = (id, fn) => document.getElementById(id).addEventListener('click', fn);
  on('m-cont', () => Main.continueGame());
  on('m-new', () => { if (!G.save.settings.name) Main.askName(() => Main.newGame(), 'title'); else Main.newGame(); });
  on('m-set', () => G.ui.settings());
  on('m-wipe', () => {
    const b = document.getElementById('m-wipe');
    if (b.dataset.arm) { G.save.wipe(); G.S = null; b.dataset.arm = ''; G.ui.refreshTitle(); G.ui.toast('Dados apagados'); }
    else { b.dataset.arm = '1'; b.textContent = 'Toque de novo para apagar'; }
  });
  on('rl-spin', () => Main.spinRoll());
  on('rl-go', () => Main.enter());
  on('pz-res', () => Main.resume());
  on('pz-jor', () => G.ui.journal());
  on('pz-set', () => G.ui.settings());
  on('pz-title', () => Main.toTitle());
  on('b-menu', () => Main.pause());
  on('dt-r', () => { G.player.respawn(); Main.dead = false; G.ui.showDeath(false); });
  document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => G.ui.onBack()));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && Main.running) { Main.paused ? Main.resume() : Main.pause(); } });

  const hold = (id, name) => {
    const b = document.getElementById(id);
    b.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); In.press(name); });
    const up = (e) => { e.stopPropagation(); In.release(name); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  };
  const tap = (id, fn) => document.getElementById(id).addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); fn(); });
  hold('b-jump', 'jump'); hold('b-dodge', 'dodge'); hold('b-guard', 'guard');
  tap('b-act', () => In.press('act'));
  tap('b-sleep', () => G.rest.sleep());
  tap('b-seis', () => G.seis.toggle());
  tap('b-elc', () => cycleElement());
  document.querySelectorAll('#qk button').forEach((b) => b.addEventListener('pointerdown', (e) => {
    e.stopPropagation(); e.preventDefault(); B.castQuick(+b.dataset.q);
  }));
  const ELI = { fogo: ['🔥', '#ff7a3a'], agua: ['💧', '#5fb8ff'], terra: ['⛰', '#c89a5a'], ar: ['🌀', '#e8f2ff'] };
  function cycleElement() {
    const S = G.S, m = document.getElementById('elmenu'); if (!S || S.element !== 'avatar') return;
    if (!m.hidden) { m.hidden = true; return; }
    m.innerHTML = '<div class="ring"></div>'; const ring = m.firstChild;
    ELS.forEach((el, k) => {
      const a = -Math.PI / 2 + k * Math.PI / 2, b = document.createElement('button'), ok = G.mastery.any(el);
      b.style.cssText = '--c:' + ELI[el][1] + ';left:' + (130 + Math.cos(a) * 92) + 'px;top:' + (130 + Math.sin(a) * 92) + 'px';
      b.className = (ok ? '' : 'lock ') + (S.active === el ? 'cur' : '');
      b.innerHTML = '<b>' + (ok ? ELI[el][0] : '🔒') + '</b>' + G.mastery.NAME[el] + '<span>' + (ok ? Math.floor(G.mastery.get(el)) : 'não aprendido') + '</span>';
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation(); e.preventDefault();
        if (!ok) { G.ui.toast('Você ainda não aprendeu ' + G.mastery.NAME[el] + '. Procure um mestre desta nação.', 'err'); return; }
        S.active = el; m.hidden = true; G.audio.sfx('avatar'); G.ui.toast('Elemento: ' + G.mastery.NAME[el]); G.ui.refreshHud();
      });
      ring.appendChild(b);
    });
    const mid = document.createElement('div'); mid.className = 'mid'; mid.textContent = 'Elementos do Avatar'; ring.appendChild(mid);
    m.hidden = false;
  }
  document.getElementById('elmenu').addEventListener('pointerdown', (e) => { if (e.target.id === 'elmenu') e.currentTarget.hidden = true; });
  window.addEventListener('pointerdown', (e) => { if (e.target.closest && e.target.closest('#menus')) G.audio.unlock && G.audio.unlock(); }, true);

  G.ui.enter = () => {};
  Main.boot();
})();
