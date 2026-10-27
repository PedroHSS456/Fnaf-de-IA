'use strict';
/* Elemental World — mestres: conversa, cena cinematográfica, exercício no mundo e aprendizado de técnicas. */
(function () {
  const G = window.G, M = G.M, W = G.world, B = G.bend, fx = G.fx, Ms = G.mastery;
  const T = (G.train = { cut: null, ex: null });
  const $ = (id) => document.getElementById(id);
  const NAME = Ms.NAME;
  /* bonecos de treino: não atacam, não dão XP */
  G.enemies.TYPES.boneco = { nome: 'Boneco de Treino', hp: 30, dmg: 0, spd: 0, r: 0.6, h: 1.8, kind: 'melee', atkR: 0.01, cd: 999, wind: 1, xp: 0, aggro: 0, dummy: true, model: 'human', look: { c1: '#a07a42', c2: '#c8a870', skin: '#c8a870', hair: '#6a4a2a', hs: 0 } };

  const MASTER = {
    fogo: { tom: 'Intensa e orgulhosa', hi: ['“Fogo não é raiva, criança. É vontade. Mostre-me que você a tem.”', '“Se veio aprender com medo de se queimar, volte para casa. Se veio com fome de arder, entre.”'],
      cut: ['“Veja bem. O fogo não nasce da mão… nasce daqui.” — ela fecha o punho sobre o peito.', '“Respire fundo e solte devagar. Uma faísca. Só uma.”', '“Agora é a sua vez. Acenda a sua chama nos bonecos de treino!”'], done: '“Isso! Aí está a sua chama. Cuide dela, ou ela cuida de você.”' },
    agua: { tom: 'Calmo e filosófico', hi: ['“A água não luta contra a pedra. Ela espera. Sente-se comigo, jovem.”', '“Todo rio já foi gota. Tenha paciência com você mesmo.”'],
      cut: ['“Observe o fluxo. Ele não tem pressa e, ainda assim, chega ao mar.”', '“Acompanhe com as mãos. Empurre quando ela vier, puxe quando ela for.”', '“Agora deixe a água passar por você e atingir os bonecos.”'], done: '“Muito bem. Você aprendeu a ouvir a corrente.”' },
    terra: { tom: 'Teimosa e direta', hi: ['“Hm. Mais um que quer mover pedra. Pés firmes ou nem comece.”', '“Rocha não tem pressa nem desculpa. Você tem?”'],
      cut: ['“Pé no chão. Joelho firme.” — ela bate o pé e a rocha sobe.', '“Empurre com o corpo todo, não só com o braço. Assim.”', '“Sua vez. Acerte os bonecos. Sem frescura.”'], done: '“Não foi bonito, mas foi firme. Serve.”' },
    ar: { tom: 'Leve e brincalhão', hi: ['“Oh! Um visitante! Cuidado com o chapéu, o vento está de bom humor hoje.”', '“Quem segura demais perde tudo. Solte, solte!”'],
      cut: ['“Veja só! O vento é como um gato: só vem quando você para de chamá-lo.”', '“Gire o pulso, leve… como se afastasse uma folha da água.”', '“Agora você! Faça o vento dançar com os bonecos!”'], done: '“Ha! Viu? Ele gostou de você.”' },
  };
  const ADV = ['Mostrarei a você como ir além do básico.', 'Esta técnica pede mais domínio. Observe com atenção.', 'Poucos chegam até aqui. Preste atenção ao movimento.'];

  /* ------- conversa ------- */
  const dlg = G.quests.dialogue;
  G.quests.dialogue = function (npc) {
    const d = npc.def; if (d.role !== 'mestre') return dlg.apply(this, arguments);
    const el = d.reg, S = G.S, md = MASTER[el], btn = [];
    const title = d.nome + ' — Mestre de ' + NAME[el];
    let text;
    if (T.ex) { return { nome: title, text: '“Termine o seu treino primeiro!”', buttons: [{ t: 'Continuar', fn: () => G.ui.closeDialog() }] }; }
    if (!Ms.canStudy(el)) {
      text = '“Você é filho de outra nação. Somente o Avatar domina todos os elementos; os demais seguem o seu próprio caminho. Mas os ventos da estrada são livres: boa viagem.”';
    } else {
      const n = Ms.next(el); const hello = M.pick(md.hi);
      if (!n) text = hello + '\n\nVocê já aprendeu todas as técnicas que posso ensinar. Continue praticando e vença o Mestre do elemento.';
      else if (Ms.learnable(el, n.i)) {
        const q = G.elements[el].quick[n.i];
        text = hello + '\n\n' + (n.i === 0 ? 'Você ainda não conhece nenhuma técnica de ' + NAME[el] + '. Posso lhe ensinar a primeira.' : 'Sua maestria já permite aprender “' + q.nome + '”.');
        btn.push({ t: (n.i === 0 ? 'Pedir treinamento: ' : 'Aprender: ') + q.nome, fn: () => { G.ui.closeDialog(); T.lesson(npc, el, n.i); } });
      } else {
        const q = G.elements[el].quick[n.i], key = el + n.i, used = (S.sess && S.sess[key]) || 0;
        text = hello + '\n\nPara aprender “' + q.nome + '” você precisa de maestria ' + n.need + ' em ' + NAME[el] + ' (você tem ' + Math.floor(Ms.get(el)) + '). Pratique, treine e vença desafios.';
        if (used < 2) btn.push({ t: 'Treino de prática (+maestria)', fn: () => { G.ui.closeDialog(); T.practice(npc, el, n.i); } });
        else text += '\n\n“Por hoje chega de treino comigo. Pratique por conta própria.”';
      }
    }
    btn.push({ t: 'Despedir-se', fn: () => G.ui.closeDialog() });
    return { nome: title, text, buttons: btn };
  };

  /* ------- cena ------- */
  T.lesson = function (npc, el, i) {
    const md = MASTER[el], q = G.elements[el].quick[i];
    const lines = i === 0 ? md.cut : [md.cut[0].split(' — ')[0], '“' + ADV[(i - 1) % 3] + ' ' + q.nome + '.”', md.cut[2]];
    T.startCut(npc, el, i, lines, () => T.startEx(npc, el, i, true));
  };
  T.practice = function (npc, el, i) {
    T.startCut(npc, el, i, ['“Vamos ver o quanto você evoluiu. Mostre-me o que sabe.”'], () => T.startEx(npc, el, i, false), 2.5);
  };
  T.startCut = function (npc, el, i, lines, done, dur) {
    const P = G.player;
    npc.talking = true;
    T.cut = { npc, el, i, lines, done, t0: performance.now(), t: 0, dur: dur || (lines.length * 3.6 + 1.2), ex: 0, row: 0, ang: 0 };
    P.vx = P.vz = 0; G.main.paused = false; G.ui.menu(null);
    const c = $('cine'); c.hidden = false; c.classList.add('on'); document.body.classList.add('cine');
    T.setLine();
  };
  T.setLine = function () {
    const c = T.cut; if (!c) return; const k = Math.min(c.lines.length - 1, Math.floor(c.t / (c.dur / c.lines.length)));
    if (k !== c.row || !$('cine-t').textContent) { c.row = k; $('cine-t').textContent = c.lines[k]; }
  };
  T.endCut = function (skip) {
    const c = T.cut; if (!c) return; T.cut = null;
    $('cine').hidden = true; $('cine').classList.remove('on'); document.body.classList.remove('cine');
    c.npc.talking = false; G.cam.fovT = 62;
    c.done();
  };
  /* efeitos do mestre durante a cena */
  function palm(n) { const y = n.y + 1.25, f = [Math.sin(n.yaw), Math.cos(n.yaw)]; return [n.x + f[0] * 0.55, y, n.z + f[1] * 0.55]; }
  T.updateCut = function (dt) {
    const c = T.cut, n = c.npc, P = G.player; c.t += dt; T.setLine();
    n.yaw = M.lerpAng(n.yaw, Math.atan2(P.x - n.x, P.z - n.z), Math.min(1, 6 * dt));
    const el = c.el, ph = M.clamp(c.t / c.dur, 0, 1), p = palm(n), f = [Math.sin(n.yaw), Math.cos(n.yaw)], r = [f[1], -f[0]];
    const fxOn = c.t > 0.8 && ph < 0.78; const big = c.i > 0 ? 1.6 : 1;
    if (fxOn) {
      if (el === 'fogo') { const s = (0.35 + 0.35 * Math.sin(ph * 3.1)) * big; fx.flame(p[0], p[1] + 0.1, p[2], s); if (Math.random() < 0.4) fx.burst(p[0], p[1] + 0.2, p[2], 1, [1, 0.6, 0.2], 1, 0.25, 0.5, true, -0.5); if (c.i > 0 && Math.random() < 0.3) fx.flame(p[0] + f[0] * 0.8, p[1], p[2] + f[1] * 0.8, 0.7); }
      else if (el === 'agua') { for (let k = 0; k < 3; k++) { const a = c.t * 2.4 + k * 2.09, rr = 0.9 + 0.25 * Math.sin(c.t); fx.p(false, n.x + f[0] * 1.0 + Math.cos(a) * r[0] * rr, p[1] - 0.1 + Math.sin(a * 1.3) * 0.35, n.z + f[1] * 1.0 + Math.cos(a) * r[1] * rr, 0, 0.1, 0, 0.8, 0.22, 0.06, 0.45, 0.75, 1, 0.85, 0, 0.5); } fx.p(false, p[0], p[1], p[2], f[0] * 1.5, 0.2, f[1] * 1.5, 0.7, 0.2, 0.05, 0.5, 0.8, 1, 0.8, 0, 0.5); }
      else if (el === 'ar') { for (let k = 0; k < 3; k++) { const a = c.t * 5 + k * 2.1, rr = 0.5 + ph * 1.2; fx.p(true, p[0] + f[0] * 0.9 + Math.cos(a) * r[0] * rr, p[1] + (a % 3) * 0.15, p[2] + f[1] * 0.9 + Math.cos(a) * r[1] * rr, -Math.sin(a) * r[0] * 2, 0.4, -Math.sin(a) * r[1] * 2, 0.7, 0.15, 0.05, 0.9, 0.95, 1, 0.7, 0, 0.8); } if (Math.random() < 0.15) fx.dust(n.x + f[0], n.y + 0.1, n.z + f[1], 2, [0.8, 0.9, 0.8]); }
      else if (el === 'terra') { if (Math.random() < 0.25) fx.dust(n.x + f[0] * 1.3, n.y + 0.1, n.z + f[1] * 1.3, 3, [0.6, 0.5, 0.35]); }
    }
    if (el === 'terra' && c.t > 0.6) c.rock = { x: n.x + f[0] * (1.3 + Math.max(0, (ph - 0.45)) * 3 * big), z: n.z + f[1] * (1.3 + Math.max(0, (ph - 0.45)) * 3 * big), y: n.y + Math.min(1.0, (c.t - 0.6) * 0.8) * 1.1 - 0.3 + Math.sin(c.t * 2) * 0.05 };
    // câmera: três planos
    const C = G.cam, a = ph < 0.35 ? 0 : ph < 0.75 ? 1 : 2;
    let ex, ey, ez, tx, ty, tz;
    if (a === 0) { ex = n.x + f[0] * 4.2 + r[0] * 1.6; ez = n.z + f[1] * 4.2 + r[1] * 1.6; ey = n.y + 1.7; tx = n.x; tz = n.z; ty = n.y + 1.5; }
    else if (a === 1) { const k = (ph - 0.35) / 0.4; ex = n.x + f[0] * (3 - k * 0.6) - r[0] * 1.3; ez = n.z + f[1] * (3 - k * 0.6) - r[1] * 1.3; ey = n.y + 1.35; tx = n.x + f[0] * 1.2; tz = n.z + f[1] * 1.2; ty = n.y + 1.2; }
    else { ex = n.x + f[0] * 3.6; ez = n.z + f[1] * 3.6 + 0; ey = n.y + 1.65; tx = n.x; tz = n.z; ty = n.y + 1.5; }
    C.eye = [ex, ey, ez]; C.target = [tx, ty, tz]; C.fov = 52;
    if (c.t >= c.dur || (performance.now() - c.t0) / 1000 > c.dur * 1.5 + 2) T.endCut();
  };
  T.draw = function () {
    const c = T.cut; if (c && c.rock) B.drawPrim('rock', c.rock.x, c.rock.y, c.rock.z, 0.8, 0.8, 0.8, c.t, 0, 0, [0.55, 0.45, 0.32], null, 0);
  };

  /* ------- exercício ------- */
  T.startEx = function (npc, el, i, learn) {
    const S = G.S, n = 3 + Math.min(3, i), P = G.player, list = [];
    const base = Math.atan2(P.x - npc.x, P.z - npc.z);
    for (let k = 0, tries = 0; list.length < n && tries < 40; tries++) {
      const a = base + (list.length - (n - 1) / 2) * 0.75 + (tries > n ? M.rnd(-1, 1) : 0), rr = 7 + (i > 1 ? list.length % 2 * 3 : 0) + (tries > n ? tries * 0.2 : 0);
      const x = npc.x + Math.sin(a) * rr, z = npc.z + Math.cos(a) * rr;
      if (W.waterDepth && W.waterDepth(x, z) > 0.3) continue;
      const e = G.enemies.spawnAt('boneco', x, z, 1); e.hpMax = e.hp = 26 + 6 * i; e.yaw = a + Math.PI; e.train = true; list.push(e);
    }
    Ms.train = { el, i }; P.chi = G.prog.stats().chiMax;
    if (G.mp && G.mp.sync) G.mp.sync.dummies(list.map((e) => [Math.round(e.x * 100) / 100, Math.round(e.z * 100) / 100, Math.round(e.yaw * 100) / 100]));
    T.ex = { npc, el, i, learn, list, left: list.length, t: 0, total: list.length, key: el + i };
    G.ui.banner('Treino: ' + G.elements[el].quick[i].nome, 'Acerte os bonecos de treino com a técnica');
  };
  T.onDummy = function (e) { const x = T.ex; if (!x || !e.train) return; x.left--; G.audio.sfx('pick'); if (x.left <= 0) T.finishEx(true); };
  T.clearDummies = function () { const x = T.ex; if (!x) return; for (const e of x.list) if (e.alive) { e.alive = false; } };
  T.finishEx = function (ok) {
    const x = T.ex; if (!x) return; T.ex = null; Ms.train = null; T.clearDummies();
    if (G.mp && G.mp.sync) G.mp.sync.dummies([]);
    const S = G.S;
    if (ok) {
      if (x.learn) { Ms.learn(x.el, x.i); G.ui.toast(MASTER[x.el].done.replace(/[“”]/g, ''), 'ok'); G.prog.addXp(40 + 20 * x.i); }
      else { S.sess = S.sess || {}; S.sess[x.key] = (S.sess[x.key] || 0) + 1; Ms.add(x.el, 10, true); G.ui.toast('Treino concluído: +10 de maestria em ' + NAME[x.el], 'ok'); G.audio.sfx('level'); }
    } else G.ui.toast('Treino interrompido. Fale com o mestre para tentar de novo.', 'err');
  };
  T.update = function (dt) {
    if (T.cut) { T.updateCut(dt); return; }
    const x = T.ex; if (!x) return; x.t += dt;
    const P = G.player;
    if (!P.alive || x.t > 120 || Math.hypot(P.x - x.npc.x, P.z - x.npc.z) > 45) T.finishEx(false);
  };
  T.status = function () { const x = T.ex; return x ? { nome: 'Treino de ' + NAME[x.el], txt: 'Acerte os bonecos (' + (x.total - x.left) + '/' + x.total + ') — chi livre durante o treino' } : null; };
  const tr = G.quests.tracked;
  G.quests.tracked = function () { return T.status() || tr.apply(this, arguments); };
  $('cine-skip').addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); if (T.cut) { T.cut.t = T.cut.dur; } });
  T.reset = function () { document.body.classList.remove('cine'); T.cut = null; T.ex = null; Ms.train = null; $('cine').hidden = true; };
})();
