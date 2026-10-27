'use strict';
/* Elemental World — interações: NPCs, baús, santuários, poços, bancos, placas, inscrições, sinos, braseiros */
(function () {
  const G = window.G, M = G.M, W = G.world, In = G.input;
  const A = (G.act = { cur: null, best: null });
  const S = () => G.S;
  const F = () => G.extras.F();
  const near = (o, r) => { const P = G.player, d = Math.hypot(o.x - P.x, o.z - P.z); return d < r ? d : -1; };

  const LABEL = (o) => {
    const f = F();
    switch (o.kind) {
      case 'well': return 'Beber água';
      case 'bench': return 'Sentar e descansar';
      case 'bed': return G.houses.bedFree(o.bed) ? 'Deitar e descansar' : 'Cama ocupada';
      case 'house': return o.own ? 'Entrar na nossa casa' : 'Entrar na casa';
      case 'hexit': return 'Sair de casa';
      case 'fnexit': return 'Sair da pizzaria';
      case 'dungeon': return G.S.flags.puzzles && G.S.flags.puzzles.catacumba_boss ? 'Refazer as Catacumbas (o selo volta a fechar)' : 'Entrar nas Catacumbas';
      case 'dexit': return 'Sair das catacumbas';
      case 'sign': return 'Ler placa';
      case 'ins': return 'Ler inscrição';
      case 'bell': return 'Tocar o sino';
      case 'grill': return G.items.count('carne_crua') > 0 ? 'Assar carne (' + G.items.count('carne_crua') + ')' : 'Churrasqueira (traga carne crua)';
      case 'brazier': return o.lit ? (G.items.count('carne_crua') > 0 ? 'Assar carne (' + G.items.count('carne_crua') + ')' : null) : (S().inv.ember > 0 ? 'Acender (1 brasa)' : 'Braseiro apagado (use fogo)');
      case 'satchel': return f.found.sat ? null : 'Examinar a bolsa';
    }
    return null;
  };
  function gather() {
    const f = F(), out = [];
    if (G.rest.active) return { d: -1, label: 'Levantar', run: () => G.rest.stop() };
    if (G.drag.held) return { d: -1, label: 'Soltar ' + G.drag.KIND[G.drag.held.k].nome.toLowerCase(), run: () => G.drag.drop() };
    for (const n of G.npcs.list) { if (n.inside || !n.model) continue; const d = near(n, 2.8); if (d >= 0) out.push({ d: d - 0.6, label: 'Falar com ' + n.def.nome, run: () => A.talk(n) }); }
    for (const c of W.chests) { if (f.chests[c.id]) continue; const d = near(c, 2.6); if (d >= 0) out.push({ d, label: c.needs && !f.puzzles[c.needs] ? 'Baú selado' : 'Abrir baú', run: () => openChest(c) }); }
    for (const s of W.shrines) { const d = near(s, 3.4); if (d >= 0) out.push({ d, label: f.shrines[s.id] ? 'Meditar no santuário' : 'Ativar santuário', run: () => shrine(s) }); }
    for (const o of W.objs) { const d = near(o, o.rr || 2.4); if (d < 0) continue; const l = LABEL(o); if (l) out.push({ d, label: l, run: () => objAct(o) }); }
    const it = G.drag.nearest(); if (it) out.push({ d: it.dist + 0.5, label: 'Pegar ' + G.drag.KIND[it.k].nome.toLowerCase(), run: () => G.drag.pick(it) });
    out.sort((a, b) => a.d - b.d);
    return out[0] || null;
  }

  A.talk = function (n, refresh) {
    n = n || A.cur; if (!n) return; A.cur = n;
    if (!refresh) G.quests.event('talk', n.def.id);
    const r = G.quests.dialogue(n);
    G.ui.dialog(r.nome, r.text, r.buttons); G.main.paused = true;
  };

  function openChest(c) {
    const f = F(), st = S(), P = G.player;
    if (c.needs && !f.puzzles[c.needs]) { G.ui.toast('Selado: o mecanismo do local ainda não foi ativado', 'err'); G.audio.sfx('block'); return; }
    f.chests[c.id] = true; G.audio.sfx('pick');
    const k = c.loot, n = k === 'ruin' ? M.rint(60, 120) : k === 'cave' ? M.rint(25, 70) : M.rint(15, 40);
    st.inv.coins += n; G.ui.pick('+' + n + ' moedas');
    if (Math.random() < 0.7) { const h = M.rint(1, 3); st.inv.herb += h; G.ui.pick('+' + h + ' ervas'); }
    if (k !== 'town' && Math.random() < 0.6) { const e = M.rint(1, 2); st.inv.ember += e; G.ui.pick('+' + e + ' brasa(s)'); }
    if (k === 'ruin' && !c.art) { st.inv.shard++; G.ui.pick('+1 fragmento'); }
    if (c.art) G.story.giveArt(c.art);
    G.prog.addXp(k === 'ruin' ? 60 : 25);
    G.fx.burst(c.x, W.groundY(c.x, c.z) + 0.8, c.z, 16, [1, 0.85, 0.3], 3, 0.3, 0.6, true, 2);
    G.quests.event('chest'); G.quests.event('chestid', c.id);
  }
  function shrine(s) {
    const P = G.player, st = S(), f = F(), stt = G.prog.stats();
    P.chi = stt.chiMax; st.water = 100; st.checkpoint = { x: s.x, z: s.z };
    G.fx.ring(s.x, W.groundY(s.x, s.z) + 0.3, s.z, 1.2, 40, [0.5, 0.9, 1], true, 1.2); G.audio.sfx('quest');
    if (!f.shrines[s.id]) {
      f.shrines[s.id] = true; G.prog.addXp(60); G.ui.banner('Santuário ativado', s.nome || 'Energia restaurada'); G.quests.event('reach'); G.quests.event('shrine', s.reg);
    } else G.ui.toast('Você meditou: chi restaurado');
    G.main.save();
  }
  function objAct(o) {
    const P = G.player, st = S(), f = F(), stt = G.prog.stats();
    if (o.kind === 'well') { P.chi = stt.chiMax; st.water = 100; G.audio.sfx('pick'); G.ui.toast('Água fresca: chi e reserva de água cheios'); G.fx.burst(o.x, o.y + 0.9, o.z, 10, [0.5, 0.8, 1], 2, 0.25, 0.5, true, 3); }
    else if (o.kind === 'bench') G.rest.sit(o);
    else if (o.kind === 'bed') G.rest.lie(o);
    else if (o.kind === 'house') G.houses.enter(o);
    else if (o.kind === 'hexit') G.houses.exit();
    else if (o.kind === 'fnexit') G.pizza.exit();
    else if (o.kind === 'dungeon') G.dungeon.enter();
    else if (o.kind === 'dexit') G.dungeon.exit();
    else if (o.kind === 'sign' || o.kind === 'ins') {
      if (o.kind === 'ins' && !f.read[o.id]) { f.read[o.id] = true; G.prog.addXp(40); G.quests.event('read', o.id); }
      G.ui.dialog(o.title, o.text, [{ t: 'Fechar', fn: () => G.ui.closeDialog() }]); G.main.paused = true;
    }
    else if (o.kind === 'bell') { G.audio.sfx('quest'); G.fx.ring(o.x, o.y + 1.5, o.z, 0.8, 24, [1, 0.85, 0.4], true, 0.3); G.cam.kick(0.02); G.ui.toast('O sino ecoa pelo vale'); G.quests.event('bell'); }
    else if (o.kind === 'grill' || (o.kind === 'brazier' && o.lit)) G.animals.cook();
    else if (o.kind === 'brazier') { if (st.inv.ember > 0) { st.inv.ember--; G.extras.light(o); } }
    else if (o.kind === 'satchel') { f.found.sat = true; G.audio.sfx('pick'); G.ui.banner('Bolsa do mensageiro', 'Uma carta lacrada para Dom Teodoro, de Pedralta.'); G.quests.event('found', 'sat'); }
  }

  A.update = function () {
    A.best = gather();
    G.ui.setPrompt(A.best ? A.best.label : null);
    if (In.take('act') && A.best) A.best.run();
  };
})();
