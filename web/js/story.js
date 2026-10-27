'use strict';
/* Elemental World — campanha "O Silêncio dos Quatro Cantos", missões extras, artefatos e vozes dos NPCs */
(function () {
  const G = window.G, M = G.M, Q = G.quests, D = Q.DEFS;
  const S = () => G.S;
  const done = (id) => !!S().quests[id] && S().quests[id].s === 'done';
  const St = (G.story = {});

  /* ---------- artefatos (efeitos reais nas estatísticas) ---------- */
  const ART = {
    art_ar: { nome: 'Amuleto do Vento', desc: 'Dobras custam 8% menos chi.', fx: (r) => { r.cost *= 0.92; } },
    art_terra: { nome: 'Coração de Pedra', desc: '+12% de vida máxima.', fx: (r) => { r.hpMax = Math.round(r.hpMax * 1.12); } },
    art_fogo: { nome: 'Brasa Eterna', desc: '+8% de dano.', fx: (r) => { r.dmg *= 1.08; } },
    art_agua: { nome: 'Lágrima de Maré', desc: '+10% de chi máximo.', fx: (r) => { r.chiMax = Math.round(r.chiMax * 1.1); } },
    art_cat: { nome: 'Lágrima do Guardião', desc: '+10% de dano e -6% de custo de chi.', fx: (r) => { r.dmg *= 1.1; r.cost = (r.cost || 1) * 0.94; } },
    art_final: { nome: 'Coração do Equilíbrio', desc: '+10% de dano, +10% de vida máxima e -6% de custo de chi.', fx: (r) => { r.dmg *= 1.1; r.hpMax = Math.round(r.hpMax * 1.1); r.cost = (r.cost || 1) * 0.94; } },
    art_selo: { nome: 'Selo do Equilíbrio', desc: '+6% de dano e +6% de vida máxima.', fx: (r) => { r.dmg *= 1.06; r.hpMax = Math.round(r.hpMax * 1.06); } },
  };
  St.ART = ART;
  const st0 = G.prog.stats;
  G.prog.stats = function () {
    const r = st0.apply(this, arguments), a = S() && S().flags && S().flags.art;
    if (a) for (const k in a) if (a[k] && ART[k]) ART[k].fx(r);
    return r;
  };
  St.giveArt = function (id) {
    const a = ART[id]; if (!a) return; G.extras.F().art[id] = true;
    G.ui.banner('Artefato encontrado', a.nome + ' — ' + a.desc);
  };

  /* prólogo: aparece uma vez no início de cada jogo */
  St.prologue = function () {
    const f = S().flags.tut; if (f.prologue) return; f.prologue = true;
    const L = [['Há mil anos', 'O Avatar Aru uniu os quatro elementos e selou Vael, o Dobrador Sem Nação.'], ['Hoje', 'Os santuários perderam o brilho e algo sussurra sob a terra.'], ['Você', 'Dobrador de uma nação, vai descobrir o que acordou. E decidir o que fazer com isso.']];
    L.forEach((b, i) => setTimeout(() => { if (G.main.running) G.ui.banner(b[0], b[1]); }, 9000 + i * 5500));
  };
  /* ---------- campanha principal ---------- */
  const TOWN = { agua: 'Marfrio', fogo: 'Brasaluz', terra: 'Pedralta', ar: 'Altavento' };
  Object.assign(D, {
    c1: { nome: 'Sinais no Ar', main: true, giver: () => S().origin + '_0', avail: () => done('m2'),
      desc: () => 'Seu ancião sente o equilíbrio dos elementos vacilar: os santuários perderam o brilho. Vá à Vila Encruzilhada (centro do mapa) e fale com Vovó Marta, que guarda os registros antigos.',
      obj: [{ t: 'talk', npc: 'hub_0', n: 1, txt: 'Falar com Vovó Marta na Vila Encruzilhada' }], rew: { xp: 150, coins: 40 } },
    c2: { nome: 'Os Quatro Santuários', main: true, giver: () => 'hub_0', avail: () => done('c1'),
      desc: 'Marta explica que cada nação tem um santuário que guarda o pulso de um elemento. Ative quatro santuários espalhados pelo mundo (interagir ao chegar perto).',
      obj: [{ t: 'shrine', n: 4, txt: 'Ativar santuários' }], rew: { xp: 300, coins: 80, pts: 1 } },
    c3: { nome: 'Palavras Esquecidas', main: true, giver: () => 'hub_0', avail: () => done('c2'),
      desc: 'Os santuários apontam para antigas ruínas com inscrições. Leia três inscrições: Ruínas do Vento (Altavento), Templo Esquecido (Pedralta), Ruínas das Chamas (Brasaluz) ou a Gruta Gelada (Marfrio).',
      obj: [{ t: 'read', n: 3, txt: 'Ler inscrições antigas' }], rew: { xp: 400, coins: 100, shard: 2 } },
    c4: { nome: 'O Eco no Templo', main: true, giver: () => 'hub_0', avail: () => done('c3'),
      desc: 'As inscrições falam do Eco do Equilíbrio, selado no Templo Esquecido (Reino das Mesetas). Acenda os três braseiros do templo (fogo ou brasas) e abra o cofre selado.',
      obj: [{ t: 'light', group: 'templo', n: 1, txt: 'Acender os 3 braseiros do Templo Esquecido' }, { t: 'chestid', id: 'c_templo_terra', n: 1, txt: 'Abrir o cofre do templo' }], rew: { xp: 600, coins: 150, pts: 1 } },
    c5: { nome: 'O Guardião do Desequilíbrio', main: true, giver: () => 'hub_0', avail: () => done('c4'),
      desc: 'O que dormia no templo agora se espalha pelos Mestres das nações. Derrote 2 Mestres nas arenas para restaurar o equilíbrio.',
      obj: [{ t: 'master', el: 'any', n: 2, txt: 'Derrotar 2 Mestres nas arenas' }], rew: { xp: 1200, coins: 400, pts: 3, art: 'art_selo' } },
    c6: { nome: 'Vozes dos Anciãos', main: true, giver: () => 'hub_0', avail: () => done('c5'),
      desc: 'Marta fecha o livro antigo: “O que despertou não era o inimigo, era um aviso. Para entender, ouça a memória de cada nação”. Visite os quatro anciãos: Marfrio (Água), Brasaluz (Fogo), Pedralta (Terra) e Altavento (Ar).',
      obj: [{ t: 'talk', npc: 'agua_0', n: 1, txt: 'Ouvir o ancião de Marfrio (Água)' }, { t: 'talk', npc: 'fogo_0', n: 1, txt: 'Ouvir a anciã de Brasaluz (Fogo)' }, { t: 'talk', npc: 'terra_0', n: 1, txt: 'Ouvir Dom Teodoro em Pedralta (Terra)' }, { t: 'talk', npc: 'ar_0', n: 1, txt: 'Ouvir o ancião de Altavento (Ar)' }],
      rew: { xp: 900, coins: 200, shard: 2, pts: 1 } },
    c7: { nome: 'O Selo de Vael', main: true, giver: () => 'hub_0', avail: () => done('c6'),
      desc: () => { const p = (G.world.pois || []).find((q) => q.id === 'catacumbas'), P = G.player, m = p ? Math.round(Math.hypot(p.x - P.x, p.z - P.z) / 10) * 10 : 0; return 'As quatro memórias contam a mesma história: Vael, o Dobrador Sem Nação, quer romper o selo que Aru deixou sob as Catacumbas do Eco' + (m ? ' (marco no mapa, a cerca de ' + m + ' m)' : '') + '. Desça, vença o Guardião do selo e reforce-o.'; },
      obj: [{ t: 'dungeon', n: 1, txt: 'Entrar nas Catacumbas do Eco' }, { t: 'dboss', n: 1, txt: 'Derrotar o Guardião do Selo' }], rew: { xp: 2000, coins: 500, pts: 3 } },
    c8: { nome: 'O Equilíbrio', main: true, giver: () => 'hub_0', avail: () => false,
      desc: 'Conte a Marta o que aconteceu nas Catacumbas.', obj: [{ t: 'talk', npc: 'hub_0', n: 1, txt: 'Contar a Marta o que aconteceu' }], rew: { xp: 3000, coins: 1000, pts: 5, art: 'art_final' } },
    /* missões extras */
    msg: { nome: 'O Mensageiro Desaparecido', giver: () => 'hub_3', avail: () => true,
      desc: 'Um mensageiro que levava cartas para Pedralta nunca chegou. Procure o Acampamento Abandonado nos Campos do Encontro e entregue o que achar a Dom Teodoro.',
      obj: [{ t: 'found', id: 'sat', n: 1, txt: 'Achar a bolsa no acampamento abandonado' }, { t: 'talk', npc: 'terra_0', n: 1, txt: 'Entregar a carta a Dom Teodoro (Pedralta)' }], rew: { xp: 260, coins: 90, ember: 2 } },
    entulho: { nome: 'Entulho Misterioso', giver: () => 'ar_3', avail: () => true,
      desc: 'Um monge ouviu ruídos vindos de uma câmara coberta de entulho nas Ruínas do Vento Antigo. Quebre as pedras (a Terra ajuda) e abra o baú.',
      obj: [{ t: 'chestid', id: 'c_ruinas_ar', n: 1, txt: 'Abrir a câmara das Ruínas do Vento' }], rew: { xp: 280, coins: 60 } },
    gelo: { nome: 'O Gelo que Guarda', giver: () => 'agua_1', avail: () => true,
      desc: 'Dizem que algo brilha atrás de blocos de gelo numa gruta distante. Derreta ou quebre o gelo e abra o baú.',
      obj: [{ t: 'chestid', id: 'c_gruta_agua', n: 1, txt: 'Abrir o baú da Gruta Gelada' }], rew: { xp: 280, coins: 60 } },
    chamas: { nome: 'Chama Esquecida', giver: () => 'fogo_1', avail: () => true,
      desc: 'Ruínas nas Terras de Brasa só se abrem com fogo. Acenda os dois braseiros (fogo ou brasas) e abra o cofre.',
      obj: [{ t: 'chestid', id: 'c_ruinas_fogo', n: 1, txt: 'Abrir o cofre das Ruínas das Chamas' }], rew: { xp: 280, coins: 60 } },
    vigia: { nome: 'A Luz da Torre', giver: () => 'hub_2', avail: () => true,
      desc: 'Jaci nunca soube quem ergueu a torre de vigia. Visite-a e abra o baú ao pé dela.',
      obj: [{ t: 'chestid', id: 'c_torre', n: 1, txt: 'Abrir o baú da Torre do Vigia' }], rew: { xp: 200, coins: 50 } },
  });

  /* recompensas extras e finais */
  const c0 = Q.complete;
  Q.complete = function (id) {
    c0.call(this, id);
    const r = D[id].rew || {}, s = S();
    if (r.shard) { s.inv.shard += r.shard; G.ui.pick('+' + r.shard + ' fragmentos'); }
    if (r.ember) { s.inv.ember += r.ember; G.ui.pick('+' + r.ember + ' brasas'); }
    if (r.art) St.giveArt(r.art);
    if (id === 'c3') setTimeout(() => G.ui.banner('Uma verdade antiga', 'O Eco do Equilíbrio foi selado sob o Templo Esquecido.'), 2600);
    if (id === 'c6') setTimeout(() => G.ui.banner('A verdade', 'Vael quer todos os elementos para si. Só o Selo mantém ele preso.'), 2600);
    if (id === 'c8') { s.flags.ended = true; setTimeout(() => G.ui.banner('Fim do Livro I', 'Vael foi selado de novo. O mundo respira.'), 2600); setTimeout(() => G.ui.banner('Obrigado por jogar', 'Avatar: Elemental World — a jornada continua no próximo capítulo.'), 7600); }
    if (id === 'c5') setTimeout(() => G.ui.banner('O equilíbrio foi restaurado', 'Ruínas e segredos ainda aguardam pelo mundo.'), 2600);
    G.save.write(s);
  };

  /* ---------- vozes dos NPCs ---------- */
  const SIG = {
    hub_0: ['Sessenta anos plantando neste solo e ele nunca me contou todos os seus segredos.', 'Os elementos conversam entre si, criança. Ultimamente estão em silêncio.'],
    hub_1: ['Preço bom é aquele que faz os dois lados reclamarem. Fale com ele, o mundo está cheio de rumores.', 'Não me pergunte de onde vêm as ervas. Pergunte só se está comprando.'],
    hub_2: ['Fico de olho nas estradas. Alguém precisa.', 'Dormir de guarda é pecado. Mas a cadeira ajuda.'],
    hub_3: ['Já tentei dobrar uma xícara de chá. Digamos que agora a xícara está mais baixa.', 'Dizem que o Avatar é imortal. Eu mal consigo ficar acordado depois do jantar.'],
    agua_0: ['Há quarenta invernos pesco neste fiorde e nunca vi a aurora tão pálida.', 'O gelo guarda memórias. Cuide para não derreter as erradas.'],
    agua_1: ['Peixe seco, ervas e conversa fiada: tudo à venda, só um deles é grátis.', 'Se o mar subir, vendo barcos. Se descer, vendo botas.'],
    agua_2: ['Lobos-do-gelo não atacam sem motivo. O motivo costuma ser fome.', 'Meu turno acaba quando o gelo parar de estalar.'],
    agua_3: ['Aprendi a dobrar com uma tia rabugenta. Ela me ensinou a respeitar a maré, e a ouvi-la reclamar.', 'Não sou fofoqueira, só sou bem informada.'],
    fogo_0: ['Fogo não se doma. Se negocia.', 'Cada brasa tem um dono. A minha cozinha todas as noites.'],
    fogo_1: ['Ouro, brasas, cinzas: tudo tem preço em Brasaluz.', 'Se o ferreiro Ashar te pedir brasas, diga que sim. Ele é perigoso quando contrariado.'],
    fogo_2: ['A lava não perdoa. A paciência também não.', 'Já vi a erupção pintar o céu de roxo. Nunca mais piscou o mesmo olho.'],
    fogo_3: ['Dizem que fogo e água se odeiam. Eu acho que só precisam de uma boa mediação.', 'Cozinhei um ovo no pé do vulcão. Ficou ótimo, mas perdi o pé.'],
    terra_0: ['Pedralta resiste a qualquer ataque. Somos firmes como a rocha. E teimosos, dizem.', 'Quando a terra treme, escuto. Ela fala baixo, mas não mente.'],
    terra_1: ['Pedras, ferramentas, ervas. Nesta ordem de utilidade.', 'Comprou? Ótimo. Vai levar? Melhor ainda.'],
    terra_2: ['Muros bem feitos não precisam de explicações.', 'Meu avô construiu a muralha. Meu pai consertou. Eu só reclamo dela.'],
    terra_3: ['Tentei esconder um tesouro uma vez. Esqueci onde. Agora é um mistério local.', 'Cuidado com os pedregulhos nas estradas. Eles se mexem quando a gente não olha.'],
    ar_0: ['O vento nos ensina a soltar o que pesa.', 'Meditar é só ouvir o ar entre um pensamento e outro.'],
    ar_1: ['Não vendo mapas. Vendo direções. Os mapas mentem, o vento não.', 'Ervas leves, preços leves. Tudo leve, exceto a conversa.'],
    ar_2: ['Planar é um direito, não um privilégio. Pergunte aos corvos.', 'A guarda do vento é simples: manter os pés longe do chão e os olhos no chão.'],
    ar_3: ['Dizem que ouvi sons nas ruínas ao norte. Eu digo que o vento canta. Mas cantava diferente.', 'Dobrar ar é fácil. Difícil é parar de rir quando o vento faz cócegas.'],
  };
  const RUMORS = [
    'Dizem que há ruínas onde o vento sussurra, nos Picos dos Ventos. Um monge jura ter ouvido algo preso sob o entulho.',
    'Um templo antigo se esconde no Reino das Mesetas. Quem acender seus três braseiros leva o que há lá dentro.',
    'As Ruínas das Chamas, nas Terras de Brasa, só se abrem com fogo (ou com brasas, se você tiver).',
    'Há uma gruta de gelo nas Tribos do Gelo: algo brilha atrás dos blocos.',
    'Um mensageiro sumiu a leste da Vila Encruzilhada. Deixou até a bolsa para trás!',
    'Uma torre de vigia se vê ao longe nos Campos do Encontro. Ninguém sabe quem a ergueu nem quem acende a luz do topo.',
  ];
  function voice(d) {
    const sig = SIG[d.id] || [];
    const pool = sig.slice();
    if (d.role === 'ancião') {
      if (done('c2')) pool.push('Soube que você despertou os santuários. Os elementos agradecem, mesmo em silêncio.');
      if (done('c4')) pool.push('O que dormia sob o templo já foi acordado. Prepare-se, o equilíbrio depende dos Mestres.');
      if (done('c5')) pool.push('O equilíbrio voltou graças a você. Que o seu nome seja lembrado nos santuários.');
    } else if (d.role === 'mercador') { pool.push(M.pick(RUMORS), M.pick(RUMORS)); }
    else if (d.role === 'guarda') {
      if (!done('c1')) pool.unshift('Não conheço você. Mantenha as mãos onde eu possa vê-las.');
      else pool.push('Você tem fama de quem resolve problemas. Fico de olho no horizonte por você.');
    }
    if (G.env.hour >= 17 && Math.random() < 0.4) pool.push('A noite chega. Boa hora para uma fogueira e um bom chá.');
    if (S().flags.npcTalk[d.id] > 3 && Math.random() < 0.25) pool.push('Você de novo? Tudo bem, a conversa é de graça.');
    return M.pick(pool.length ? pool : ['Que os elementos guiem seus passos.']);
  }
  /* memórias dos anciãos (missão "Vozes dos Anciãos") */
  const LORE = {
    agua_0: 'A água lembra o primeiro choro do mundo. Há mil anos, o Avatar Aru mergulhou neste fiorde para aprender que dobrar é ceder. Foi aqui que ele jurou: “Nenhum de nós dobrará sozinho”.',
    fogo_0: 'O fogo lembra a primeira faísca, e a primeira traição. Um dobrador chamado Vael quis dominar os quatro elementos só para si. Brasaluz o expulsou. Ele jurou voltar.',
    terra_0: 'A terra guarda os corpos e os segredos. Aru derrotou Vael e o selou nas Catacumbas do Eco, nos Campos do Encontro. Cada Mestre das nações guarda um pedaço dessa chave.',
    ar_0: 'O ar guarda os nomes, para que ninguém os esqueça. Quando o equilíbrio vacila, Vael sussurra do selo. Se ele sair, os quatro elementos viram uma arma. Vá, e escolha o que o Avatar deve ser.',
  };
  const dlg0 = Q.dialogue;
  Q.dialogue = function (npc) {
    const d = npc.def, st = S();
    if (d.id === 'hub_0' && done('c7') && !st.quests.c8) { // desfecho da campanha
      return { nome: d.nome + ' — Ancião de Vila Encruzilhada', text: '“Eu senti o selo firmar sob meus pés. Você fez o que o Avatar Aru fez, e por escolha própria. O mundo não precisa de um herói perfeito, só de alguém que volte.”', buttons: [{ t: 'Concluir a jornada', fn: () => { st.quests.c8 = { s: 'active', p: [1] }; Q.complete('c8'); G.ui.closeDialog(); } }] };
    }
    const hasOffer = Q.offerFor(d.id).length > 0;
    const hasActive = Object.keys(D).some((id) => D[id].giver() === d.id && st.quests[id] && st.quests[id].s === 'active');
    const r = dlg0.call(this, npc);
    if (!hasOffer && !hasActive) r.text = '“' + voice(d) + '”';
    // missão de entrega: reage quando o jogador traz a carta
    if (LORE[d.id] && st.quests.c6 && st.quests.c6.s !== undefined) r.text = '“' + LORE[d.id] + '”';
    if (d.id === 'terra_0' && st.quests.msg && st.quests.msg.s === 'active' && st.flags.found && st.flags.found.sat) r.text = '“Uma carta de Marga! Faz meses que espero isso. Você tem a gratidão de Pedralta.”';
    if (d.role === 'mercador' && (G.env.hour >= 20 || G.env.hour < 7)) { r.buttons = r.buttons.filter((b) => !/^Comprar/.test(b.t)); r.text = '“A loja está fechada a esta hora. Volte a partir das 7h.”'; }
    return r;
  };
})();
