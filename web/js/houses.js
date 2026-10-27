'use strict';
/* Elemental World — interiores das casas: entrar, ver moradores dormindo à noite, camas. A casa vazia do primeiro povoado é a nossa. */
(function () {
  const G = window.G, M = G.M, W = G.world, gfx = G.gfx, H = M.hex;
  const Hs = (G.houses = { inside: false, cur: null, beds: [], doors: [], active: false });
  const HX = 90, HZ = 40, Y0 = 24, RW = 5, RD = 8, RH = 3.3;
  const inBox = (x, z) => x > HX - RW - 3 && x < HX + RW + 3 && z > HZ - 3 && z < HZ + RD + 3;
  const gy0 = W.groundY, wd0 = W.waterDepth, lv0 = W.isLava, fz0 = W.freeZone;
  W.groundY = (x, z) => (Hs.active && inBox(x, z) ? Y0 : gy0(x, z));
  W.waterDepth = (x, z) => (Hs.active && inBox(x, z) ? 0 : wd0(x, z));
  W.isLava = (x, z) => (Hs.active && inBox(x, z) ? false : lv0(x, z));
  W.freeZone = (x, z) => inBox(x, z) || (fz0 && fz0(x, z));
  const I = (px, py, pz, sx, sy, sz, ry) => M.trs(new Float32Array(16), px, py, pz, 0, ry || 0, 0, sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
  const wx = (u) => HX + u, wz = (v) => HZ + v;
  let solid = null, glow = null, ret = null;
  Hs.BED_TOP = Y0 + 0.55;

  function buildRoom() {
    const S = new gfx.MB(0.04), GL = new gfx.MB(0);
    const wood = H('#9a6e40'), dark = H('#6a4a2a'), plank = H('#7d5a38'), wall = H('#b59a72'), wall2 = H('#8f7855');
    S.box(I(wx(0), Y0 - 0.2, wz(RD / 2), RW * 2 + 1, 0.4, RD + 1), plank);
    for (let i = -4; i <= 4; i++) S.box(I(wx(i * 1.1), Y0 + 0.01, wz(RD / 2), 0.04, 0.02, RD), dark);
    S.box(I(wx(0), Y0 + RH + 0.25, wz(RD / 2), RW * 2 + 1.6, 0.5, RD + 1.6), dark);
    const wallB = (cx, cz, sx, sz) => { S.box(I(cx, Y0 + RH / 2, cz, sx, RH, sz), wall); S.box(I(cx, Y0 + 0.15, cz, sx + 0.04, 0.3, sz + 0.04), wall2); };
    wallB(wx(0), wz(RD + 0.3), RW * 2 + 1.2, 0.6); wallB(wx(0), wz(-0.3), RW * 2 + 1.2, 0.6);
    wallB(wx(-RW - 0.3), wz(RD / 2), 0.6, RD + 0.6); wallB(wx(RW + 0.3), wz(RD / 2), 0.6, RD + 0.6);
    W.addBox(wx(-RW - 0.6), wz(-0.6), wx(RW + 0.6), wz(0), 'hs'); W.addBox(wx(-RW - 0.6), wz(RD), wx(RW + 0.6), wz(RD + 0.6), 'hs');
    W.addBox(wx(-RW - 0.6), wz(0), wx(-RW), wz(RD), 'hs'); W.addBox(wx(RW), wz(0), wx(RW + 0.6), wz(RD), 'hs');
    // porta (frente) e janelas
    S.box(I(wx(0), Y0 + 1.1, wz(0.06), 1.5, 2.2, 0.12), dark); GL.box(I(wx(0.5), Y0 + 1.1, wz(0.14), 0.12, 0.12, 0.05), H('#e8c060'));
    for (const [u, v, sx, sz] of [[-RW + 0.02, 4, 0.06, 1.2], [RW - 0.02, 4, 0.06, 1.2]]) { S.box(I(wx(u), Y0 + 1.7, wz(v), sx + 0.1, 1.4, sz + 0.3), dark); GL.box(I(wx(u), Y0 + 1.7, wz(v), sx, 1.1, sz), H('#cfe2ff')); }
    // camas
    for (const u of [-3.1, 3.1]) {
      const v = 6.8;
      S.box(I(wx(u), Y0 + 0.2, wz(v), 1.25, 0.4, 2.2), wood); S.box(I(wx(u), Y0 + 0.47, wz(v), 1.1, 0.16, 2.05), H('#e9e2d0'));
      S.box(I(wx(u), Y0 + 0.57, wz(v - 0.35), 1.1, 0.06, 1.25), u < 0 ? H('#3f6fb0') : H('#b04a3a'));
      S.box(I(wx(u), Y0 + 0.62, wz(v + 0.8), 0.8, 0.12, 0.4), H('#f4f0e4')); S.box(I(wx(u), Y0 + 0.55, wz(v + 1.05), 1.3, 0.9, 0.12), dark);
      W.addBox(wx(u) - 0.65, wz(v) - 1.1, wx(u) + 0.65, wz(v) + 1.1, 'hs');
    }
    // mesa, banquinhos, baú, prateleira, tapete, lanterna
    S.box(I(wx(0), Y0 + 0.74, wz(3.4), 1.5, 0.08, 0.9), wood); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) S.box(I(wx(a * 0.62), Y0 + 0.37, wz(3.4 + b * 0.35), 0.09, 0.74, 0.09), dark);
    W.addBox(wx(-0.8), wz(2.9), wx(0.8), wz(3.9), 'hs');
    S.cyl(I(wx(-1.2), Y0, wz(4.4), 0.45, 0.42, 0.45), 8, 0.5, 0.5, wood, true, true); S.cyl(I(wx(1.2), Y0, wz(4.4), 0.45, 0.42, 0.45), 8, 0.5, 0.5, wood, true, true);
    S.box(I(wx(0), Y0 + 0.01, wz(5.2), 3.0, 0.03, 1.8), H('#7a4a3a'));
    S.box(I(wx(-RW + 0.6), Y0 + 0.4, wz(1.6), 0.7, 0.8, 1.0), dark); S.box(I(wx(-RW + 0.6), Y0 + 0.86, wz(1.6), 0.74, 0.1, 1.04), wood); W.addBox(wx(-RW), wz(1.1), wx(-RW + 1), wz(2.1), 'hs');
    S.box(I(wx(RW - 0.45), Y0 + 1.7, wz(1.8), 0.3, 0.06, 1.8), wood); S.box(I(wx(RW - 0.45), Y0 + 1.9, wz(1.8), 0.2, 0.3, 0.2), H('#b0663a'));
    GL.box(I(wx(0), Y0 + RH - 0.6, wz(RD / 2), 0.25, 0.3, 0.25), H('#ffcf70')); S.box(I(wx(0), Y0 + RH - 0.25, wz(RD / 2), 0.05, 0.5, 0.05), dark);
    solid = S.build(); glow = GL.build();
    for (let i = 0; i < 2; i++) { const u = i ? 3.1 : -3.1; Hs.beds.push({ i, x: wx(u), z: wz(6.8), y: Y0, u }); W.objs.push({ id: 'bed' + i, kind: 'bed', bed: i, x: wx(u + (i ? -1.2 : 1.2)), z: wz(6.0), y: Y0, rr: 2.3 }); }
    W.objs.push({ id: 'hexit', kind: 'hexit', x: wx(0), z: wz(1.3), y: Y0, rr: 2.0 });
  }

  const night = () => { const h = G.env.hour; return h >= 20.5 || h < 6; };
  Hs.sleepers = function () {
    if (!Hs.cur) return [];
    const h = G.env.hour, late = h >= 21.5 || h < 5.5; const out = [];
    for (const n of G.npcs.list) if (n.def.home === Hs.cur.ref && (n.inside || late) && night()) out.push(n);
    return out;
  };
  Hs.bedFree = (i) => { const s = Hs.sleepers(); return i >= s.length; };

  function buildDoors() {
    const T = W.towns; let own = null;
    for (let ti = 0; ti < T.length; ti++) {
      const hs = T[ti].homes || [];
      for (let k = 0; k < hs.length; k++) {
        const h = hs[k], x = h.door[0], z = h.door[1], y = gy0(x, z), isOwn = ti === 0 && k === hs.length - 1;
        const o = { id: 'hdoor_' + ti + '_' + k, kind: 'house', x, z, y, rr: 2.5, ref: h.door, own: isOwn, town: ti };
        W.objs.push(o); Hs.doors.push(o); if (isOwn) own = o;
        if (isOwn) { const GL = W.mbGlow(x, z); GL.box(I(x, y + 2.6, z, 0.3, 0.45, 0.3), H('#7affb0')); GL.box(I(x, y + 0.9, z, 0.18, 0.18, 0.18), H('#7affb0')); }
      }
    }
    if (own) for (const d of W.npcDefs) if (d.home === own.ref) { const o2 = Hs.doors.find((q) => !q.own && q.town === own.town); if (o2) d.home = o2.ref; }
    Hs.own = own;
  }

  Hs.enter = function (door) {
    G.ui.fade(() => {
      Hs.active = true; Hs.inside = true; Hs.cur = { ref: door.ref, own: door.own, door }; ret = { x: door.x, z: door.z };
      G.player.teleport(wx(0), wz(1.9), 0); G.cam.yaw = 0; G.cam.fpPitch = 0;
      const n = Hs.sleepers().length;
      G.ui.toast(door.own ? 'Nossa casa' : (n ? 'Os moradores estão dormindo. Fale baixo.' : 'Casa vazia: ninguém por aqui'));
    });
  };
  Hs.exit = function () {
    G.ui.fade(() => {
      Hs.inside = false; const d = Hs.cur && Hs.cur.door; Hs.cur = null;
      const x = (d || ret).x, z = (d || ret).z;
      // sai alguns passos à frente da porta, rumo ao centro do povoado
      const t = W.towns[(d && d.town) || 0], a = Math.atan2(t.x - z * 0 - x, t.z - z);
      G.player.teleport(x + Math.sin(a) * 1.0, z + Math.cos(a) * 1.0, a); G.cam.yaw = a; G.main.save();
    });
  };
  Hs.update = function () {
    const P = G.player; Hs.active = true;
    Hs.inside = inBox(P.x, P.z);
    if (Hs.inside && !Hs.cur) { // salvo dentro da casa: volta para a primeira porta
      const d = Hs.own || Hs.doors[0]; Hs.cur = { ref: d.ref, own: d.own, door: d };
    }
  };
  Hs.light = function () {
    if (!Hs.inside) return;
    const e = gfx.env; e.amb = [0.62, 0.52, 0.42]; e.sunCol = [0.5, 0.4, 0.3]; e.fogCol = [0.08, 0.06, 0.05]; e.fogNear = 12; e.fogFar = 60;
    e.top = e.hor = e.bot = [0.05, 0.04, 0.04]; e.stars = 0;
  };
  Hs.draw = function () {
    const P = G.player; if (!solid || Math.abs(P.x - HX) > 60 || Math.abs(P.z - HZ) > 60) return;
    gfx.draw(solid, null, { outline: 0 }); gfx.draw(glow, null, { emis: 1 });
    if (!Hs.inside) return;
    const sl = Hs.sleepers();
    sl.forEach((n, i) => {
      if (i > 1) return; if (!n.model) n.model = G.npcs.build(n.def);
      const b = Hs.beds[i];
      G.models.draw(n.model, { x: b.x, y: Hs.BED_TOP + 0.2, z: b.z - 0.95, yaw: Math.PI, pitch: -Math.PI / 2, scale: 1 }, { t: n.t, sp: 0 }, { outline: 0.02 });
      G.fx.imm(true, b.x, Hs.BED_TOP + 0.9, b.z - 0.2, 0.5 + 0.12 * Math.sin(performance.now() / 500 + i), 0.7, 0.8, 1, 0.5); // "Zzz"
    });
  };
  Hs.build = function () { buildRoom(); buildDoors(); };
  const sb = G.structs.build;
  G.structs.build = async function (progress, tick) { await sb.call(this, progress, tick); Hs.build(); };
})();
