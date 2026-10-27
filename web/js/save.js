'use strict';
/* Elemental World — salvamento local com validação, checksum e backup */
(function () {
  const G = window.G;
  const sv = (G.save = {});
  const KEY = 'ew:save:v1', BAK = 'ew:save:bak', SET = 'ew:settings:v1';
  const ELS = ['fogo', 'agua', 'terra', 'ar'];
  sv.ELS = ELS;
  function sum(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  sv.defaultSettings = () => ({ quality: 1, sound: true, music: true, vib: true, camSens: 1, zoom: 1, joySize: 1, hudScale: 1, btnAlpha: 0.85, mode: 'free', hints: true, ctrl: {}, fovBoost: 0 });
  sv.settings = sv.defaultSettings();
  sv.loadSettings = function () { try { const o = JSON.parse(localStorage.getItem(SET)); if (o && typeof o === 'object') sv.settings = Object.assign(sv.defaultSettings(), o); } catch (e) {} return sv.settings; };
  sv.saveSettings = function () { try { localStorage.setItem(SET, JSON.stringify(sv.settings)); } catch (e) {} };

  sv.fresh = function () {
    return {
      v: 1, created: Date.now(), updated: Date.now(), name: 'Viajante', look: { skin: '#e0b088', hair: '#2a1c14', hs: 0, c1: null, c2: null },
      roulette: { done: false, result: null, roll: null }, element: null, origin: null, unlocked: [], active: null,
      lvl: 1, xp: 0, pts: 0, skills: {}, hp: null, chi: null, water: 60, pos: { x: 0, z: 0, yaw: 0 }, hour: 8.5,
      inv: { coins: 0, herb: 3, ember: 0, shard: 0 }, quests: {}, flags: { masters: {}, chests: {}, shrines: {}, tut: {}, npcTalk: {} }, stats: { kills: 0, time: 0, deaths: 0 },
      avatarUnlocked: false, checkpoint: null,
    };
  };
  function valid(o) {
    if (!o || o.v !== 1 || !o.roulette || typeof o.lvl !== 'number' || !o.pos || !o.inv) return false;
    if (o.roulette.done && !(o.element === 'avatar' || ELS.includes(o.element))) return false;
    if (o.lvl < 1 || o.lvl > 99 || !isFinite(o.pos.x) || !isFinite(o.pos.z)) return false;
    return true;
  }
  function parse(raw) {
    if (!raw) return null;
    try { const w = JSON.parse(raw); if (!w || !w.d) return null; if (sum(w.d) !== w.s) return null; const o = JSON.parse(w.d); return valid(o) ? o : null; } catch (e) { return null; }
  }
  sv.corrupt = false;
  sv.load = function () {
    let o = null;
    try { o = parse(localStorage.getItem(KEY)); if (!o) { const had = !!localStorage.getItem(KEY); o = parse(localStorage.getItem(BAK)); if (o) sv.corrupt = true; else if (had) sv.corrupt = true; } } catch (e) {}
    if (o) { o = Object.assign(sv.fresh(), o); o.flags = Object.assign({ masters: {}, chests: {}, shrines: {}, tut: {}, npcTalk: {} }, o.flags); o.inv = Object.assign({ coins: 0, herb: 0, ember: 0, shard: 0 }, o.inv); }
    return o;
  };
  sv.write = function (S) {
    if (!S) return false;
    try {
      S.updated = Date.now();
      const d = JSON.stringify(S), w = JSON.stringify({ d, s: sum(d) });
      const old = localStorage.getItem(KEY); if (old && parse(old)) localStorage.setItem(BAK, old);
      localStorage.setItem(KEY, w);
      return true;
    } catch (e) { return false; }
  };
  sv.exists = function () { try { return !!localStorage.getItem(KEY) || !!localStorage.getItem(BAK); } catch (e) { return false; } };
  sv.wipe = function () { try { localStorage.removeItem(KEY); localStorage.removeItem(BAK); } catch (e) {} };
})();
