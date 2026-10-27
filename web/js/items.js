'use strict';
/* Elemental World — itens, armas, combate físico (soco/armas), inventário e lojas. */
(function () {
  const G = window.G, M = G.M, B = G.bend, fx = G.fx;
  const $ = (id) => document.getElementById(id);
  const ESC = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const It = (G.items = {});
  const STEEL = [0.78, 0.8, 0.84], WOOD = [0.42, 0.28, 0.16], GOLD = [0.85, 0.68, 0.25], IRON = [0.45, 0.46, 0.5];

  /* ---- catálogo ---- */
  It.DEF = {
    // armas: dmg base, range (m), cd (s), arc (rad), kb, stun; parts [z0, z1, largura, altura, cor]
    adaga: { t: 'weapon', nome: 'Adaga', ico: '🗡️', price: 70, dmg: 7, range: 1.9, cd: 0.22, arc: 0.8, kb: 1.5, desc: 'Curta e rápida. Golpes velozes, pouco alcance.', model: 'blade', parts: [[0, 0.14, 0.035, 0.035, WOOD], [0.14, 0.17, 0.12, 0.03, GOLD], [0.17, 0.52, 0.05, 0.015, STEEL]] },
    espada_curta: { t: 'weapon', nome: 'Espada Curta', ico: '⚔️', price: 90, dmg: 12, range: 2.6, cd: 0.42, arc: 0.9, kb: 3, desc: 'Equilibrada: bom alcance e velocidade.', model: 'blade', parts: [[0, 0.18, 0.04, 0.04, WOOD], [0.18, 0.21, 0.18, 0.035, GOLD], [0.21, 0.95, 0.06, 0.018, STEEL]] },
    espada_longa: { t: 'weapon', nome: 'Espada Longa', ico: '🗡️', price: 220, dmg: 18, range: 3.1, cd: 0.62, arc: 1.0, kb: 5, desc: 'Lâmina longa e pesada. Dano alto, golpes mais lentos.', model: 'blade', parts: [[0, 0.24, 0.045, 0.045, WOOD], [0.24, 0.28, 0.24, 0.04, GOLD], [0.28, 1.3, 0.075, 0.02, STEEL]] },
    bastao: { t: 'weapon', nome: 'Bastão', ico: '🪄', price: 60, dmg: 10, range: 3.4, cd: 0.38, arc: 1.2, kb: 4, desc: 'Varrida ampla que acerta vários inimigos.', model: 'staff', parts: [[0, 1.7, 0.05, 0.05, WOOD], [0, 0.05, 0.07, 0.07, IRON], [1.65, 1.7, 0.07, 0.07, IRON]] },
    lanca: { t: 'weapon', nome: 'Lança', ico: '🔱', price: 150, dmg: 15, range: 4.2, cd: 0.6, arc: 0.4, kb: 5, thrust: true, desc: 'Estocada longa e estreita. Mantém o inimigo à distância.', model: 'spear', parts: [[0, 2.0, 0.04, 0.04, WOOD], [2.0, 2.3, 0.07, 0.02, STEEL]] },
    machado: { t: 'weapon', nome: 'Machado de Guerra', ico: '🪓', price: 300, dmg: 24, range: 2.7, cd: 0.85, arc: 0.9, kb: 8, stun: 0.5, desc: 'Muito pesado. Quase sempre atordoa o alvo.', model: 'club', parts: [[0, 1.15, 0.045, 0.045, WOOD], [0.88, 1.12, 0.05, 0.42, IRON], [0.9, 1.08, 0.07, 0.34, STEEL]] },
    // equipamentos
    manto: { t: 'armor', nome: 'Manto de Viajante', ico: '🧥', price: 50, def: 0.05, desc: 'Reduz 5% do dano recebido.' },
    tunica: { t: 'armor', nome: 'Túnica de Couro', ico: '🥋', price: 110, def: 0.1, desc: 'Reduz 10% do dano recebido.' },
    peitoral: { t: 'armor', nome: 'Peitoral de Ferro', ico: '🛡️', price: 280, def: 0.17, desc: 'Reduz 17% do dano recebido.' },
    // comida e bebida
    pao: { t: 'food', nome: 'Pão Fresco', ico: '🍞', price: 6, hp: 18, desc: 'Recupera 18 de vida.' },
    carne_crua: { t: 'food', raw: true, nome: 'Carne Crua', ico: '🥩', price: 8, sell: 4, desc: 'Asse numa churrasqueira ou use fogo. Crua, faz mal.' },
    carne: { t: 'food', nome: 'Carne Assada', ico: '🍖', price: 20, hp: 45, desc: 'Recupera 45 de vida.' },
    fruta: { t: 'food', nome: 'Frutas Doces', ico: '🍎', price: 8, hp: 8, chi: 18, desc: 'Recupera 8 de vida e 18 de chi.' },
    peixe: { t: 'food', nome: 'Peixe Defumado', ico: '🐟', price: 16, hp: 35, desc: 'Especialidade de Marfrio. Recupera 35 de vida.' },
    espeto: { t: 'food', nome: 'Espeto Picante', ico: '🍢', price: 16, hp: 25, chi: 20, desc: 'Especialidade de Brasaluz. +25 vida, +20 chi.' },
    raiz: { t: 'food', nome: 'Raiz Assada', ico: '🥔', price: 14, hp: 40, desc: 'Especialidade de Pedralta. Recupera 40 de vida.' },
    bolo: { t: 'food', nome: 'Bolo de Nuvem', ico: '🧁', price: 16, hp: 15, chi: 35, desc: 'Especialidade de Altavento. +15 vida, +35 chi.' },
    agua: { t: 'drink', nome: 'Água Fresca', ico: '🥤', price: 4, chi: 15, desc: 'Recupera 15 de chi.' },
    cha: { t: 'drink', nome: 'Chá de Ervas', ico: '🍵', price: 14, chi: 45, desc: 'Recupera 45 de chi.' },
    pocao: { t: 'potion', nome: 'Poção de Cura', ico: '🧪', price: 45, hp: 90, desc: 'Recupera 90 de vida.' },
    pocao_chi: { t: 'potion', nome: 'Poção de Chi', ico: '⚗️', price: 50, chi: 90, desc: 'Recupera 90 de chi.' },
    // recursos antigos (S.inv)
    herb: { t: 'food', nome: 'Erva Medicinal', ico: '🌿', price: 12, sell: 5, hp: 35, desc: 'Recupera 35 de vida.', legacy: true },
    ember: { t: 'mat', nome: 'Brasa', ico: '🔥', price: 14, sell: 6, desc: 'Material: acende braseiros.', legacy: true },
    shard: { t: 'mat', nome: 'Fragmento Antigo', ico: '💠', price: 100, sell: 40, desc: 'Material raro de ruínas e mestres.', legacy: true },
  };
  It.STOCK = {
    mercador: { hub: ['pao', 'fruta', 'agua', 'cha', 'herb', 'pocao'], agua: ['peixe', 'agua', 'cha', 'pao', 'herb', 'pocao_chi'], fogo: ['espeto', 'carne', 'agua', 'pocao', 'ember', 'herb'], terra: ['raiz', 'pao', 'carne', 'cha', 'herb', 'pocao'], ar: ['bolo', 'fruta', 'cha', 'pao', 'herb', 'pocao_chi'] },
    ferreiro: { hub: ['espada_curta', 'bastao', 'adaga', 'manto', 'tunica'], agua: ['adaga', 'lanca', 'espada_curta', 'manto', 'tunica'], fogo: ['espada_curta', 'espada_longa', 'machado', 'tunica', 'peitoral'], terra: ['bastao', 'machado', 'espada_longa', 'tunica', 'peitoral'], ar: ['bastao', 'lanca', 'adaga', 'manto', 'tunica'] },
  };
  const OPEN = { mercador: [7, 20], ferreiro: [8, 19] };
  It.isOpen = (role) => { const h = G.env.hour, o = OPEN[role]; return h >= o[0] && h < o[1]; };

  /* ---- inventário ---- */
  It.inv = function () { const S = G.S; if (!S.inv.items) S.inv.items = {}; if (!S.equip) S.equip = { weapon: null, armor: null }; return S.inv.items; };
  It.count = (id) => { const d = It.DEF[id]; if (d && d.legacy) return G.S.inv[id] || 0; return It.inv()[id] || 0; };
  It.add = function (id, n) { const d = It.DEF[id]; if (d.legacy) G.S.inv[id] = (G.S.inv[id] || 0) + n; else { const a = It.inv(); a[id] = (a[id] || 0) + n; if (a[id] <= 0) delete a[id]; } };
  It.equipped = (id) => { It.inv(); const e = G.S.equip; return e.weapon === id || e.armor === id; };
  It.weapon = () => { It.inv(); const id = G.S.equip.weapon; return id && It.count(id) > 0 ? It.DEF[id] : null; };
  It.def = () => { It.inv(); const id = G.S.equip.armor; return id && It.count(id) > 0 ? It.DEF[id].def : 0; };
  It.equip = function (id) {
    const d = It.DEF[id]; It.inv(); const e = G.S.equip, k = d.t === 'weapon' ? 'weapon' : 'armor';
    e[k] = e[k] === id ? null : id; G.audio.sfx('pick'); G.ui.toast(e[k] ? 'Equipado: ' + d.nome : 'Guardado: ' + d.nome, 'ok');
  };
  It.use = function (id) {
    const d = It.DEF[id], P = G.player, st = G.prog.stats(); if (!d || It.count(id) < 1) return false;
    if (d.raw) { // carne crua: com fogo (própria chama) vira carne assada; sem fogo, passa mal
      if (G.S.unlocked && G.S.unlocked.includes('fogo')) {
        It.add(id, -1); It.add('carne', 1); G.audio.sfx('sizzle'); G.ui.toast('Você assou a carne com a sua chama!', 'ok'); return It.use('carne');
      }
      It.add(id, -1); P.hurt(8, { fall: true }); G.ui.toast('Carne crua! Você passou mal. Asse na churrasqueira.', 'err'); return true;
    }
    if ((d.hp && P.hp >= st.hpMax) && (!d.chi || P.chi >= st.chiMax)) { G.ui.toast('Você já está bem.'); return false; }
    if (!d.hp && d.chi && P.chi >= st.chiMax) { G.ui.toast('Chi já está cheio.'); return false; }
    It.add(id, -1); if (d.hp) P.heal(d.hp); if (d.chi) P.chi = Math.min(st.chiMax, P.chi + d.chi);
    G.audio.sfx('pick'); G.ui.toast(d.nome + ': ' + (d.hp ? '+' + d.hp + ' vida ' : '') + (d.chi ? '+' + d.chi + ' chi' : ''), 'ok'); return true;
  };
  const hurt0 = G.player.hurt;
  G.player.hurt = function (d, o) { if (d > 0 && !(o && (o.fall || o.lava))) d *= 1 - It.def(); return hurt0.call(this, d, o); };

  /* ---- combate físico ---- */
  const Pn = (G.punch = { cd: 0, combo: 0, comboT: 0, anim: 0, dur: 0.3, side: 1, big: false, pend: null });
  const FIST = { nome: 'Punhos', dmg: 7, range: 2.1, cd: 0.3, arc: 0.75, kb: 2.2 };
  Pn.ok = () => { const P = G.player; return P.alive && P.stun <= 0 && !G.rest.active && !G.train.cut && !G.main.paused && !G.drag.held && !P.guard; };
  Pn.attack = function () {
    if (!Pn.ok() || Pn.cd > 0) return false;
    const w = It.weapon() || FIST, P = G.player;
    const chain = Pn.comboT > 0 && Pn.n != null; Pn.n = chain ? (Pn.n + 1) % 3 : 0; Pn.combo = Pn.n; Pn.comboT = w.cd + 0.55;
    Pn.big = Pn.combo === 2; Pn.side = Pn.combo === 1 ? -1 : 1;
    Pn.dur = w.cd * (Pn.big ? 1.25 : 1.05); Pn.cd = Pn.dur * 0.9 + (Pn.big ? 0.08 : 0); Pn.anim = Pn.dur; Pn.w = w;
    P.yaw = G.cam.yaw; Pn.pend = { t: Pn.dur * 0.38, w, big: Pn.big };
    G.audio.sfx('swing'); G.audio.vibrate(6);
    return true;
  };
  Pn.resolve = function (p) {
    const P = G.player, w = p.w, st = G.prog.stats(), dx = Math.sin(G.cam.yaw), dz = Math.cos(G.cam.yaw);
    const d = w.dmg * st.pdmg * (p.big ? (w.nome === 'Punhos' ? 1.6 : 1.3) : 1);
    const n = G.combat.cone(P.x, P.z, dx, dz, w.range * (p.big ? 1.1 : 1), w.arc, d, { el: 'neutro', kb: (w.kb || 2) * (p.big ? 1.8 : 1), up: p.big ? 1 : 0, stun: (w.stun || 0) + (p.big ? 0.4 : 0.18), phys: true });
    P.pose(0.18, P.yaw);
    if (n > 0) {
      G.audio.sfx(p.big ? 'hit_big' : 'hit_phys'); G.audio.vibrate(p.big ? 26 : 14); G.cam.kick(p.big ? 0.05 : 0.02);
      fx.burst(P.x + dx * (w.range * 0.7), P.y + 1.2, P.z + dz * (w.range * 0.7), p.big ? 10 : 5, [1, 0.95, 0.8], 3, 0.25, 0.25, true, 1);
    }
  };
  Pn.update = function (dt) {
    if (Pn.cd > 0) Pn.cd -= dt; if (Pn.anim > 0) Pn.anim -= dt;
    if (Pn.comboT > 0) { Pn.comboT -= dt; if (Pn.comboT <= 0) Pn.n = null; }
    if (Pn.pend) { Pn.pend.t -= dt; if (Pn.pend.t <= 0) { const p = Pn.pend; Pn.pend = null; if (G.player.alive) Pn.resolve(p); } }
  };
  /* pose das mãos/arma na primeira pessoa; p = progresso 0..1 do golpe */
  Pn.prog = () => (Pn.anim > 0 ? 1 - Pn.anim / Pn.dur : -1);
  Pn.handOff = function (s) { // s: +1 direita, -1 esquerda → [frente, lado, altura]
    const p = Pn.prog(); if (p < 0) return [0, 0, 0];
    const k = Math.sin(Math.min(1, p) * Math.PI);
    if (It.weapon()) return s === 1 ? [0.05 * k, 0, 0] : [0, 0, 0];
    const mine = (Pn.side === 1 && s === 1) || (Pn.side === -1 && s === -1);
    return mine ? [0.55 * k * (Pn.big ? 1.3 : 1), -0.12 * s * k, 0.04 * k] : [0, 0, 0];
  };
  const _c = [0, 0, 0];
  Pn.drawWeapon = function (hand, f, r, ry) {
    const w = It.weapon(); if (!w) return;
    const C = G.cam, p = Pn.prog(), e0 = 1.0 + (w.thrust ? -0.9 : 0);
    let el = e0, yo = 0.0, adv = 0, side = 0;
    if (p >= 0) {
      const q = M.clamp(p, 0, 1), ease = q * q * (3 - 2 * q);
      if (w.thrust) { adv = Math.sin(q * Math.PI) * 0.9; el = e0 + 0.1 * Math.sin(q * Math.PI); }
      else if (Pn.combo === 1) { el = M.lerp(1.1, 0.1, ease); yo = M.lerp(-0.7, 0.7, ease); side = 0.2; }
      else if (Pn.combo === 2) { el = M.lerp(1.7, -0.5, ease); yo = 0; }
      else { el = M.lerp(1.1, 0.1, ease); yo = M.lerp(0.7, -0.7, ease); side = 0.2; }
    }
    const yaw = ry + yo, cf = [Math.sin(yaw), Math.cos(yaw)], ce = Math.cos(el + C.fpPitch), se = Math.sin(el + C.fpPitch);
    const bx = hand[0] + f[0] * adv + r[0] * side, by = hand[1], bz = hand[2] + f[2] * adv + r[2] * side;
    for (const pt of w.parts) {
      const zc = (pt[0] + pt[1]) / 2, len = pt[1] - pt[0];
      B.drawPrim('box', bx + cf[0] * ce * zc, by + se * zc, bz + cf[1] * ce * zc, pt[2], pt[3], len, yaw, -(el + C.fpPitch), 0, pt[4], null, 0);
    }
  };

  /* ---- interface: inventário ---- */
  It.openInv = function () { if (G.train.cut || G.rest.active || !G.main.running) return; G.main.paused = true; It.renderInv(); G.ui.menu('inv'); };
  It.renderInv = function () {
    const S = G.S; It.inv(); const box = $('inv-l'); let h = '';
    const ids = Object.keys(It.DEF).filter((id) => It.count(id) > 0);
    const eq = S.equip;
    $('inv-c').textContent = 'Moedas: ' + S.inv.coins;
    $('inv-e').innerHTML = '<span>Arma: <b>' + (It.weapon() ? It.weapon().ico + ' ' + ESC(It.weapon().nome) : 'Punhos') + '</b></span><span>Equip.: <b>' + (It.def() ? It.DEF[eq.armor].ico + ' ' + ESC(It.DEF[eq.armor].nome) : 'nenhum') + '</b></span>';
    for (const t of [['weapon', 'Armas'], ['armor', 'Equipamento'], ['food', 'Comida e bebida'], ['mat', 'Materiais']]) {
      const g = ids.filter((id) => { const k = It.DEF[id].t; return t[0] === 'food' ? ['food', 'drink', 'potion'].includes(k) : k === t[0]; });
      if (!g.length) continue; h += '<h4>' + t[1] + '</h4>';
      for (const id of g) {
        const d = It.DEF[id], isE = eq.weapon === id || eq.armor === id;
        h += '<div class="it"><i>' + d.ico + '</i><div><b>' + ESC(d.nome) + ' ×' + It.count(id) + (isE ? ' · equipado' : '') + '</b><small>' + ESC(d.desc) + (d.dmg ? ' Dano ' + d.dmg + ' · alcance ' + d.range + ' m' : '') + '</small></div>' +
          (d.t === 'weapon' || d.t === 'armor' ? '<button data-eq="' + id + '">' + (isE ? 'Guardar' : 'Equipar') + '</button>' : (d.hp || d.chi) ? '<button data-us="' + id + '">Usar</button>' : '') + '</div>';
      }
    }
    box.innerHTML = h || '<p class="note">Sua mochila está vazia. Visite mercadores e ferreiros nas cidades.</p>';
    box.querySelectorAll('[data-eq]').forEach((b) => b.onclick = () => { It.equip(b.dataset.eq); It.renderInv(); });
    box.querySelectorAll('[data-us]').forEach((b) => b.onclick = () => { It.use(b.dataset.us); It.renderInv(); });
  };

  /* ---- interface: loja ---- */
  It.openShop = function (npc, kind) {
    const d = npc.def; const S = G.S;
    if (!It.isOpen(kind)) { G.ui.toast('A loja está fechada. Abre às ' + OPEN[kind][0] + 'h e fecha às ' + OPEN[kind][1] + 'h.', 'err'); return; }
    It.shop = { npc, kind, mode: 'buy' }; It.renderShop(); G.ui.menu('shop');
  };
  It.renderShop = function () {
    const sh = It.shop, S = G.S, box = $('sh-l'); let h = '';
    $('sh-n').textContent = sh.npc.def.nome + ' — ' + (sh.kind === 'ferreiro' ? 'Ferreiro' : 'Mercador');
    $('sh-c').textContent = 'Moedas: ' + S.inv.coins;
    $('sh-b').className = sh.mode === 'buy' ? 'primary' : ''; $('sh-s').className = sh.mode === 'sell' ? 'primary' : '';
    if (sh.mode === 'buy') {
      for (const id of It.STOCK[sh.kind][sh.npc.def.reg] || []) {
        const d = It.DEF[id];
        h += '<div class="it"><i>' + d.ico + '</i><div><b>' + ESC(d.nome) + '</b><small>' + ESC(d.desc) + (d.dmg ? ' Dano ' + d.dmg + ' · alcance ' + d.range + ' m' : '') + '</small></div><button data-by="' + id + '"' + (S.inv.coins < d.price ? ' disabled' : '') + '>' + d.price + ' 🪙</button></div>';
      }
    } else {
      const ids = Object.keys(It.DEF).filter((id) => It.count(id) > 0);
      for (const id of ids) { const d = It.DEF[id], pr = d.sell || Math.max(1, Math.floor(d.price * 0.4)); h += '<div class="it"><i>' + d.ico + '</i><div><b>' + ESC(d.nome) + ' ×' + It.count(id) + '</b><small>' + ESC(d.desc) + '</small></div><button data-sl="' + id + '">Vender ' + pr + ' 🪙</button></div>'; }
      if (!ids.length) h = '<p class="note">Você não tem nada para vender.</p>';
    }
    box.innerHTML = h;
    box.querySelectorAll('[data-by]').forEach((b) => b.onclick = () => {
      const d = It.DEF[b.dataset.by]; if (S.inv.coins < d.price) { G.ui.toast('Moedas insuficientes', 'err'); return; }
      S.inv.coins -= d.price; It.add(b.dataset.by, 1); G.audio.sfx('pick'); G.ui.toast('Comprado: ' + d.nome, 'ok'); It.renderShop();
    });
    box.querySelectorAll('[data-sl]').forEach((b) => b.onclick = () => {
      const id = b.dataset.sl, d = It.DEF[id], pr = d.sell || Math.max(1, Math.floor(d.price * 0.4));
      if (It.count(id) < 1) return; It.add(id, -1); const e = S.equip; if (It.count(id) < 1) { if (e.weapon === id) e.weapon = null; if (e.armor === id) e.armor = null; }
      S.inv.coins += pr; G.audio.sfx('pick'); G.ui.toast('Vendido: ' + d.nome + ' (+' + pr + ')', 'ok'); It.renderShop();
    });
  };
  $('sh-b').onclick = () => { It.shop.mode = 'buy'; It.renderShop(); };
  $('sh-s').onclick = () => { It.shop.mode = 'sell'; It.renderShop(); };
  $('sh-x').onclick = () => { G.ui.closeDialog(); };
  $('inv-x').onclick = () => { G.ui.closeDialog(); };

  /* ---- diálogo dos comerciantes ---- */
  const dlg = G.quests.dialogue;
  G.quests.dialogue = function (npc) {
    const r = dlg.apply(this, arguments), role = npc.def.role;
    if (role === 'mercador' || role === 'ferreiro') {
      r.buttons = r.buttons.filter((b) => !/^Comprar/.test(b.t));
      const open = It.isOpen(role);
      if (!open) r.text = '“A loja está fechada. Volte entre ' + OPEN[role][0] + 'h e ' + OPEN[role][1] + 'h.”';
      r.buttons.unshift({ t: open ? (role === 'ferreiro' ? 'Ver armas e equipamentos' : 'Ver mercadorias') + ' / vender' : 'Loja fechada', fn: () => { if (open) It.openShop(npc, role); } });
      if (role === 'ferreiro') r.nome = r.nome.replace('Morador', 'Ferreiro');
    }
    return r;
  };

  /* ---- ligações ---- */
  const tap = (id, fn) => $(id).addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); fn(); });
  tap('b-punch', () => Pn.attack());
  tap('b-inv', () => It.openInv());
  const gf = G.gesture.finish;
  G.gesture.finish = function () { // sem técnica: o toque curto vira soco
    const el = G.player.el();
    if (!G.mastery.canAny(el) && !G.drag.held && this.maxD < 18 && !this.hold) { Pn.attack(); return; }
    return gf.apply(this, arguments);
  };
  const gu = G.gesture.update;
  G.gesture.update = ((fn) => function (dt) { const el = G.player.el(); if (!G.mastery.canAny(el)) { if (this.active) this.t += dt; return; } return fn.apply(this, arguments); })(gu);
  It.update = function (dt) { Pn.update(dt); };
})();
