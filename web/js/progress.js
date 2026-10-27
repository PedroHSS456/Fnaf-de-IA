'use strict';
/* Elemental World — nível, XP, árvore de habilidades e atributos derivados */
(function () {
  const G = window.G; const M = G.M;
  const Pg = (G.prog = {});
  Pg.MAXLVL = 30;
  Pg.xpFor = (l) => Math.round(50 + 34 * Math.pow(l - 1, 1.45));
  Pg.SKILLS = [
    { id: 'poder', nome: 'Poder', ico: '💥', desc: '+8% de dano por nível', max: 5 },
    { id: 'eficiencia', nome: 'Eficiência', ico: '🍃', desc: '−7% de custo de chi por nível', max: 5 },
    { id: 'alcance', nome: 'Alcance', ico: '🎯', desc: '+8% de alcance e tamanho', max: 5 },
    { id: 'vigor', nome: 'Vigor', ico: '❤️', desc: '+12% de vida máxima', max: 5 },
    { id: 'fluxo', nome: 'Fluxo', ico: '🌀', desc: '+10% de regeneração de chi', max: 5 },
    { id: 'agilidade', nome: 'Agilidade', ico: '👟', desc: '+4% de velocidade e esquiva mais rápida', max: 5 },
    { id: 'mestria', nome: 'Mestria', ico: '🔗', desc: 'Combos duram mais e dão mais bônus', max: 3 },
    { id: 'estado', nome: 'Estado Avatar', ico: '✨', desc: '+4s de duração do Estado Avatar (só Avatar)', max: 3, avatar: true },
  ];
  Pg.rank = (id) => (G.S && G.S.skills[id]) || 0;
  Pg.stats = function () {
    const S = G.S, P = G.player, L = S.lvl;
    const r = Pg.rank;
    const av = P && P.avatarT > 0;
    return {
      hpMax: Math.round((100 + 14 * (L - 1)) * (1 + 0.12 * r('vigor')) * (S.element === 'terra' ? 1.12 : 1)),
      chiMax: Math.round(80 + 5 * (L - 1)),
      pdmg: (1 + 0.07 * (L - 1)) * (S.element === 'fogo' ? 1.05 : 1) * (av ? 1.4 : 1),
      dmg: (1 + 0.06 * (L - 1)) * (1 + 0.08 * r('poder')) * (av ? 2 : 1) * (S.element === 'fogo' ? 1.08 : 1),
      cost: Math.max(0.35, 1 - 0.07 * r('eficiencia')) * (av ? 0.4 : 1) * (G.diff ? G.diff.cost : 1),
      range: 1 + 0.08 * r('alcance') + (av ? 0.25 : 0),
      regen: 5 * (G.diff ? G.diff.regen : 1) * (1 + 0.1 * r('fluxo')) * (S.element === 'ar' ? 1.2 : 1) * (av ? 3 : 1),
      speed: 1 + 0.04 * r('agilidade') + (S.element === 'ar' ? 0.06 : 0) + (av ? 0.15 : 0),
    };
  };
  Pg.addXp = function (n) {
    const S = G.S; if (S.lvl >= Pg.MAXLVL) return;
    S.xp += Math.round(n); let up = 0;
    while (S.lvl < Pg.MAXLVL && S.xp >= Pg.xpFor(S.lvl)) { S.xp -= Pg.xpFor(S.lvl); S.lvl++; S.pts++; up++; }
    if (up) {
      const st = Pg.stats(); G.player.hp = st.hpMax; G.player.chi = st.chiMax;
      G.ui.banner('Nível ' + S.lvl + '!', '+' + up + ' ponto de habilidade');
      G.audio.sfx('level'); G.fx.burst(G.player.x, G.player.y + 1, G.player.z, 40, [1, 0.9, 0.4], 6, 0.5, 1.2, true, 1);
      G.quests && G.quests.event('level', S.lvl);
    }
  };
  Pg.buy = function (id) {
    const S = G.S, sk = Pg.SKILLS.find((s) => s.id === id); if (!sk) return false;
    if (sk.avatar && S.element !== 'avatar') return false;
    if (S.pts < 1 || Pg.rank(id) >= sk.max) return false;
    S.skills[id] = Pg.rank(id) + 1; S.pts--; return true;
  };
})();
