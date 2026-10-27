'use strict';
/* Elemental World — jogador: movimento, esquiva, guarda, estados, dano e desenho */
(function () {
  const G = window.G; const M = G.M; const W = G.world; const gfx = G.gfx;
  const P = (G.player = {
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, hp: 100, chi: 100, grounded: true, swimming: false, alive: true,
    dashT: 0, dashCd: 0, dashDX: 0, dashDZ: 1, iframes: 0, guard: false, guardT: 0, perfectT: 0, cast: 0, castYaw: null, castHold: 0,
    burn: 0, slow: 0, stun: 0, wet: 0, armorT: 0, hurtT: 0, avatarT: 0, avatarCd: 0, hasteT: 0, regenDelay: 0, lastHit: 99, ph: 0, sp: 0, t: 0, r: 0.45,
    inLava: false, depth: 0, wasGrounded: true, lastSafe: null, aimYaw: 0,
  });
  const el = () => (G.S ? G.S.active || G.S.element : 'fogo');
  P.el = el;

  P.init = function (S) {
    P.alive = true; P.burn = P.slow = P.stun = P.wet = P.armorT = P.avatarT = P.iframes = 0;
    P.x = S.pos.x; P.z = S.pos.z; P.yaw = S.pos.yaw || 0; P.y = W.groundY(P.x, P.z); P.vx = P.vy = P.vz = 0;
    const st = G.prog.stats();
    P.hp = S.hp == null ? st.hpMax : Math.min(S.hp, st.hpMax); P.chi = S.chi == null ? st.chiMax : Math.min(S.chi, st.chiMax);
    P.lastSafe = [P.x, P.z];
  };
  P.teleport = function (x, z, yaw) {
    P.x = x; P.z = z; P.y = W.groundY(x, z); P.vx = P.vy = P.vz = 0; if (yaw != null) { P.yaw = yaw; G.cam.yaw = yaw; }
    G.cam.snap(P);
  };
  P.spend = function (n) { if (P.chi < n) return false; P.chi -= n; P.regenDelay = 1.3 * (G.diff ? G.diff.delay : 1); return true; };
  P.heal = function (n) { const st = G.prog.stats(); P.hp = Math.min(st.hpMax, P.hp + n); };
  P.pose = function (secs, yaw) { P.cast = 1; P.castHold = Math.max(P.castHold, secs); if (yaw != null) P.castYaw = yaw; };

  P.update = function (dt) {
    const In = G.input, S = G.S, st = G.prog.stats();
    P.t += dt;
    if (!P.alive) return;
    // temporizadores
    for (const k of ['dashCd', 'iframes', 'perfectT', 'armorT', 'hurtT', 'castHold', 'avatarCd', 'hasteT']) if (P[k] > 0) P[k] = Math.max(0, P[k] - dt);
    P.lastHit += dt; P.regenDelay -= dt;
    if (P.avatarT > 0) { P.avatarT -= dt; if (P.avatarT <= 0) { P.avatarT = 0; G.ui.toast('O Estado Avatar terminou'); P.avatarCd = 25; } }
    if (P.castHold <= 0) { P.cast = Math.max(0, P.cast - dt * 4); P.castYaw = null; }
    // estados
    if (P.stun > 0) P.stun -= dt;
    if (P.slow > 0) P.slow -= dt;
    if (P.wet > 0) P.wet -= dt;
    if (P.burn > 0) { P.burn -= dt; if (P.wet > 0 || P.swimming) P.burn = 0; else { P.hp -= 5 * dt * (P.armorT > 0 ? 0.5 : 1); if (Math.random() < dt * 10) G.fx.flame(P.x, P.y + 1.0, P.z, 0.7); if (P.hp <= 0) return P.die('fogo'); } }

    // ---- movimento ----
    const mv = In.move(), cy = G.cam.yaw;
    let wx = Math.sin(cy) * mv[1] - Math.cos(cy) * mv[0], wz = Math.cos(cy) * mv[1] + Math.sin(cy) * mv[0];
    const hl = Math.hypot(wx, wz); const mag = Math.min(1, hl);
    const dirx = hl > 0.001 ? wx / hl : 0, dirz = hl > 0.001 ? wz / hl : 0;
    const gCur = W.groundY(P.x, P.z);
    P.depth = Math.max(0, W.SEA - gCur);
    P.swimming = P.depth > 1.0;
    P.guard = !!In.held.guard && P.dashT <= 0 && P.stun <= 0 && P.grounded;
    if (In.take('guard')) P.perfectT = 0.2;
    if (P.guard) P.guardT += dt; else P.guardT = 0;
    let speed = 6.4 * st.speed * (P.hasteT > 0 ? 1.25 : 1);
    if (P.swimming) speed *= 0.6; else if (P.depth > 0.35) speed *= 0.82;
    if (P.slow > 0) speed *= 0.5; if (P.guard) speed *= 0.4; if (P.castHold > 0 && P.cast > 0.5) speed *= 0.75; if (P.stun > 0) speed = 0;
    // esquiva
    if (In.take('dodge') && P.dashCd <= 0 && P.stun <= 0 && !P.swimming) {
      P.dashT = 0.3; P.iframes = Math.max(P.iframes, 0.28); P.dashCd = 0.85 * (1 - 0.05 * G.prog.rank('agilidade'));
      const dd = mag > 0.1 ? [dirx, dirz] : [Math.sin(P.yaw), Math.cos(P.yaw)]; P.dashDX = dd[0]; P.dashDZ = dd[1];
      G.fx.dust(P.x, P.y, P.z, 8); G.audio.sfx('dash');
    }
    let tvx = dirx * speed * mag, tvz = dirz * speed * mag;
    if (P.dashT > 0) { P.dashT -= dt; tvx = P.dashDX * 15 * st.speed; tvz = P.dashDZ * 15 * st.speed; P.vx = tvx; P.vz = tvz; }
    else { const k = Math.min(1, (P.grounded ? 14 : 4) * dt); P.vx += (tvx - P.vx) * k; P.vz += (tvz - P.vz) * k; }
    // pulo
    if (In.take('jump') && P.grounded && !P.swimming && P.stun <= 0) { P.vy = 8.6 * (el() === 'ar' ? 1.12 : 1); P.grounded = false; G.audio.sfx('jump'); }
    // planador (dobradores de ar): segurar o pulo no ar abre o planador; sem custo de chi
    const airB = el() === 'ar';
    P.gliding = false;
    if (!P.grounded && In.held.jump && airB && P.stun <= 0 && !P.swimming) { P.gliding = true;  if (Math.random() < dt * 14) G.fx.p(false, P.x, P.y + 1.4, P.z, M.rnd(-1, 1), 0.2, M.rnd(-1, 1), 0.4, 0.3, 0.1, 0.9, 0.95, 1, 0.5, 0, 1); }
    if (P.gliding) { // voo: velocidade horizontal segue a direção; cai devagar
      const gs = 13 * st.speed;
      if (mag > 0.05) { const k = Math.min(1, 2.2 * dt); P.vx += (dirx * gs * mag - P.vx) * k; P.vz += (dirz * gs * mag - P.vz) * k; }
      else { const d = Math.exp(-0.45 * dt); P.vx *= d; P.vz *= d; }
      // voo: olhar para cima sobe (gasta chi), olhar para baixo mergulha e acelera
      const cm = G.cam, up = Math.max(-1, Math.min(1, cm.fpMode ? cm.fpPitch : (0.38 - cm.pitch) * 1.3));
      let tvy = -2.4 + up * 11;
      if (tvy > -1.2) { const cost = 7 * dt; if (P.chi >= cost) { P.chi -= cost; P.regenDelay = 0.6; } else tvy = -2.4; }
      if (up < -0.1 && mag > 0.05) { const b = 1 + (-up) * 0.45, v = Math.hypot(P.vx, P.vz); if (v < gs * b) { P.vx *= 1 + 0.6 * dt; P.vz *= 1 + 0.6 * dt; } }
      P.vy += (Math.max(-16, Math.min(7, tvy)) - P.vy) * Math.min(1, 3.2 * dt);
    } else P.vy -= 24 * dt;
    // aplica deslocamento com bloqueio por encostas muito íngremes
    let nx = P.x + P.vx * dt, nz = P.z + P.vz * dt;
    const sd = Math.hypot(nx - P.x, nz - P.z);
    if (sd > 1e-5 && P.grounded) {
      const gN = W.groundY(nx, nz);
      if ((gN - gCur) / sd > 1.3 && gN - P.y > 0.45) {
        const gX = W.groundY(nx, P.z), gZ = W.groundY(P.x, nz);
        const okX = (gX - gCur) / (Math.abs(nx - P.x) + 1e-5) <= 1.3 || gX - P.y <= 0.45, okZ = (gZ - gCur) / (Math.abs(nz - P.z) + 1e-5) <= 1.3 || gZ - P.y <= 0.45;
        if (okX && !okZ) { nz = P.z; P.vz = 0; } else if (okZ && !okX) { nx = P.x; P.vx = 0; } else { nx = P.x; nz = P.z; P.vx = P.vz = 0; }
      }
    }
    const p2 = [nx, nz]; W.resolve(p2, P.r, P.y); P.x = p2[0]; P.z = p2[1];
    P.y += P.vy * dt;
    const g = W.groundY(P.x, P.z), depthNow = Math.max(0, W.SEA - g), swim = depthNow > 1.0;
    const floor = swim ? W.SEA - 1.0 + Math.sin(P.t * 2.4) * 0.05 : g;
    if (P.y <= floor) {
      if (!P.grounded && P.vy < -9) { G.fx.dust(P.x, P.y, P.z, 10); G.cam.kick(0.04); if (P.vy < -20) P.hurt(Math.round((-P.vy - 20) * 3), { fall: true }); }
      P.y = floor; if (P.vy < 0) P.vy = 0; P.grounded = true;
    } else if (P.y > floor + 0.08) P.grounded = false;
    P.swimming = swim && P.grounded;
    // lava
    P.inLava = W.isLava(P.x, P.z) && P.y < W.LAVA_Y + 0.6;
    P.glideRoll = M.damp(P.glideRoll || 0, P.gliding ? -mv[0] * 0.5 : 0, 6, dt);
    if (P.inLava && P.iframes <= 0) { P.hurt(Math.round(14 * (G.prog.stats().hpMax / 100) * 0.5 + 4), { el: 'fogo', lava: true, burn: 2 }); P.vy = 9; P.grounded = false; P.iframes = 0.5; }
    if (P.grounded && !P.swimming && !P.inLava && P.depth < 0.3) { P.lastSafe[0] = P.x; P.lastSafe[1] = P.z; }
    // orientação
    const spd = Math.hypot(P.vx, P.vz); P.sp = M.clamp(spd / 6.4, 0, 1.3);
    let ty = null;
    if (P.castHold > 0 && P.castYaw != null) ty = P.castYaw;
    else if (P.guard) ty = G.cam.yaw;
    else if (spd > 0.5) ty = Math.atan2(P.vx, P.vz);
    if (ty != null) P.yaw = M.lerpAng(P.yaw, ty, Math.min(1, (P.castHold > 0 ? 22 : 13) * dt));
    P.ph += spd * dt * 2.3;
    // recursos
    if (P.regenDelay <= 0 && P.avatarT <= 0 || P.avatarT > 0) P.chi = Math.min(st.chiMax, P.chi + st.regen * dt * (P.guard ? 0.5 : 1));
    if (P.lastHit > 6 && P.hp < st.hpMax) P.hp = Math.min(st.hpMax, P.hp + st.hpMax * 0.008 * dt);
    if (P.hp > st.hpMax) P.hp = st.hpMax; if (P.chi > st.chiMax) P.chi = st.chiMax;
    // reserva de água (dobradores de água)
    const near = P.depth > 0.25 || waterNear(P.x, P.z);
    let gain = 0; if (near) gain = 30; else if (G.env.isRaining()) gain = 9; else if (W.regionAt(P.x, P.z) === 'agua') gain = 3.5;
    S.water = M.clamp(S.water + gain * dt, 0, 100);
    // partículas de caminhada
    if (P.grounded && !P.swimming && spd > 4 && Math.random() < dt * 8) G.fx.dust(P.x, P.y, P.z, 1);
    if (P.swimming && spd > 1 && Math.random() < dt * 10) G.fx.p(false, P.x, W.SEA + 0.05, P.z, M.rnd(-0.5, 0.5), 0.6, M.rnd(-0.5, 0.5), 0.6, 0.35, 0.1, 0.9, 0.97, 1, 0.6, 2, 1);
    if (P.avatarT > 0 && Math.random() < dt * 40) G.fx.p(true, P.x + M.rnd(-0.4, 0.4), P.y + M.rnd(0.2, 1.8), P.z + M.rnd(-0.4, 0.4), 0, M.rnd(0.5, 1.8), 0, 0.7, 0.3, 0.05, 0.5, 0.8, 1, 0.8, 0, 0.5);
  };
  function waterNear(x, z) {
    for (const a of [[2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5]]) if (W.groundY(x + a[0], z + a[1]) < W.SEA - 0.3) return true;
    return false;
  }
  P.waterNear = () => P.depth > 0.25 || waterNear(P.x, P.z);

  P.activateAvatar = function () {
    const S = G.S;
    if (S.element !== 'avatar' || !S.avatarUnlocked) { G.ui.toast('Estado Avatar ainda não despertou (nível 5)'); return false; }
    if (P.avatarT > 0 || P.avatarCd > 0) { G.ui.toast(P.avatarCd > 0 ? 'Estado Avatar em recarga' : 'Já ativo'); return false; }
    if (P.chi < 70) { G.ui.toast('Chi insuficiente (70)', 'err'); return false; }
    P.chi -= 70; P.avatarT = 14 + 4 * G.prog.rank('estado'); P.heal(G.prog.stats().hpMax * 0.4); P.iframes = 1;
    G.ui.banner('Estado Avatar', 'Poder ampliado'); G.audio.sfx('avatar'); G.cam.kick(0.25); G.fx.ring(P.x, P.y + 0.2, P.z, 1, 40, [0.6, 0.85, 1], true, 2);
    G.fx.burst(P.x, P.y + 1, P.z, 60, [0.6, 0.85, 1], 9, 0.6, 1.2, true, 0);
    G.quests && G.quests.event('avatarState');
    return true;
  };

  P.hurt = function (dmg, o) {
    o = o || {};
    if (!P.alive || dmg <= 0) return false;
    if (P.iframes > 0) return false;
    const S = G.S;
    if (P.guard && !o.fall && !o.lava && !o.ignoreGuard) {
      if (P.perfectT > 0) { // defesa perfeita
        G.ui.toast('Defesa perfeita!', 'ok'); G.audio.sfx('parry'); P.iframes = 0.4; P.chi = Math.min(G.prog.stats().chiMax, P.chi + 20);
        G.combat && G.combat.counter(); return false;
      }
      dmg *= 0.3; P.chi = Math.max(0, P.chi - 4); G.audio.sfx('block'); G.fx.burst(P.x + Math.sin(P.yaw) * 0.6, P.y + 1.1, P.z + Math.cos(P.yaw) * 0.6, 8, [1, 0.95, 0.7], 4, 0.25, 0.3, true, 2);
    }
    if (P.armorT > 0) dmg *= 0.5;
    if (P.avatarT > 0) dmg *= 0.5;
    dmg = Math.max(1, Math.round(dmg));
    P.hp -= dmg; P.lastHit = 0; P.hurtT = 0.25; P.regenDelay = Math.max(P.regenDelay, 1.2);
    G.ui.dmgNum(P.x, P.y + 2, P.z, dmg, 'hurt');
    if (o.kx != null && P.dashT <= 0) { const k = o.kb || 5; P.vx += o.kx * k; P.vz += o.kz * k; if (!o.noLift && P.grounded) { P.vy = 3.5; P.grounded = false; } }
    if (o.burn) { P.burn = Math.max(P.burn, o.burn); }
    if (o.slow) P.slow = Math.max(P.slow, o.slow);
    if (o.stun) P.stun = Math.max(P.stun, o.stun);
    G.cam.kick(Math.min(0.12, 0.02 + dmg * 0.002)); G.audio.sfx('hurt'); G.audio.vibrate(40);
    if (P.hp <= 0) P.die(o.el);
    return true;
  };
  P.die = function () {
    if (!P.alive) return; P.alive = false; P.hp = 0; G.S.stats.deaths++;
    G.fx.smoke(P.x, P.y + 1, P.z, 14, 0.8);
    G.ui.showDeath();
  };
  P.respawn = function () {
    const S = G.S, st = G.prog.stats();
    const loss = Math.floor(S.inv.coins * 0.1); S.inv.coins -= loss;
    let cp = S.checkpoint || { x: W.towns.find((t) => t.id === S.origin).x + 6, z: W.towns.find((t) => t.id === S.origin).z + 6 };
    P.alive = true; P.burn = P.slow = P.stun = 0; P.avatarT = 0;
    P.hp = st.hpMax * 0.6; P.chi = st.chiMax; P.iframes = 2;
    P.teleport(cp.x, cp.z, 0);
    G.enemies && G.enemies.onRespawn();
    G.ui.toast(loss ? 'Você perdeu ' + loss + ' moedas' : 'Você retornou ao último abrigo');
  };

  P.draw = function () {
    const S = G.S; if (!S || !P.alive && P.hp > 0) return;
    const look = Object.assign({}, G.models.playerLook(S)); const wp = G.items && G.items.weapon(); if (wp) look.weapon = wp.model; const model = G.models.get('human', look);
    const root = { x: P.x, y: P.y, z: P.z, yaw: P.yaw, scale: 1 };
    if (P.swimming) { root.y = W.SEA - 0.55 + Math.sin(P.t * 2.4) * 0.05; root.pitch = 1.15; }
    if (P.dashT > 0) root.roll = (1 - P.dashT / 0.3) * Math.PI * 2;
    if (!P.alive) { root.pitch = -1.5; root.y += 0.2; }
    if (G.rest) G.rest.pose(root);
    const flash = P.hurtT > 0 ? [0.5 * P.hurtT * 4, 0, 0] : (P.avatarT > 0 ? [0.12, 0.2, 0.35] : null);
    const blink = P.iframes > 0 && P.dashT <= 0 && P.hurtT <= 0 && ((P.t * 20) | 0) % 2 === 0;
    if (blink && P.iframes < 3) return;
    const tint = P.burn > 0 ? [1.2, 0.8, 0.6] : null;
    G.models.draw(model, root, { ph: P.ph, sp: P.guard ? P.sp * 0.5 : P.sp, cast: P.cast, t: P.t, atk: G.punch && G.punch.anim > 0 ? Math.sin(Math.min(1, G.punch.prog()) * Math.PI) : 0, bob: P.grounded && !P.swimming ? Math.abs(Math.sin(P.ph)) * 0.04 * P.sp : 0 }, { add: flash, tint, emis: P.avatarT > 0 ? 0.25 : 0 });
    if (P.gliding && P.alive) G.glider.draw(P.x, P.y + 2.3, P.z, P.yaw, P.glideRoll || 0, Math.max(-0.5, Math.min(0.4, P.vy * -0.04)), 1.2);
    // sombra
    if (!P.swimming) G.fx.imm(false, P.x, W.groundY(P.x, P.z) + 0.06, P.z, 1.4, 0.05, 0.05, 0.08, 0.35);
    if (P.guard) G.fx.imm(true, P.x + Math.sin(P.yaw) * 0.7, P.y + 1.1, P.z + Math.cos(P.yaw) * 0.7, 1.6, 0.6, 0.8, 1, 0.35);
  };
})();
