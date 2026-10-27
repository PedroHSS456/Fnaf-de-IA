'use strict';
/* Elemental World — missões, diálogos, loja simples e diário */
(function () {
  const G = window.G; const M = G.M;
  const Q = (G.quests = {});
  const S = () => G.S;
  const orig = () => S().origin;
  const isAv = () => S().element === 'avatar';
  const EN = { fogo: 'Fogo', agua: 'Água', terra: 'Terra', ar: 'Ar' };
  const MESTRE = { fogo: 'Mestra Ignéa', agua: 'Mestre Maréu', terra: 'Mestra Graniz', ar: 'Mestra Zéfira' };
  const TOWN = { hub: 'Vila Encruzilhada', agua: 'Marfrio', fogo: 'Brasaluz', terra: 'Pedralta', ar: 'Altavento' };

  const D = {
    m1: { nome: 'O Despertar', main: true, giver: () => orig() + '_0', avail: () => true,
      desc: 'Você ainda não sabe dobrar! Primeiro encontre o Mestre do seu elemento (a seta dourada aponta o caminho) e peça treinamento. Depois pratique os gestos no círculo DOBRAR, no canto direito.',
      obj: [{ t: 'cast', shape: 'jab', n: 3, txt: 'Toque no botão de dobra (golpe rápido)' }, { t: 'cast', shape: 'launch', n: 1, txt: 'Arraste para CIMA no botão e solte (arremesso)' }, { t: 'cast', shape: 'slam', n: 1, txt: 'Arraste para BAIXO e solte (impacto no chão)' }, { t: 'cast', shape: 'sweep', n: 1, txt: 'Arraste para o LADO e solte (varredura)' }, { t: 'cast', shape: 'ring', n: 1, txt: 'Desenhe um CÍRCULO no botão' }, { t: 'learn', n: 1, txt: 'Aprender a 1ª técnica com o Mestre da sua nação' }, { t: 'cast', shape: 'hold', n: 1, txt: 'Segure o botão um instante e solte' }],
      rew: { xp: 90, coins: 25, pts: 1 }, next: 'm2' },
    m2: { nome: 'Primeiro Combate', main: true, giver: () => orig() + '_0', avail: () => !!S().quests.m1 && S().quests.m1.s === 'done',
      desc: 'Saqueadores rondam as redondezas. Derrote 4 inimigos para provar que está pronto.',
      obj: [{ t: 'kill', target: '*', n: 4, txt: 'Derrotar inimigos' }], rew: { xp: 150, coins: 40, herb: 3 } },
    master: { nome: 'O Desafio do Mestre', main: true, giver: () => orig() + '_0', avail: () => !!S().quests.m2 && S().quests.m2.s === 'done' && !isAv(),
      desc: () => 'Encontre ' + MESTRE[orig()] + ' na arena do mapa e peça o desafio (botão de interagir).',
      obj: [{ t: 'master', el: 'self', n: 1, txt: 'Derrotar o Mestre da sua nação' }], rew: { xp: 500, coins: 150, pts: 1 } },
    avmaster: { nome: 'Os Quatro Elementos', main: true, giver: () => orig() + '_0', avail: () => !!S().quests.m2 && S().quests.m2.s === 'done' && isAv(),
      desc: 'Como Avatar, você precisa aprender todos os elementos. Derrote cada Mestre (Fogo, Água, Terra e Ar) e aprenda o elemento dele.',
      obj: [{ t: 'master', el: 'any', n: 3, txt: 'Aprender com 3 Mestres (além do seu primeiro elemento)' }], rew: { xp: 800, coins: 250, pts: 2 } },
    hub_ervas: { nome: 'Ervas para a Vovó', giver: () => 'hub_1', avail: () => true, desc: 'Colete 4 ervas medicinais (dropam de inimigos e caixas).', obj: [{ t: 'pick', item: 'herb', n: 4, txt: 'Coletar ervas' }], rew: { xp: 70, coins: 30 } },
    hub_bandidos: { nome: 'Estrada Segura', giver: () => 'hub_2', avail: () => true, desc: 'Bandidos atacam viajantes nos Campos do Encontro.', obj: [{ t: 'kill', target: 'bandido', n: 5, txt: 'Derrotar bandidos' }], rew: { xp: 140, coins: 50 } },
    explorar: { nome: 'Santuários', giver: () => 'hub_3', avail: () => true, desc: 'Antigos santuários guardam energia. Ative 3 deles (interagir).', obj: [{ t: 'reach', n: 3, txt: 'Ativar santuários' }], rew: { xp: 180, coins: 60, pts: 1 } },
    caverna: { nome: 'Tesouro Escondido', giver: () => 'hub_1', avail: () => !!S().quests.hub_ervas && S().quests.hub_ervas.s === 'done', desc: 'Há baús em cavernas pelo mundo. Abra 2 deles.', obj: [{ t: 'chest', n: 2, txt: 'Abrir baús' }], rew: { xp: 160, coins: 80 } },
    agua_lobos: { nome: 'Uivos no Gelo', giver: () => 'agua_2', avail: () => true, desc: 'Lobos-do-gelo ameaçam Marfrio. Dica: o fogo derrete essas feras.', obj: [{ t: 'kill', target: 'lobogelo', n: 4, txt: 'Derrotar lobos-do-gelo' }], rew: { xp: 170, coins: 55 } },
    agua_gelo: { nome: 'Caminho Bloqueado', giver: () => 'agua_3', avail: () => true, desc: 'Blocos de gelo bloqueiam rotas. Quebre 3 (fogo e terra funcionam melhor).', obj: [{ t: 'break', kind: 'iceblock', n: 3, txt: 'Quebrar blocos de gelo' }], rew: { xp: 130, coins: 40 } },
    fogo_salamandras: { nome: 'Calor Demais', giver: () => 'fogo_2', avail: () => true, desc: 'Salamandras invadiram os campos. A água as enfraquece.', obj: [{ t: 'kill', target: 'salamandra', n: 4, txt: 'Derrotar salamandras' }], rew: { xp: 170, coins: 55 } },
    fogo_barricada: { nome: 'Queimando Barricadas', giver: () => 'fogo_3', avail: () => true, desc: 'Barricadas de madeira bloqueiam a estrada. Queime ou quebre 2.', obj: [{ t: 'break', kind: 'barricade', n: 2, txt: 'Destruir barricadas' }], rew: { xp: 120, coins: 40 } },
    terra_golem: { nome: 'Pedra que Anda', giver: () => 'terra_2', avail: () => true, desc: 'Um golem de rocha ronda Pedralta. Cuidado com o golpe no chão: pule!', obj: [{ t: 'kill', target: 'golem', n: 1, txt: 'Derrotar um golem' }], rew: { xp: 220, coins: 70 } },
    terra_pedras: { nome: 'Limpando o Caminho', giver: () => 'terra_3', avail: () => true, desc: 'Entulho bloqueia as rotas. Quebre 4 pedregulhos (Terra é o melhor).', obj: [{ t: 'break', kind: 'rubble', n: 4, txt: 'Quebrar pedregulhos' }], rew: { xp: 150, coins: 45 } },
    ar_corvos: { nome: 'Céu Sombrio', giver: () => 'ar_2', avail: () => true, desc: 'Corvos da tormenta perturbam Altavento. O fogo os afasta.', obj: [{ t: 'kill', target: 'corvo', n: 5, txt: 'Derrotar corvos' }], rew: { xp: 170, coins: 55 } },
    ar_saqueadores: { nome: 'Ventos de Saque', giver: () => 'ar_3', avail: () => true, desc: 'Saqueadores roubam suprimentos dos monges.', obj: [{ t: 'kill', target: 'saqueador', n: 3, txt: 'Derrotar saqueadores' }], rew: { xp: 150, coins: 50 } },
  };
  Q.DEFS = D;
  /* missões diárias: sorteadas pela data, mudam todo dia e podem ser feitas de novo */
  const dayKey = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
  const DAILY = [
    (r) => { const n = 6 + Math.floor(r() * 6); return { nome: 'Caçada do Dia', desc: 'Derrote ' + n + ' inimigos hoje.', obj: [{ t: 'kill', target: '*', n, txt: 'Derrotar inimigos' }] }; },
    (r) => { const n = 3 + Math.floor(r() * 4); return { nome: 'Colheita do Dia', desc: 'Colete ' + n + ' ervas (dropam de inimigos e caixas).', obj: [{ t: 'pick', item: 'herb', n, txt: 'Coletar ervas' }] }; },
    (r) => { const n = 1 + Math.floor(r() * 2); return { nome: 'Caça ao Tesouro', desc: 'Abra ' + n + ' baú(s) em cavernas ou ruínas.', obj: [{ t: 'chest', n, txt: 'Abrir baús' }] }; },
    (r) => { const n = 2 + Math.floor(r() * 2); return { nome: 'Peregrino', desc: 'Ative ' + n + ' santuário(s) pelo mundo.', obj: [{ t: 'reach', n, txt: 'Ativar santuários' }] }; },
    (r) => { const n = 4 + Math.floor(r() * 4); return { nome: 'Estrada Segura', desc: 'Derrote ' + n + ' bandidos que atacam viajantes.', obj: [{ t: 'kill', target: 'bandido', n, txt: 'Derrotar bandidos' }] }; },
    (r) => { const n = 3 + Math.floor(r() * 3); return { nome: 'Mestre dos Gestos', desc: 'Use ' + n + ' ataques de lançamento (arrastar para cima no círculo).', obj: [{ t: 'cast', shape: 'launch', n, txt: 'Lançar dobras' }] }; },
  ];
  function mkDaily(id) { // daily_AAAAMMDD_i
    const m = /^daily_(\d{8})_(\d)$/.exec(id); if (!m || D[id]) return;
    const day = +m[1], i = +m[2], r = M.seeded(day * 7 + i * 131);
    const pick = DAILY[Math.floor(r() * DAILY.length)], q = pick(r);
    const l = () => (S() ? S().lvl || 1 : 1);
    q.daily = true; q.giver = () => (orig() === 'hub' ? 'hub' : orig()) + '_' + (2 + i);
    q.avail = () => dayKey() === day;
    q.rew = { xp: 60 + l() * 25, coins: 25 + l() * 6, herb: i === 0 ? 0 : 1 };
    q.nome = 'Diária: ' + q.nome; D[id] = q;
  }
  Q.prep = function () {
    const k = dayKey(); mkDaily('daily_' + k + '_0'); mkDaily('daily_' + k + '_1');
    for (const id in S().quests) if (id.startsWith('daily_')) mkDaily(id);
  };
  const txt = (v) => (typeof v === 'function' ? v() : v);

  Q.state = (id) => S().quests[id];
  Q.isActive = (id) => S().quests[id] && S().quests[id].s === 'active';
  Q.accept = function (id) {
    const q = D[id]; if (!q || S().quests[id]) return;
    S().quests[id] = { s: 'active', p: q.obj.map(() => 0) };
    G.ui.banner('Nova missão', q.nome); G.audio.sfx('quest');
    Q.check(id); G.ui.refreshHud();
  };
  function objMatch(o, type, pl) {
    if (o.t !== type) return false;
    if (type === 'kill') return o.target === '*' || o.target === pl;
    if (type === 'cast') return o.shape === pl.shape;
    if (type === 'break') return o.kind === pl;
    if (type === 'master') return o.el === 'any' || (o.el === 'self' ? pl === orig() : o.el === pl);
    if (type === 'pick') return o.item === pl;
    if (type === 'reach' || type === 'chest') return true;
    if (type === 'talk') return o.npc === pl;
    if (type === 'light') return o.group === pl;
    if (type === 'found' || type === 'chestid') return o.id === pl;
    return true;
  }
  Q.event = function (type, pl) {
    const st = S(); if (!st) return;
    for (const id in st.quests) {
      const s = st.quests[id]; if (s.s !== 'active') continue; const q = D[id]; if (!q) continue;
      q.obj.forEach((o, i) => { if (objMatch(o, type, pl) && s.p[i] < o.n) { s.p[i]++; if (s.p[i] === o.n) G.ui.toast('✓ ' + o.txt, 'ok'); } });
      Q.check(id);
    }
  };
  Q.check = function (id) {
    const s = S().quests[id], q = D[id]; if (!s || s.s !== 'active') return;
    q.obj.forEach((o, i) => { if (s.p[i] == null) s.p[i] = o.t === 'learn' && G.mastery && G.mastery.any(S().origin) ? 1 : 0; });
    if (q.obj.every((o, i) => s.p[i] >= o.n)) Q.complete(id);
    G.ui.refreshHud();
  };
  Q.complete = function (id) {
    const s = S().quests[id], q = D[id]; s.s = 'done';
    const r = q.rew || {}; const st = S();
    G.ui.banner('Missão concluída', q.nome); G.audio.sfx('quest');
    if (r.coins) { st.inv.coins += r.coins; G.ui.pick('+' + r.coins + ' moedas'); }
    if (r.herb) { st.inv.herb += r.herb; G.ui.pick('+' + r.herb + ' ervas'); }
    if (r.pts) { st.pts += r.pts; G.ui.pick('+' + r.pts + ' ponto de habilidade'); }
    if (r.xp) G.prog.addXp(r.xp);
    if (id === 'master' || id === 'avmaster') setTimeout(() => G.ui.banner('Fim da fatia 0.1', 'Continue explorando e evoluindo!'), 2500);
    G.save.write(st);
  };
  Q.active = () => Object.keys(S().quests).filter((id) => S().quests[id].s === 'active');
  Q.tracked = function () {
    const act = Q.active(); if (!act.length) return null;
    act.sort((a, b) => (D[b].main ? 1 : 0) - (D[a].main ? 1 : 0));
    const id = act[0], q = D[id], s = S().quests[id];
    q.obj.forEach((o, k) => { if (s.p[k] == null) s.p[k] = 0; });
    const i = q.obj.findIndex((o, k) => s.p[k] < o.n);
    const o = q.obj[Math.max(0, i)];
    return { id, nome: q.nome, txt: o.txt + (o.n > 1 ? ' (' + s.p[Math.max(0, i)] + '/' + o.n + ')' : '') };
  };
  Q.desc = (id) => txt(D[id].desc);
  /* disponíveis para um NPC */
  Q.offerFor = function (npcId) {
    Q.prep();
    const out = [];
    for (const id in D) { const q = D[id]; if (q.giver() === npcId && !S().quests[id] && q.avail()) out.push(id); }
    return out;
  };
  Q.hasMark = (npcId) => Q.offerFor(npcId).length > 0;

  /* ---------- diálogo ---------- */
  const FLAV = {
    hub: ['Os Campos do Encontro são o coração do mundo, viajante.', 'Dizem que quem domina um elemento jamais o troca.', 'Cuidado à noite: os bandidos ficam audaciosos.'],
    agua: ['A água vive em tudo aqui: no gelo, na neve, no mar.', 'Procure um lago antes de lutar: sem água, sua dobra falha.', 'O Mestre Maréu treina além do fiorde ao norte.'],
    fogo: ['O fogo exige respeito. Ele cresce com quem o alimenta.', 'Cuidado com os rios de lava: nem pense em nadar neles.', 'A Mestra Ignéa vive perto do vulcão.'],
    terra: ['Pedralta resiste a qualquer ataque. Somos firmes como a rocha.', 'Muros de pedra são a melhor defesa. Aprenda a erguê-los.', 'A Mestra Graniz guarda a arena a sudeste.'],
    ar: ['O vento nos ensina a soltar o que pesa.', 'Segure o pulo no ar para planar com a brisa.', 'A Mestra Zéfira nos observa dos picos a noroeste.'],
  };
  Q.dialogue = function (npc) {
    const d = npc.def, st = S(), btn = [];
    let text = '';
    const myQ = [];
    for (const id in D) if (D[id].giver() === d.id && st.quests[id] && st.quests[id].s === 'active') myQ.push(id);
    const offers = Q.offerFor(d.id);
    st.flags.npcTalk[d.id] = (st.flags.npcTalk[d.id] || 0) + 1;
    if (offers.length) {
      const id = offers[0], q = D[id];
      text = '“' + (q.main ? 'Tenho algo importante para você, ' + st.name + '. ' : 'Ei, viajante! Preciso de ajuda. ') + Q.desc(id) + '”';
      btn.push({ t: 'Aceitar: ' + q.nome, fn: () => { Q.accept(id); G.ui.closeDialog(); } });
      btn.push({ t: 'Agora não', fn: () => G.ui.closeDialog() });
    } else if (myQ.length) {
      const id = myQ[0], s = st.quests[id], q = D[id];
      const i = q.obj.findIndex((o, k) => s.p[k] < o.n); const o = q.obj[Math.max(0, i)];
      text = '“Como vai a missão “' + q.nome + '”? Falta: ' + o.txt + ' (' + s.p[Math.max(0, i)] + '/' + o.n + ').”';
      btn.push({ t: 'Continuar', fn: () => G.ui.closeDialog() });
    } else {
      text = '“' + M.pick(FLAV[d.reg]) + '”';
    }
    if (d.role === 'mercador') {
      btn.unshift({ t: 'Comprar 1 erva (12 moedas)', fn: () => { if (st.inv.coins >= 12) { st.inv.coins -= 12; st.inv.herb++; G.audio.sfx('pick'); G.ui.toast('Erva comprada', 'ok'); G.ui.talkRefresh(); } else G.ui.toast('Moedas insuficientes', 'err'); }, keep: true });
      btn.unshift({ t: 'Comprar 5 ervas (50 moedas)', fn: () => { if (st.inv.coins >= 50) { st.inv.coins -= 50; st.inv.herb += 5; G.audio.sfx('pick'); G.ui.toast('5 ervas compradas', 'ok'); G.ui.talkRefresh(); } else G.ui.toast('Moedas insuficientes', 'err'); }, keep: true });
    }
    if (d.role === 'ancião' || d.role === 'curandeiro') btn.push({ t: 'Descansar e salvar', fn: () => { G.main.rest(); G.ui.closeDialog(); } });
    return { nome: d.nome + ' — ' + (d.role === 'ancião' ? 'Ancião' : d.role === 'mercador' ? 'Mercador' : d.role === 'guarda' ? 'Guarda' : 'Morador') + ' de ' + TOWN[d.town], text, buttons: btn };
  };
})();
