'use strict';
/* Elemental World — eventos do mundo: invasões que surgem de tempos em tempos (no multiplayer só o host as cria e todos ganham a recompensa) */
(function () {
  const G = window.G, M = G.M, W = G.world, En = G.enemies;
  const Ev = (G.events = { t: 150, raid: null });
  const inTown = (x, z) => W.towns.some((t) => Math.hypot(x - t.x, z - t.z) < t.R + 8);
  const announce = (a, b, coins, xp) => {
    G.ui.banner(a, b); G.audio.sfx('quest');
    if (G.mp && G.mp.state === 'on') G.mp.send({ t: 'ev', to: 'all', k: 'bn', a, b, c: coins || 0, x: xp || 0 });
  };
  Ev.reset = function () { Ev.raid = null; Ev.t = M.rnd(120, 200); };
  Ev.start = function () {
    const P = G.player, T = [P].concat(G.mp && G.mp.proxies ? G.mp.proxies() : []).filter((q) => q.alive);
    const tg = T[Math.floor(Math.random() * T.length)]; if (!tg) return false;
    const a = Math.random() * 6.283, x = tg.x + Math.cos(a) * 26, z = tg.z + Math.sin(a) * 26;
    if (inTown(x, z) || inTown(tg.x, tg.z) || W.waterDepth(x, z) > 0.8) return false;
    let c = null, bd = 1e9; for (const q of En.camps) { const d = Math.hypot(q.x - x, q.z - z); if (d < bd) { bd = d; c = q; } }
    if (!c) return false;
    const lvl = En.campLevel(c), n = 4 + Math.min(3, Math.floor(lvl / 4)) + (T.length > 1 ? 2 : 0), mem = [];
    for (let i = 0; i < n; i++) {
      const e = En.mk(M.pick(c.types), x + M.rnd(-4, 4), z + M.rnd(-4, 4), Math.max(1, lvl + M.rint(0, 1)), null);
      e.state = 'chase'; e.raid = true; En.list.push(e); mem.push(e);
    }
    Ev.raid = { mem, lvl };
    announce('Invasão!', 'Inimigos avançam sobre você. Derrote todos!');
    return true;
  };
  Ev.update = function (dt) {
    if (G.mp && G.mp.skipSim()) return;
    if (!G.player.alive || !G.main.running) return;
    if (Ev.raid) {
      if (Ev.raid.mem.some((e) => e.alive && En.list.includes(e))) return;
      const l = Ev.raid.lvl; Ev.raid = null; Ev.t = M.rnd(300, 480);
      const coins = 30 + l * 8, xp = 80 + l * 25;
      G.S.inv.coins += coins; G.prog.addXp(xp); G.ui.pick('+' + coins + ' moedas');
      announce('Invasão repelida', 'Recompensa: ' + coins + ' moedas e ' + xp + ' XP', coins, xp);
      return;
    }
    Ev.t -= dt; if (Ev.t > 0) return;
    Ev.t = Ev.start() ? 0 : 25;
  };
  /* recompensa recebida de uma invasão vencida pelo host */
  Ev.onWin = function (m) {
    const c = Math.max(0, Math.min(500, +m.c || 0)), x = Math.max(0, Math.min(1000, +m.x || 0));
    if (c) { G.S.inv.coins += c; G.ui.pick('+' + c + ' moedas'); }
    if (x) G.prog.addXp(x);
  };
})();
