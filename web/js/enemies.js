'use strict';
/* Elemental World — inimigos (IA com telegrafia), Mestres (chefes), projéteis inimigos e áreas de aviso */
(function () {
  const G = window.G; const M = G.M; const W = G.world; const fx = G.fx;
  const En = (G.enemies = { list: [], shots: [], tele: [], camps: [], bosses: [], t: 0, scanT: 0 });
  const H = M.hex;

  const T = {
    bandido: { nome: 'Bandido', hp: 44, dmg: 9, spd: 4.3, r: 0.5, h: 1.8, kind: 'melee', atkR: 1.9, cd: 1.5, wind: 0.55, xp: 12, model: 'human', look: { c1: '#7a5a3a', c2: '#3a2a20', c3: '#4a3a30', weapon: 'club', hs: 1, hair: '#2a1a10' } },
    porco: { nome: 'Porco', hp: 24, dmg: 0, spd: 2.6, r: 0.5, h: 0.9, kind: 'passive', animal: 1, snd: 'oink', xp: 4, model: 'pig', look: {}, aggro: 0 },
    vaca: { nome: 'Vaca', hp: 48, dmg: 0, spd: 2.2, r: 0.62, h: 1.2, kind: 'passive', animal: 1, snd: 'moo', xp: 6, model: 'cow', look: {}, aggro: 0 },
    lobo: { nome: 'Lobo', hp: 34, dmg: 8, spd: 6.2, r: 0.55, h: 1.0, kind: 'lunge', atkR: 2.4, cd: 1.8, wind: 0.45, xp: 11, model: 'wolf', look: { c1: '#7a7a82', c2: '#cfcfd4' } },
    lobogelo: { nome: 'Lobo-do-gelo', hp: 42, dmg: 9, spd: 6.2, r: 0.55, h: 1.0, kind: 'lunge', atkR: 2.4, cd: 1.7, wind: 0.45, xp: 15, model: 'wolf', look: { c1: '#c9e0f2', c2: '#ffffff', eye: '#7fe0ff' }, weak: 'fogo', resist: 'agua', slow: true },
    cacadorgelo: { nome: 'Caçador do Gelo', hp: 46, dmg: 9, spd: 4.0, r: 0.5, h: 1.8, kind: 'ranged', atkR: 15, keep: 9, cd: 2.0, wind: 0.6, xp: 17, model: 'human', look: { c1: '#4f86b8', c2: '#e8f4ff', c3: '#2a4a6a', weapon: 'bow', helmet: true, helmetCol: '#d8ecf8' }, shot: { el: 'agua', col: [0.7, 0.9, 1], sp: 17, slow: 2 }, weak: 'fogo', resist: 'agua' },
    soldado: { nome: 'Soldado das Brasas', hp: 58, dmg: 11, spd: 4.4, r: 0.5, h: 1.8, kind: 'melee', atkR: 2.0, cd: 1.4, wind: 0.55, xp: 18, model: 'human', look: { c1: '#9a2a1e', c2: '#2a2024', c3: '#3a2a2a', weapon: 'blade', helmet: true, helmetCol: '#3a2e30', horns: true }, weak: 'agua', resist: 'fogo', burn: true },
    arqueiro: { nome: 'Arqueiro Brasa', hp: 44, dmg: 10, spd: 4.0, r: 0.5, h: 1.8, kind: 'ranged', atkR: 16, keep: 10, cd: 1.9, wind: 0.6, xp: 18, model: 'human', look: { c1: '#b8481e', c2: '#2a2024', c3: '#3a2a2a', weapon: 'bow', hs: 2 }, shot: { el: 'fogo', col: [1, 0.5, 0.1], sp: 19, burn: 2 }, weak: 'agua', resist: 'fogo' },
    salamandra: { nome: 'Salamandra', hp: 38, dmg: 10, spd: 6.4, r: 0.5, h: 0.9, kind: 'lunge', atkR: 2.3, cd: 1.5, wind: 0.4, xp: 14, model: 'wolf', look: { c1: '#e0902a', c2: '#ffd23a', eye: '#ff2020' }, weak: 'agua', resist: 'fogo', burn: true },
    bandidopedra: { nome: 'Bandido da Meseta', hp: 52, dmg: 10, spd: 4.2, r: 0.5, h: 1.8, kind: 'melee', atkR: 1.9, cd: 1.5, wind: 0.55, xp: 14, model: 'human', look: { c1: '#a07a4c', c2: '#5a4a36', c3: '#6a5236', weapon: 'club', pack: true, hs: 3, hair: '#3a2a1a' }, weak: 'ar' },
    atirador: { nome: 'Atirador de Pedras', hp: 42, dmg: 11, spd: 4.0, r: 0.5, h: 1.8, kind: 'ranged', atkR: 15, keep: 9, cd: 2.1, wind: 0.65, xp: 16, model: 'human', look: { c1: '#8a6a44', c2: '#4a3a28', c3: '#5a4630', hs: 0, helmet: true, helmetCol: '#7a7a74' }, shot: { el: 'terra', col: [0.66, 0.5, 0.3], sp: 15, grav: 4, size: 0.3 }, weak: 'ar' },
    golem: { nome: 'Golem de Rocha', hp: 150, dmg: 20, spd: 2.6, r: 0.9, h: 2.9, kind: 'slam', atkR: 4, cd: 2.8, wind: 0.9, xp: 40, model: 'human', scale: 1.6, look: { big: true, c1: '#7a746c', c2: '#5a544c', c3: '#6a645c', skin: '#8a847a', hair: '#6a645c', hs: 3, helmet: true, helmetCol: '#6a645c', gauntlet: true }, weak: 'agua', resist: 'terra', heavy: true },
    espirito: { nome: 'Espírito do Vento', hp: 40, dmg: 9, spd: 4.6, r: 0.55, h: 1.9, kind: 'ranged', atkR: 15, keep: 9, cd: 1.7, wind: 0.5, xp: 17, model: 'spirit', fly: 0.8, look: { c1: '#e4f2ff' }, shot: { el: 'ar', col: [0.9, 0.97, 1], sp: 20, kb: 6, size: 0.28 }, weak: 'terra', resist: 'ar' },
    corvo: { nome: 'Corvo da Tormenta', hp: 32, dmg: 9, spd: 6.6, r: 0.5, h: 1.0, kind: 'lunge', atkR: 2.4, cd: 1.5, wind: 0.4, xp: 13, model: 'crow', fly: 1.5, look: { c1: '#34344a' }, weak: 'fogo' },
    saqueador: { nome: 'Saqueador dos Picos', hp: 50, dmg: 10, spd: 4.8, r: 0.5, h: 1.8, kind: 'melee', atkR: 1.9, cd: 1.3, wind: 0.5, xp: 15, model: 'human', look: { c1: '#d8c080', c2: '#6a5a40', c3: '#8a7a50', weapon: 'spear', hs: 2 }, weak: 'terra' },
  };
  En.TYPES = T;

  const MASTER = {
    fogo: { nome: 'Mestra Ignéa', title: 'Mestra do Fogo', col: [1, 0.45, 0.1], look: { el: 'fogo', robe: true, master: true, hs: 2, hair: '#1a1010', skin: '#d8a078', c1: '#b8321f', c2: '#2b2024', c3: '#3a2a2a', staffCol: '#ff7a2a', weapon: 'staff' } },
    agua: { nome: 'Mestre Maréu', title: 'Mestre da Água', col: [0.3, 0.65, 1], look: { el: 'agua', robe: true, master: true, hs: 1, hair: '#e8f0f8', skin: '#c89878', c1: '#2f78c8', c2: '#e8f4ff', c3: '#24508a', staffCol: '#8fd8ff', weapon: 'staff' } },
    terra: { nome: 'Mestra Graniz', title: 'Mestra da Terra', col: [0.66, 0.5, 0.3], look: { el: 'terra', robe: true, master: true, hs: 3, hair: '#3a2a1a', skin: '#b88860', c1: '#4f8a3a', c2: '#8a6a3a', c3: '#5a4630', staffCol: '#d8c070', weapon: 'staff' } },
    ar: { nome: 'Mestra Zéfira', title: 'Mestra do Ar', col: [0.85, 0.95, 1], look: { el: 'ar', robe: true, master: true, hs: 3, hair: '#f0f0f0', skin: '#e0b890', c1: '#f0b13a', c2: '#fff4d8', c3: '#e07a2a', staffCol: '#ffffff', weapon: 'staff' } },
  };
  En.MASTER = MASTER;

  /* ---------- criação ---------- */
  function mk(type, x, z, lvl, camp) {
    const d = T[type], y = W.groundY(x, z); if (d.animal) lvl = Math.min(lvl, 3);
    const sc = d.scale || 1;
    const e = {
      type, def: d, nome: d.nome, x, y, z, vx: 0, vz: 0, yaw: Math.random() * 6.28, lvl,
      hpMax: Math.round(d.hp * (1 + 0.2 * (lvl - 1))), hp: 0, alive: true, r: d.r, h: d.h, scale: sc, home: [x, z], camp, state: 'idle', stT: M.rnd(0.5, 3),
      atkCd: M.rnd(0.5, 1.5), windT: 0, stunT: 0, burnT: 0, slowT: 0, wetT: 0, kbx: 0, kbz: 0, flash: 0, ph: Math.random() * 6, t: Math.random() * 10, aggro: d.aggro || 15, hpT: 0, tgt: null, fly: d.fly || 0, boss: false,
      dmg: d.dmg * (1 + 0.1 * (lvl - 1)),
    };
    e.hp = e.hpMax; e.hurt = hurt; e.knock = knock; e.model = G.models.get(d.model, d.look);
    e.uid = 'e' + Math.random().toString(36).slice(2, 9); // identificador para o multiplayer
    return e;
  }
  En.spawnAt = function (type, x, z, lvl) { const e = mk(type, x, z, lvl, null); En.list.push(e); return e; };

  function hurt(d, o) {
    o = o || {};
    if (!this.alive) return 0;
    if (this.dormant) return 0;
    let m = 1; const el = o.el;
    if (el && this.def.weak === el) m = 1.35; else if (el && this.def.resist === el) m = 0.65;
    if (el === 'fogo' && this.wetT > 0) m *= 0.7;
    if (el === 'agua' && this.burnT > 0) m *= 1.1;
    if (this.shield > 0) m *= 0.3;
    d *= m; this.hp -= d; this.flash = 0.14; this.hpT = 5;
    if (o.burn) this.burnT = Math.max(this.burnT, o.burn);
    if (o.slow) this.slowT = Math.max(this.slowT, o.slow * (this.boss ? 0.5 : 1));
    if (o.wet) { this.wetT = Math.max(this.wetT, o.wet); if (this.burnT > 0 && el === 'agua') this.burnT = 0; }
    if (o.stun && !this.def.heavy) { this.stunT = Math.max(this.stunT, o.stun * (this.boss ? 0.25 : 1)); this.windT = 0; }
    if (G.mp && G.mp.state === 'on') { this.aggroPid = o.remote || 'me'; (this.hitters || (this.hitters = new Set())).add(o.remote || 'me'); }
    if (this.def.animal && !this.sqT) { this.sqT = 1.2; G.audio.sfxAt('squeal', this.x, this.z); setTimeout(() => { this.sqT = 0; }, 1200); }
    if (this.state === 'idle' || this.state === 'return') { this.state = 'chase'; }
    if (this.hp <= 0) die(this, o);
    return d;
  }
  function knock(dx, dz, s, up) {
    if (this.boss) s *= 0.25; if (this.def.heavy) s *= 0.4;
    const l = Math.hypot(dx, dz) || 1; this.kbx += dx / l * s; this.kbz += dz / l * s; if (up && !this.fly) this.kbu = Math.max(this.kbu || 0, up);
    if (up) this.air = Math.max(this.air || 0, up * 0.1);
  }
  function die(e, o) {
    e.alive = false; const S = G.S;
    if (e.def.dummy) { fx.burst(e.x, e.y + 1, e.z, 14, [0.8, 0.7, 0.5], 4, 0.4, 0.6, false, 3); G.audio.sfx('die'); G.train && G.train.onDummy(e); return; }
    fx.burst(e.x, e.y + e.h * 0.5, e.z, 26, e.boss ? e.col || [1, 1, 1] : [0.9, 0.9, 0.95], 5, 0.5, 0.8, true, 3); fx.smoke(e.x, e.y + 0.5, e.z, 8, 1);
    G.audio.sfx('die');
    const hs = G.mp && G.mp.state === 'on' && e.hitters ? [...e.hitters] : null;
    if (hs && hs.some((p) => p !== 'me')) { // todos que bateram recebem a recompensa (cada um aprende o seu elemento)
      for (const p of hs) if (p !== 'me') G.mp.reward(p, e);
      if (e.boss) { G.mp.bossDead[e.el] = true; (G.mp.bossT = G.mp.bossT || {})[e.el] = En.t + 150; }
      if (!hs.includes('me')) {
        if (e.camp) { e.camp.left--; if (e.camp.left <= 0 && !e.boss) e.camp.respawnAt = En.t + 240; }
        return;
      }
    }
    if (e.def.animal) { // caça: carne crua em vez de moedas
      const n = e.type === 'vaca' ? M.rint(2, 3) : M.rint(1, 2); G.items.add('carne_crua', n);
      G.ui.pick('+' + n + ' carne crua'); G.prog.addXp(e.def.xp); G.quests && G.quests.event('kill', e.type);
      if (e.camp) { e.camp.left--; if (e.camp.left <= 0) e.camp.respawnAt = En.t + 240; }
      return;
    }
    const st = G.prog.stats(); const pl = S.lvl;
    const xp = e.def.xp ? e.def.xp * (1 + 0.18 * (e.lvl - 1)) * M.clamp(1 - 0.1 * (pl - e.lvl), 0.3, 1) : 0;
    if (e.boss) {
      G.ui.banner('Mestre derrotado', e.nome); S.flags.masters[e.el] = true; S.pts += 2;
      G.prog.addXp(260 + e.lvl * 30); S.inv.coins += 80; S.inv.shard++;
      G.ui.pick('+80 moedas, +1 fragmento'); En.onMasterDefeated(e);
      if (e.camp) e.camp.bossDead = true;
    } else {
      G.prog.addXp(xp);
      const c = Math.max(1, Math.round(M.rnd(1, 4) * Math.sqrt(e.lvl))); S.inv.coins += c; G.ui.pick('+' + c + ' moedas');
      if (Math.random() < 0.14) { S.inv.herb++; G.ui.pick('+1 erva'); }
      if (Math.random() < 0.04) { S.inv.ember++; G.ui.pick('+1 brasa'); }
    }
    S.stats.kills++; if (e.camp) { e.camp.left--; if (e.camp.left <= 0 && !e.boss) e.camp.respawnAt = En.t + 240; }
    G.quests && G.quests.event('kill', e.type || 'boss');
    G.combat.streak += 0;
  }
  En.onMasterDefeated = function (e) {
    const S = G.S;
    G.quests && G.quests.event('master', e.el);
  };

  /* ---------- aviso no chão ---------- */
  En.telegraph = function (x, z, r, delay, dmg, el, o) {
    En.tele.push(Object.assign({ x, z, r, t: 0, delay, dmg, el, kb: 8, airSafe: false }, o || {}));
  };
  const tg = () => (G.mp && G.mp.proxies ? [G.player].concat(G.mp.proxies()) : [G.player]);
  function explodeTele(t) {
    const y = W.groundY(t.x, t.z);
    const col = (G.elements[t.el] && G.elements[t.el].col) || [1, 1, 1];
    fx.burst(t.x, y + 0.4, t.z, Math.min(50, 10 + t.r * 6), col, t.r * 2.4, 0.6, 0.7, true, 2); fx.ring(t.x, y + 0.3, t.z, 0.8, 24, col, true, 0.3); fx.smoke(t.x, y + 0.4, t.z, 4, 1);
    G.audio.sfx('boom_' + (t.el === 'ar' ? 'ar' : t.el)); G.cam.kick(Math.min(0.15, 0.03 + t.r * 0.01));
    for (const P of tg()) {
    const d = Math.hypot(P.x - t.x, P.z - t.z);
    if (P.alive && d < t.r + P.r && !(t.airSafe && P.y > y + 1.0)) {
      const l = d || 1; P.hurt(t.dmg, { el: t.el, kx: (P.x - t.x) / l, kz: (P.z - t.z) / l, kb: t.kb, burn: t.burn, slow: t.slow, stun: t.stun });
    }
    }
    if (t.el === 'fogo') G.inter.fire(t.x, t.z, t.r, 0.8);
    if (t.after) t.after(t);
  }

  /* ---------- projéteis inimigos ---------- */
  En.shoot = function (e, tx, ty, tz, def, dmg) {
    const x = e.x + Math.sin(e.yaw) * 0.6, y = e.y + e.h * 0.7, z = e.z + Math.cos(e.yaw) * 0.6;
    let dx = tx - x, dy = ty - y, dz = tz - z; const l = Math.hypot(dx, dy, dz) || 1; const sp = def.sp || 16;
    const s = { x, y, z, vx: dx / l * sp, vy: dy / l * sp, vz: dz / l * sp, r: def.size || 0.25, dmg, el: def.el, col: def.col, life: 3.5, grav: def.grav || 0, burn: def.burn, slow: def.slow, kb: def.kb || 3, size: def.size || 0.25, owner: e };
    if (def.grav) { s.vy += def.grav * (l / sp) * 0.5; }
    En.shots.push(s); return s;
  };
  En.deflect = function (x, z, r, destroy) {
    for (let i = En.shots.length - 1; i >= 0; i--) {
      const s = En.shots[i]; if (Math.hypot(s.x - x, s.z - z) < r) {
        fx.burst(s.x, s.y, s.z, 6, s.col, 3, 0.25, 0.3, true, 0);
        if (!destroy) { G.bend.proj({ x: s.x, y: s.y, z: s.z, vx: -s.vx, vy: s.vy, vz: -s.vz, r: 0.4, life: 2, dmg: s.dmg * 1.5, el: s.el, size: s.size, col: s.col }); }
        En.shots.splice(i, 1);
      }
    }
  };
  function updateShots(dt) {
    const P = G.player;
    for (let i = En.shots.length - 1; i >= 0; i--) {
      const s = En.shots[i]; s.life -= dt; s.vy -= s.grav * dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      fx.p(true, s.x, s.y, s.z, 0, 0, 0, 0.25, s.size * 2, 0.1, s.col[0], s.col[1], s.col[2], 0.8, 0, 0);
      let dead = s.life <= 0;
      // jogador
      if (!dead) for (const P of tg()) if (P.alive) { const dx = s.x - P.x, dz = s.z - P.z, dy = s.y - (P.y + 0.9); if (dx * dx + dz * dz < (s.r + 0.45) * (s.r + 0.45) && Math.abs(dy) < 1.1) { const l = Math.hypot(s.vx, s.vz) || 1; if (P.hurt(s.dmg, { el: s.el, kx: s.vx / l, kz: s.vz / l, kb: s.kb, burn: s.burn, slow: s.slow })) { } dead = true; } }
      // estruturas
      if (!dead) for (const st of G.bend.structs) { if (st.blocks && Math.hypot(st.x - s.x, st.z - s.z) < st.w * 0.7 + 0.2 && s.y < st.y + st.h) { st.hp -= s.dmg * 2; dead = true; fx.burst(s.x, s.y, s.z, 6, s.col, 3, 0.3, 0.4, true, 2); break; } }
      if (!dead && (s.y < W.groundY(s.x, s.z) + 0.1 || W.solidAt(s.x, s.z, 0.2))) dead = true;
      if (dead) { if (s.el === 'fogo') G.inter.fire(s.x, s.z, 1.2, 0.3); fx.burst(s.x, s.y, s.z, 5, s.col, 2.5, 0.25, 0.3, true, 2); En.shots.splice(i, 1); }
    }
  }
  function updateTele(dt) {
    for (let i = En.tele.length - 1; i >= 0; i--) {
      const t = En.tele[i]; t.t += dt;
      const k = t.t / t.delay, col = (G.elements[t.el] && G.elements[t.el].col) || [1, 0.3, 0.2], y = W.groundY(t.x, t.z) + 0.15;
      const n = Math.min(26, 8 + Math.round(t.r * 3));
      for (let j = 0; j < n; j++) { const a = (j / n) * 6.283 + t.t * 2; fx.imm(true, t.x + Math.cos(a) * t.r, y, t.z + Math.sin(a) * t.r, 0.55, 1, 0.25 + 0.4 * (1 - k), 0.15, 0.55 + 0.4 * k); }
      for (let j = 0; j < 3; j++) { const a = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * t.r * k; fx.imm(true, t.x + Math.cos(a) * rr, y, t.z + Math.sin(a) * rr, 0.5, col[0], col[1], col[2], 0.35); }
      if (t.t >= t.delay) { explodeTele(t); En.tele.splice(i, 1); }
    }
  }

  /* ---------- ataque do inimigo ---------- */
  function strike(e) {
    const P = G.player, d = e.def;
    const dist = Math.hypot(P.x - e.x, P.z - e.z);
    if (d.kind === 'melee' || d.kind === 'lunge') {
      if (d.kind === 'lunge') { const l = dist || 1; e.kbx += (P.x - e.x) / l * 10; e.kbz += (P.z - e.z) / l * 10; }
      e.hitPending = 0.12;
    } else if (d.kind === 'ranged') {
      En.shoot(e, P.x + P.vx * 0.25, P.y + 1.0, P.z + P.vz * 0.25, d.shot, e.dmg); G.audio.sfx('shoot');
    } else if (d.kind === 'slam') {
      const ax = e.x + Math.sin(e.yaw) * 2.2, az = e.z + Math.cos(e.yaw) * 2.2;
      En.telegraph(ax, az, 3.6, 0.5, e.dmg, 'terra', { kb: 8, airSafe: true, stun: 0.6 });
    }
  }
  function enemyHit(e) { // concluir golpe corpo a corpo
    const P = G.player, dx = P.x - e.x, dz = P.z - e.z, dist = Math.hypot(dx, dz);
    if (dist < e.def.atkR + P.r + 0.2) { const l = dist || 1; P.hurt(e.dmg, { el: e.def.burn ? 'fogo' : 'neutro', kx: dx / l, kz: dz / l, kb: e.def.kind === 'lunge' ? 4 : 6, burn: e.def.burn ? 2 : 0, slow: e.def.slow ? 1.5 : 0, noLift: true }); G.fx.burst(P.x, P.y + 1, P.z, 5, [1, 0.8, 0.6], 3, 0.25, 0.3, true, 2); G.audio.sfx('hit_enemy'); }
  }

  /* ---------- atualização ---------- */
  function inTown(x, z) { for (const t of W.towns) if (Math.hypot(x - t.x, z - t.z) < t.R + 5) return true; return false; }
  function updateEnemy(e, dt) {
    const P = G.player, d = e.def;
    e.t += dt; if (e.flash > 0) e.flash -= dt; if (e.hpT > 0) e.hpT -= dt;
    if (e.hitPending > 0) { e.hitPending -= dt; if (e.hitPending <= 0) enemyHit(e); }
    if (e.burnT > 0) { e.burnT -= dt; e.hp -= (2 + e.lvl * 0.7) * dt; if (Math.random() < dt * 8) fx.flame(e.x, e.y + e.h * 0.5, e.z, 0.6); if (e.hp <= 0) { die(e, { el: 'fogo' }); return; } }
    if (e.wetT > 0) e.wetT -= dt;
    if (e.slowT > 0) e.slowT -= dt;
    if (e.stunT > 0) e.stunT -= dt;
    if (e.atkCd > 0) e.atkCd -= dt;
    if (e.shield > 0) e.shield -= dt;
    // knockback
    const kd = Math.max(0, 1 - 7 * dt);
    let mvx = e.kbx, mvz = e.kbz; e.kbx *= kd; e.kbz *= kd;
    if (e.kbu) { e.vy = (e.vy || 0) + e.kbu; e.kbu = 0; }
    const dist = Math.hypot(P.x - e.x, P.z - e.z);
    if (d.animal) { e.sndT = (e.sndT == null ? M.rnd(2, 10) : e.sndT) - dt; if (e.sndT <= 0) { e.sndT = M.rnd(7, 18); G.audio.sfxAt(d.snd === 'moo' && Math.random() < 0.4 ? 'moo2' : d.snd, e.x, e.z); } }
    let wantx = 0, wantz = 0, face = null;
    const stunned = e.stunT > 0;
    if (!stunned) {
      const safe = !P.alive || inTown(P.x, P.z) && !e.boss;
      switch (e.state) {
        case 'idle':
          e.stT -= dt;
          if (e.stT <= 0) { e.stT = M.rnd(2, 5); e.wp = [e.home[0] + M.rnd(-6, 6), e.home[1] + M.rnd(-6, 6)]; }
          if (e.wp) { const dx = e.wp[0] - e.x, dz = e.wp[1] - e.z, l = Math.hypot(dx, dz); if (l > 0.8) { wantx = dx / l * d.spd * 0.35; wantz = dz / l * d.spd * 0.35; face = Math.atan2(dx, dz); } else e.wp = null; }
          if (!d.animal && !safe && dist < e.aggro * (G.env.night > 0.6 ? 0.85 : 1) && P.alive) { e.state = 'chase'; fx.imm(true, e.x, e.y + e.h + 0.6, e.z, 1.2, 1, 0.9, 0.3, 0.9); }
          break;
        case 'chase': {
          if (d.animal) { // animais fogem de quem os atacou
            e.fleeT = (e.fleeT || 0) + dt; const fx0 = e.x - P.x, fz0 = e.z - P.z, l0 = dist || 1;
            wantx = fx0 / l0 * d.spd * 2; wantz = fz0 / l0 * d.spd * 2; face = Math.atan2(fx0, fz0);
            if (e.fleeT > 5 || dist > 40) { e.state = 'return'; e.fleeT = 0; }
            break;
          }
          if (safe || dist > 48 || Math.hypot(e.x - e.home[0], e.z - e.home[1]) > 55) { e.state = 'return'; break; }
          const dx = P.x - e.x, dz = P.z - e.z, l = dist || 1; face = Math.atan2(dx, dz);
          let spd = d.spd * (e.slowT > 0 ? 0.5 : 1);
          if (d.kind === 'ranged') {
            if (dist > d.keep + 2) { wantx = dx / l * spd; wantz = dz / l * spd; } else if (dist < d.keep - 3) { wantx = -dx / l * spd * 0.8; wantz = -dz / l * spd * 0.8; } else { const s = Math.sin(e.t * 0.9) > 0 ? 1 : -1; wantx = -dz / l * spd * 0.5 * s; wantz = dx / l * spd * 0.5 * s; }
            if (e.atkCd <= 0 && dist < d.atkR && e.windT <= 0) { e.windT = d.wind; }
          } else {
            if (dist > d.atkR * 0.7) { wantx = dx / l * spd; wantz = dz / l * spd; }
            if (e.atkCd <= 0 && dist < d.atkR && e.windT <= 0) { e.windT = d.wind; }
          }
          if (e.windT > 0) { wantx *= 0.1; wantz *= 0.1; e.windT -= dt; e.flash = Math.max(e.flash, 0.02); if (e.windT <= 0) { strike(e); e.atkCd = d.cd * M.rnd(0.85, 1.25); } }
          break;
        }
        case 'return': {
          const dx = e.home[0] - e.x, dz = e.home[1] - e.z, l = Math.hypot(dx, dz);
          if (l < 2) { e.state = 'idle'; e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.5); break; }
          wantx = dx / l * d.spd * 0.9; wantz = dz / l * d.spd * 0.9; face = Math.atan2(dx, dz);
          e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.05 * dt);
          if (!d.animal && !safe && dist < 10) e.state = 'chase';
          break;
        }
      }
      if (e.windT > 0 && e.state !== 'chase') e.windT = 0;
    } else { e.windT = 0; }
    if (face != null) e.yaw = M.lerpAng(e.yaw, face, Math.min(1, 10 * dt));
    // velocidade
    e.vx += (wantx - e.vx) * Math.min(1, 10 * dt); e.vz += (wantz - e.vz) * Math.min(1, 10 * dt);
    let nx = e.x + (e.vx + mvx) * dt, nz = e.z + (e.vz + mvz) * dt;
    // evita água funda
    if (W.waterDepth(nx, nz) > 1.1 && !e.fly) { nx = e.x; nz = e.z; e.vx = e.vz = 0; }
    const gc = W.groundY(e.x, e.z), gn = W.groundY(nx, nz);
    if (!e.fly && gn - gc > 0.55 + Math.hypot(nx - e.x, nz - e.z) * 0.6 && gn - e.y > 0.4) { nx = e.x; nz = e.z; }
    const p2 = [nx, nz]; W.resolve(p2, e.r * 0.9); e.x = p2[0]; e.z = p2[1];
    // separação
    for (const o of En.list) { if (o === e || !o.alive) continue; const dx = e.x - o.x, dz = e.z - o.z, rr = e.r + o.r; const d2 = dx * dx + dz * dz; if (d2 < rr * rr && d2 > 1e-6) { const l = Math.sqrt(d2), k = (rr - l) * 0.5; e.x += dx / l * k * 0.5; e.z += dz / l * k * 0.5; } }
    const g = W.groundY(e.x, e.z);
    if (e.fly) { e.y = M.damp(e.y, Math.max(g, W.SEA) + e.fly + Math.sin(e.t * 2 + e.ph) * 0.25, 5, dt); }
    else { e.vy = (e.vy || 0) - 24 * dt; e.y += e.vy * dt; if (e.y <= g) { e.y = g; e.vy = 0; } }
    e.ph += Math.hypot(e.vx, e.vz) * dt * 2.4;
  }

  /* ---------- mestres ---------- */
  function mkBoss(arena) {
    const m = MASTER[arena.id], lvl = En.bossLevel(arena.id);
    const e = mk('bandido', arena.x, arena.z, lvl, null);
    e.type = null; e.boss = true; e.el = arena.id; e.nome = m.nome; e.title = m.title; e.col = m.col;
    e.def = { nome: m.nome, hp: 650, dmg: 15, spd: 4.4, r: 0.7, h: 2.4, kind: 'boss', atkR: 3, cd: 3, wind: 0.6, xp: 0, weak: arena.id === 'fogo' ? 'agua' : arena.id === 'agua' ? 'fogo' : arena.id === 'terra' ? 'ar' : 'terra', heavy: false };
    e.hpMax = Math.round(650 * (1 + 0.2 * (lvl - 1))); e.hp = e.hpMax; e.dmg = 15 * (1 + 0.1 * (lvl - 1));
    e.r = 0.7; e.h = 2.3; e.scale = 1.25; e.model = G.models.get('human', m.look); e.home = [arena.x, arena.z]; e.arena = arena;
    e.dormant = true; e.state = 'dormant'; e.atkCd = 2; e.phase = 1; e.skillT = 2;
    e.neutral = true;
    return e;
  }
  En.bossLevel = function (id) { const S = G.S; return id === S.origin ? 8 : 12; };
  En.challenge = function (b) {
    if (!b.dormant) return; b.dormant = false; b.neutral = false; b.state = 'fight'; b.skillT = 1.5;
    G.ui.banner(b.nome, b.title); G.audio.sfx('boss'); G.cam.kick(0.15);
  };
  function updateBoss(e, dt) {
    const P = G.player, m = e.arena;
    e.t += dt; if (e.flash > 0) e.flash -= dt; if (e.hpT > 0) e.hpT = 5;
    if (e.dormant) { e.yaw = M.lerpAng(e.yaw, Math.atan2(P.x - e.x, P.z - e.z), Math.min(1, 3 * dt)); if (e.y !== W.groundY(e.x, e.z)) e.y = W.groundY(e.x, e.z); return; }
    if (e.burnT > 0) { e.burnT -= dt; e.hp -= 3 * dt; }
    if (e.slowT > 0) e.slowT -= dt; if (e.stunT > 0) e.stunT -= dt; if (e.wetT > 0) e.wetT -= dt; if (e.shield > 0) e.shield -= dt;
    if (e.hp <= 0 && e.alive) { die(e, {}); return; }
    const dx = P.x - e.x, dz = P.z - e.z, dist = Math.hypot(dx, dz) || 1;
    // se jogador morreu ou fugiu longe: reinicia
    if (!P.alive || dist > 70) { e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.3 * dt); if (!P.alive || dist > 90) { e.dormant = true; e.neutral = true; e.state = 'dormant'; e.hp = e.hpMax; e.x = m.x; e.z = m.z; e.phase = 1; G.ui.setBoss(null); } return; }
    const pct = e.hp / e.hpMax; const ph = pct > 0.66 ? 1 : pct > 0.33 ? 2 : 3;
    if (ph !== e.phase) { e.phase = ph; e.shield = 1.5; G.ui.toast('O Mestre se enfurece!'); G.cam.kick(0.1); fx.ring(e.x, e.y + 0.3, e.z, 1, 40, e.col, true, 1); e.skillT = 1; }
    e.yaw = M.lerpAng(e.yaw, Math.atan2(dx, dz), Math.min(1, 6 * dt));
    // movimento: mantém distância média
    let wx = 0, wz = 0; const want = e.el === 'fogo' ? 6 : e.el === 'agua' ? 8 : e.el === 'terra' ? 5 : 7;
    const spd = e.def.spd * (e.slowT > 0 ? 0.5 : 1) * (e.stunT > 0 ? 0 : 1) * (1 + 0.12 * (ph - 1));
    if (dist > want + 1.5) { wx = dx / dist * spd; wz = dz / dist * spd; } else if (dist < want - 2) { wx = -dx / dist * spd * 0.8; wz = -dz / dist * spd * 0.8; } else { const s = Math.sin(e.t * 0.5) > 0 ? 1 : -1; wx = -dz / dist * spd * 0.5 * s; wz = dx / dist * spd * 0.5 * s; }
    if (e.casting > 0) { e.casting -= dt; wx *= 0.1; wz *= 0.1; }
    e.vx += (wx - e.vx) * Math.min(1, 6 * dt); e.vz += (wz - e.vz) * Math.min(1, 6 * dt);
    e.kbx *= Math.max(0, 1 - 7 * dt); e.kbz *= Math.max(0, 1 - 7 * dt);
    let nx = e.x + (e.vx + e.kbx) * dt, nz = e.z + (e.vz + e.kbz) * dt;
    const ad = Math.hypot(nx - m.x, nz - m.z); if (ad > m.R + 14) { nx = e.x; nz = e.z; }
    const p2 = [nx, nz]; W.resolve(p2, 0.7); e.x = p2[0]; e.z = p2[1]; e.y = W.groundY(e.x, e.z);
    e.ph += Math.hypot(e.vx, e.vz) * dt * 2.2;
    // habilidades
    if (e.stunT <= 0) {
      e.skillT -= dt;
      if (e.skillT <= 0) { e.skillT = M.rnd(2.2, 3.4) / (1 + 0.22 * (ph - 1)); bossSkill(e, ph, dist); }
    }
    // contato
    if (dist < 1.8 && e.atkCd <= 0) { e.atkCd = 1.6; P.hurt(e.dmg * 0.7, { el: e.el, kx: dx / dist, kz: dz / dist, kb: 7 }); }
    e.atkCd -= dt;
  }
  function bossSkill(e, ph, dist) {
    const P = G.player, el = e.el, col = e.col, dmg = e.dmg;
    e.casting = 0.6; fx.burst(e.x, e.y + 1.5, e.z, 10, col, 3, 0.4, 0.5, true, 0);
    const r = Math.random();
    const dirTo = (x, z) => Math.atan2(x - e.x, z - e.z);
    const volley = (n, spread, def, d) => { const a0 = dirTo(P.x, P.z); for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * spread; En.shoot(e, e.x + Math.sin(a) * 20, P.y + 1, e.z + Math.cos(a) * 20, def, d); } G.audio.sfx('shoot'); };
    const ringTele = (rad) => En.telegraph(e.x, e.z, rad, 0.9, dmg * 1.1, el, { kb: 10, airSafe: el === 'terra' });
    const aroundPlayer = (n, rad, delay) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, rr = i === 0 ? 0 : M.rnd(2, 7); En.telegraph(P.x + Math.cos(a) * rr + P.vx * 0.4, P.z + Math.sin(a) * rr + P.vz * 0.4, rad, delay + i * 0.18, dmg, el, { kb: 7 }); } };
    if (el === 'fogo') {
      if (r < 0.4) volley(ph === 1 ? 3 : 5, 0.22, { el: 'fogo', col, sp: 17, burn: 2, size: 0.3 }, dmg * 0.7);
      else if (r < 0.7) ringTele(5.5 + ph);
      else { const a = dirTo(P.x, P.z); for (let i = 1; i <= 4; i++) En.telegraph(e.x + Math.sin(a) * i * 3.4, e.z + Math.cos(a) * i * 3.4, 2.2, 0.55 + i * 0.16, dmg, 'fogo', { kb: 7, burn: 2 }); }
      if (ph === 3 && Math.random() < 0.5) aroundPlayer(4, 2.2, 0.9);
    } else if (el === 'agua') {
      if (r < 0.4) volley(3, 0.2, { el: 'agua', col, sp: 16, slow: 2, size: 0.28 }, dmg * 0.7);
      else if (r < 0.7) { const a = dirTo(P.x, P.z); for (let i = 1; i <= 5; i++) En.telegraph(e.x + Math.sin(a) * i * 3, e.z + Math.cos(a) * i * 3, 2.0, 0.5 + i * 0.14, dmg, 'agua', { kb: 8, slow: 1.5 }); }
      else aroundPlayer(ph + 1, 2.4, 0.9);
      if (ph >= 2 && Math.random() < 0.25 && e.hp < e.hpMax * 0.7) { e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.04); fx.burst(e.x, e.y + 1.5, e.z, 20, [0.4, 1, 0.7], 3, 0.4, 0.8, true, -1); G.ui.toast('O Mestre se cura!'); }
    } else if (el === 'terra') {
      if (r < 0.35) volley(1, 0, { el: 'terra', col, sp: 13, grav: 5, size: 0.5 }, dmg * 1.1);
      else if (r < 0.65) { En.telegraph(e.x, e.z, 8.5, 1.1, dmg * 1.2, 'terra', { kb: 12, airSafe: true, stun: 0.5 }); }
      else aroundPlayer(ph + 2, 2.2, 0.8);
      if (ph >= 2 && Math.random() < 0.3 && En.list.filter((q) => q.alive && !q.boss).length < 3) { for (let i = 0; i < 2; i++) { const a = Math.random() * 6.283; const s = En.spawnAt('bandidopedra', e.x + Math.cos(a) * 4, e.z + Math.sin(a) * 4, e.lvl - 2); s.state = 'chase'; } G.ui.toast('Capangas chegam!'); }
    } else {
      if (r < 0.4) volley(ph === 1 ? 3 : 5, 0.16, { el: 'ar', col, sp: 24, kb: 8, size: 0.24 }, dmg * 0.6);
      else if (r < 0.65) { // desloca
        const a = Math.random() * 6.283; const nx = P.x + Math.cos(a) * 6, nz = P.z + Math.sin(a) * 6; fx.burst(e.x, e.y + 1, e.z, 14, col, 4, 0.4, 0.4, true, 0); e.x = nx; e.z = nz; e.y = W.groundY(nx, nz); fx.burst(e.x, e.y + 1, e.z, 14, col, 4, 0.4, 0.4, true, 0); volley(1, 0, { el: 'ar', col, sp: 24, kb: 8 }, dmg * 0.6);
      } else { En.telegraph(e.x, e.z, 7.5, 0.9, dmg, 'ar', { kb: 14 }); }
      if (ph >= 2 && Math.random() < 0.35) aroundPlayer(3, 2.2, 0.8);
    }
  }

  /* ---------- gerenciamento ---------- */
  En.mk = mk; En.mkBoss = mkBoss; // usados pelo multiplayer para criar espelhos
  En.init = function () {
    En.list.length = 0; En.shots.length = 0; En.tele.length = 0; En.camps.length = 0; En.bosses.length = 0; En.t = 0; En.scanT = 0;
    W.towns.forEach((t, i) => { // rebanhos de porcos e vacas perto de cada cidade
      const r = M.seeded(900 + i);
      for (let k = 0; k < 2; k++) {
        const a = r() * 6.283 + k * 3.1, rd = t.R + 20 + r() * 16, x = t.x + Math.cos(a) * rd, z = t.z + Math.sin(a) * rd;
        if (W.waterDepth(x, z) > 0.8) continue;
        En.camps.push({ def: { id: 'herd_' + i + '_' + k }, x, z, n: 3 + (k ? 1 : 0), types: k ? ['vaca', 'vaca', 'porco'] : ['porco', 'porco', 'vaca'], reg: t.id, left: 0, respawnAt: 0, spawned: false, members: [], herd: true });
      }
    });
    for (const c of W.camps) En.camps.push({ def: c, x: c.x, z: c.z, n: c.n, types: c.types, reg: c.reg, left: 0, respawnAt: 0, spawned: false, members: [] });
  };
  En.campLevel = function (c) {
    const S = G.S, o = W.towns.find((t) => t.id === S.origin);
    return M.clamp(1 + Math.floor(Math.hypot(c.x - o.x, c.z - o.z) / 48), 1, 14);
  };
  En.scan = function () {
    const P = G.player, S = G.S, T = tg();
    const near = (x, z) => { let m = 1e9; for (const q of T) m = Math.min(m, Math.hypot(x - q.x, z - q.z)); return m; };
    for (const c of En.camps) {
      const d = near(c.x, c.z);
      if (!c.spawned && d < 120 && En.t >= c.respawnAt) {
        c.spawned = true; c.left = c.n; c.members = [];
        const lvl = En.campLevel(c);
        for (let i = 0; i < c.n; i++) {
          const a = (i / c.n) * 6.28 + Math.random(), rr = M.rnd(2, 5), type = M.pick(c.types);
          const e = mk(type, c.x + Math.cos(a) * rr, c.z + Math.sin(a) * rr, Math.max(1, lvl + M.rint(-1, 1)), c);
          if (W.waterDepth(e.x, e.z) > 0.8) { c.left--; continue; }
          En.list.push(e); c.members.push(e);
        }
      } else if (c.spawned && d > 170) {
        for (const m of c.members) { m.alive = false; }
        c.spawned = false; c.members = [];
      } else if (c.spawned && c.left <= 0 && En.t >= c.respawnAt) { c.spawned = false; }
    }
    for (const a of W.arenas) {
      if (G.mp && G.mp.state === 'on') { // multiplayer: o mestre volta depois de um tempo, para cada jogador aprender o seu elemento
        const bt = G.mp.bossT || {};
        if (G.mp.bossDead[a.id] && En.t > (bt[a.id] || 0)) delete G.mp.bossDead[a.id];
        if (G.mp.bossDead[a.id]) continue;
      } else if (S.flags.masters[a.id]) continue;
      let b = En.bosses.find((q) => q.arena === a);
      const d = near(a.x, a.z);
      if (!b && d < 150) { b = mkBoss(a); En.bosses.push(b); En.list.push(b); }
      if (b && !b.alive) { const i = En.bosses.indexOf(b); if (i >= 0) En.bosses.splice(i, 1); }
    }
    // remove mortos
    for (let i = En.list.length - 1; i >= 0; i--) if (!En.list[i].alive) En.list.splice(i, 1);
  };
  En.update = function (dt) {
    if (G.mp && G.mp.skipSim()) return; // multiplayer: só o host simula inimigos
    En.t += dt; En.scanT -= dt;
    if (En.scanT <= 0) { En.scanT = 0.6; En.scan(); }
    for (const e of En.list) { if (!e.alive) continue; const f = e.boss ? updateBoss : updateEnemy; if (G.mp && G.mp.withTarget) G.mp.withTarget(e, () => f(e, dt)); else f(e, dt); }
    updateShots(dt); updateTele(dt);
    // barra do chefe
    const b = En.bosses.find((q) => q.alive && !q.dormant);
    G.ui.setBoss(b || null);
  };
  En.onRespawn = function () { for (const e of En.list) if (e.alive && !e.boss) { e.state = 'return'; e.windT = 0; } En.shots.length = 0; En.tele.length = 0; };
  En.ghosts = []; // bonecos de treino de outros jogadores (só visuais, multiplayer)
  En.draw = function () {
    const P = G.player;
    for (const e of (En.ghosts.length ? En.list.concat(En.ghosts) : En.list)) {
      if (!e.alive) continue;
      if (G.seis.on && G.seis.hidden(e)) continue;
      const d2 = (e.x - P.x) * (e.x - P.x) + (e.z - P.z) * (e.z - P.z); if (d2 > 110 * 110) continue;
      const wind = e.windT > 0 && !e.boss;
      const add = e.flash > 0 ? [0.5, 0.5, 0.5] : wind ? [0.55 * (0.5 + 0.5 * Math.sin(e.t * 30)), 0.05, 0.02] : null;
      const tint = e.burnT > 0 ? [1.2, 0.8, 0.6] : e.slowT > 0 ? [0.8, 0.95, 1.2] : null;
      const root = { x: e.x, y: e.y, z: e.z, yaw: e.yaw, scale: e.scale };
      G.models.draw(e.model, root, { ph: e.ph, sp: Math.min(1, Math.hypot(e.vx, e.vz) / 4.5), t: e.t, atk: wind ? 0.6 : 0, cast: e.boss && e.casting > 0 ? 1 : 0 }, { add, tint, outline: d2 < 3600 ? 0.035 : 0, emis: e.boss ? 0.12 : 0 });
      if (!e.fly) fx.imm(false, e.x, W.groundY(e.x, e.z) + 0.06, e.z, 1.2 * e.scale, 0.05, 0.05, 0.08, 0.3);
      if (e.def.burn && e.def.model === 'human' && Math.random() < 0.15) fx.flame(e.x + Math.sin(e.yaw) * 0.4, e.y + 1.0, e.z + Math.cos(e.yaw) * 0.4, 0.4);
      if (e.boss && Math.random() < 0.6) fx.p(true, e.x + M.rnd(-0.6, 0.6), e.y + M.rnd(0.1, 2.2), e.z + M.rnd(-0.6, 0.6), 0, M.rnd(0.3, 1.2), 0, 0.8, 0.35, 0.05, e.col[0], e.col[1], e.col[2], 0.8, 0, 0);
    }
  };
})();
