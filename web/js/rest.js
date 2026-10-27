'use strict';
/* Elemental World — sentar e deitar de verdade. Câmera desce, o personagem fica parado e recupera vida e chi aos poucos.
   Dormir (pular a noite) só no modo "ciclo do jogo", só à noite e só deitado numa cama livre. */
(function () {
  const G = window.G, M = G.M, W = G.world;
  const R = (G.rest = { active: false, kind: null, spot: null, k: 0, eyeY: 0, t: 0, full: false });
  const RATE = { sit: [0.045, 0], lie: [0.075, 0] }; // fração do máximo por segundo: [chi, vida]
  const gameClock = () => G.save.settings.syncClock === false;
  const isNight = () => { const h = G.env.hour; return h >= 20 || h < 6; };
  R.canSleep = () => R.active && R.kind === 'lie' && gameClock() && isNight() && G.houses && G.houses.inside;
  function danger() {
    const P = G.player; return G.enemies.list.some((e) => e.alive && !e.boss && e.state === 'chase' && Math.hypot(e.x - P.x, e.z - P.z) < 30);
  }
  R.start = function (spot) {
    if (R.active) return; const P = G.player;
    if (danger()) { G.ui.toast('Há inimigos por perto: não dá para descansar', 'err'); return; }
    if (P.swimming || !P.alive) return;
    R.active = true; R.kind = spot.kind; R.spot = spot; R.t = 0; R.full = false; R.eyeY = spot.eye; R.pre = { x: P.x, z: P.z };
    P.x = spot.x; P.z = spot.z; P.y = spot.y; P.vx = P.vy = P.vz = 0; P.guard = false;
    G.cam.yaw = spot.yaw; G.cam.fpPitch = spot.kind === 'lie' ? 1.0 : 0;
    G.audio.sfx('pick'); G.main.save();
    if (spot.kind === 'lie') G.ui.toast(gameClock() ? (isNight() ? 'Deitado. Você pode descansar ou dormir até o amanhecer' : 'Deitado, descansando. (Só se dorme à noite)') : 'Deitado, descansando. (Horário do aparelho: só descansar)');
    else G.ui.toast('Sentado, descansando');
  };
  R.stop = function () {
    if (!R.active) return; const P = G.player, s = R.spot;
    R.active = false; P.x = s.ex; P.z = s.ez; P.y = W.groundY(P.x, P.z); G.cam.fpPitch = 0; G.main.save();
  };
  R.sit = (o) => R.start({ kind: 'sit', x: o.x, z: o.z, y: o.y, yaw: o.yaw || 0, eye: o.y + 1.02, ex: o.x + Math.sin(o.yaw || 0) * 1.1, ez: o.z + Math.cos(o.yaw || 0) * 1.1 });
  R.lie = function (o) {
    const Hs = G.houses, b = Hs.beds[o.bed];
    if (!Hs.bedFree(o.bed)) { G.ui.toast('Cama ocupada', 'err'); return; }
    R.start({ kind: 'lie', x: b.x, z: b.z, y: Hs.BED_TOP - 0.55 + 0.55, yaw: 0, eye: Hs.BED_TOP + 0.28, ex: b.x + (b.u < 0 ? 1.5 : -1.5), ez: b.z - 0.8 });
  };
  R.sleep = function () {
    if (!R.canSleep()) return;
    G.ui.fade(() => {
      const P = G.player, st = G.prog.stats();
      G.env.hour = 7; P.chi = st.chiMax; G.S.water = 100; P.burn = 0; P.slow = 0;
      G.main.save(); G.ui.banner('Bom dia', 'Você dormiu e acordou às 07:00'); G.audio.sfx('quest');
    }, 700);
  };
  R.update = function (dt) {
    const P = G.player, st = G.prog.stats();
    R.k += ((R.active ? 1 : 0) - R.k) * Math.min(1, dt * 3.2);
    const sb = document.getElementById('b-sleep'); sb.hidden = !R.canSleep();
    if (!R.active) return;
    R.t += dt; const r = RATE[R.kind];
    P.chi = Math.min(st.chiMax, P.chi + st.chiMax * r[0] * dt); P.hp = Math.min(st.hpMax, P.hp + st.hpMax * r[1] * dt);
    G.S.water = Math.min(100, G.S.water + 2 * dt);
    P.regenDelay = 0.5;
    if (G.cam.fpMode && R.kind === 'lie') G.cam.fpPitch = Math.max(0.15, G.cam.fpPitch);
    if (!R.full && P.chi >= st.chiMax - 0.5) { R.full = true; G.ui.toast('Chi totalmente recuperado'); }
  };
  /* pose do corpo na terceira pessoa */
  R.pose = function (root) {
    if (!R.active && R.k < 0.02) return;
    if (R.kind === 'lie') { root.pitch = -Math.PI / 2 * R.k; root.yaw = R.spot.yaw + Math.PI; root.y = R.spot.y + 0.2 * R.k + 0.0; }
    else root.y -= 0.42 * R.k;
  };
  const claims = G.gesture.claims; G.gesture.claims = function (x, y) { return R.active ? false : claims(x, y); };
  const hurt = G.player.hurt; G.player.hurt = function (d, o) { if (R.active) R.stop(); return hurt.call(this, d, o); };
  const draw = G.player.draw; G.player.draw = function () { return draw.call(this); };
})();
