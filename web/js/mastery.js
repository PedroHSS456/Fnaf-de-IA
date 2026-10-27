'use strict';
/* Elemental World — maestria e técnicas.
   Nível = força (vida, chi, dano). Maestria = SÓ aprender técnicas novas (nunca altera dano/vida/chi).
   Todos começam sem técnica: a primeira exige um mestre; as seguintes exigem maestria + mestre. */
(function () {
  const G = window.G, M = G.M, B = G.bend;
  const Ms = (G.mastery = { REQ: [0, 25, 50, 75], MAX: 200, pool: 20, POOL: 20, train: null });
  const NAME = { fogo: 'Fogo', agua: 'Água', terra: 'Terra', ar: 'Ar' };
  const ELS = ['fogo', 'agua', 'terra', 'ar'];
  Ms.NAME = NAME;
  Ms.all = function () {
    const S = G.S; if (!S) return {};
    if (S.mv !== 2) { // migração: saves antigos mantêm o que já usavam
      const old = S.mastery, lr = { fogo: [0, 0, 0, 0], agua: [0, 0, 0, 0], terra: [0, 0, 0, 0], ar: [0, 0, 0, 0] };
      S.mastery = { fogo: 0, agua: 0, terra: 0, ar: 0 };
      if (old) for (const e of ELS) { S.mastery[e] = old[e] || 0; for (let i = 0; i < 4; i++) if (S.mastery[e] >= Ms.REQ[i] && (S.mastery[e] > 0 || (e === S.origin && S.lvl > 1))) lr[e][i] = 1; }
      S.learn = lr; S.mv = 2; S.sess = S.sess || {};
      S.unlocked = ELS.filter((e) => lr[e][0]);
    }
    return S.mastery;
  };
  Ms.get = (el) => Ms.all()[el] || 0;
  Ms.learned = (el, i) => { Ms.all(); const S = G.S; return !!(S && S.learn && S.learn[el] && S.learn[el][i]); };
  Ms.any = (el) => Ms.learned(el, 0);
  Ms.can = (el, i) => Ms.learned(el, i) || !!(Ms.train && Ms.train.el === el && i <= Ms.train.i);
  Ms.canAny = (el) => Ms.any(el) || !!(Ms.train && Ms.train.el === el);
  /* aprendível: maestria suficiente, anterior aprendida e ainda não aprendida */
  Ms.learnable = (el, i) => !Ms.learned(el, i) && Ms.get(el) >= Ms.REQ[i] && (i === 0 || Ms.learned(el, i - 1));
  Ms.state = (el, i) => (Ms.learned(el, i) ? 'ok' : Ms.learnable(el, i) ? 'learn' : 'lock');
  Ms.next = function (el) { for (let i = 0; i < 4; i++) if (!Ms.learned(el, i)) return { i, need: Ms.REQ[i] }; return null; };
  /* o elemento que o jogador pode aprender com mestres */
  Ms.canStudy = (el) => { const S = G.S; return !!S && (S.element === 'avatar' || el === S.origin); };
  Ms.learn = function (el, i) {
    const S = G.S; Ms.all(); if (Ms.learned(el, i)) return;
    S.learn[el][i] = 1;
    if (!S.unlocked.includes(el)) S.unlocked.push(el);
    if (S.element === 'avatar' && !S.active) S.active = el;
    const q = G.elements[el].quick[i];
    G.ui.banner(i === 0 ? 'Primeira técnica!' : 'Nova técnica!', (q ? q.nome : '') + ' — ' + NAME[el]); G.audio.sfx('level'); G.ui.refreshHud();
    G.quests && G.quests.event('learn', el);
    G.main.save();
  };
  /* ganho por prática: limitado por uma reserva que se recarrega devagar (sem grind infinito) */
  Ms.add = function (el, n, force) {
    const a = Ms.all(); if (a[el] == null || !Ms.any(el)) return;
    let g = n;
    if (!force) { const f = M.clamp(Ms.pool / 6, 0, 1) / (1 + a[el] / 70); g = n * f; Ms.pool = Math.max(0, Ms.pool - n * 4); }
    if (g <= 0.0005) return;
    const before = a[el]; a[el] = Math.min(Ms.MAX, a[el] + g);
    for (let i = 0; i < 4; i++) if (before < Ms.REQ[i] && a[el] >= Ms.REQ[i] && !Ms.learned(el, i) && (i === 0 || Ms.learned(el, i - 1))) {
      const q = G.elements[el].quick[i];
      G.ui.banner('Técnica disponível!', (q ? q.nome : '') + ' — procure um mestre de ' + NAME[el]); G.audio.sfx('level'); G.ui.refreshHud();
    }
  };
  Ms.update = function (dt) { Ms.pool = Math.min(Ms.POOL, Ms.pool + dt * 0.9); };
  Ms.hint = function (el, i) {
    const q = G.elements[el] && G.elements[el].quick[i]; if (!q) return '';
    if (!Ms.any(el) && i > 0) return 'Aprenda primeiro a técnica básica de ' + NAME[el] + ' com um mestre.';
    if (Ms.learnable(el, i)) return q.nome + ' já pode ser aprendida: fale com um mestre de ' + NAME[el] + '.';
    if (i > 0 && !Ms.learned(el, i - 1)) return 'Aprenda antes a técnica anterior.';
    return q.nome + ' exige maestria ' + Ms.REQ[i] + ' em ' + NAME[el] + ' (você tem ' + Math.floor(Ms.get(el)) + ').';
  };
  Ms.noPower = (el) => { if (!Ms.any(el)) B.warn('Você ainda não aprendeu nenhuma técnica de ' + NAME[el] + '. Procure um mestre de ' + NAME[el] + '.'); };

  /* ---- bloqueio de todos os caminhos de execução ---- */
  const cast = B.cast;
  B.cast = function (it) {
    const el = it && it.el || G.player.el();
    if (!Ms.canAny(el)) { Ms.noPower(el); return false; }
    const r = cast.apply(this, arguments); if (r !== false && !Ms.train) Ms.add(el, 0.3);
    return r;
  };
  const castQuick = B.castQuick;
  B.castQuick = function (i) {
    const el = G.player.el();
    if (!Ms.can(el, i)) { const m = Ms.hint(el, i); if (m) B.warn(m); return false; }
    const r = castQuick.apply(this, arguments); if (r && !Ms.train) Ms.add(el, 0.5 + 0.1 * i); return r;
  };
  const hs = B.holdStart;
  B.holdStart = function () { const el = G.player.el(); if (!Ms.canAny(el)) { Ms.noPower(el); return false; } return hs.apply(this, arguments); };
  const deal = G.combat.deal;
  G.combat.deal = function (t, d, o) { if (t && t !== G.player && d > 0 && o && o.el && !Ms.train) Ms.add(o.el, Math.min(0.5, d * 0.006)); return deal.apply(this, arguments); };
  /* durante o treino o chi é livre */
  const spend = G.player.spend;
  G.player.spend = function (n) { if (Ms.train) return true; return spend.call(this, n); };
  /* mestres derrotados: bônus único de maestria */
  const ev = G.quests.event;
  G.quests.event = function (name, arg) {
    if (name === 'master' && typeof arg === 'string' && Ms.all()[arg] != null) {
      const S = G.S; S.flags.mbonus = S.flags.mbonus || {};
      if (!S.flags.mbonus[arg] && Ms.any(arg)) { S.flags.mbonus[arg] = 1; Ms.add(arg, 15, true); G.ui.toast('Desafio do mestre vencido: +15 de maestria em ' + NAME[arg]); }
    }
    return ev.apply(this, arguments);
  };
})();
