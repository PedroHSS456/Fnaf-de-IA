'use strict';
/* Elemental World — áudio procedural original (sem arquivos): efeitos e música ambiente gerada */
(function () {
  const G = window.G; const M = G.M;
  const A = (G.audio = {});
  let ctx = null, master = null, noiseBuf = null, voices = 0;
  const last = {};
  A.unlock = function () {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) {}
  };
  const on = () => ctx && G.save.settings.sound && ctx.state === 'running';
  function tone(f0, f1, dur, type, vol, delay) {
    if (voices > 12) return; const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02); voices++; o.onended = () => voices--;
  }
  function noise(dur, f0, f1, q, vol, type, delay) {
    if (voices > 12) return; const t = ctx.currentTime + (delay || 0);
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.Q.value = q || 1; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.02); voices++; s.onended = () => voices--;
  }
  const SFX = {
    oink: () => { tone(210, 130, 0.14, 'sawtooth', 0.1); tone(150, 190, 0.12, 'sawtooth', 0.09, 0.16); noise(0.12, 900, 500, 3, 0.05, 'bandpass', 0.02); },
    squeal: () => { tone(900, 1500, 0.22, 'sawtooth', 0.09); tone(1400, 800, 0.26, 'square', 0.05, 0.1); },
    moo: () => { tone(120, 100, 0.95, 'sawtooth', 0.11); tone(240, 190, 0.9, 'triangle', 0.05); tone(95, 130, 0.5, 'sine', 0.06, 0.35); },
    moo2: () => { tone(160, 90, 0.7, 'sawtooth', 0.12); tone(320, 170, 0.65, 'triangle', 0.05); },
    sizzle: () => { noise(0.8, 5000, 3000, 0.6, 0.12, 'highpass'); },
    cast_fogo: () => { noise(0.35, 900, 300, 0.8, 0.25, 'bandpass'); tone(220, 120, 0.25, 'sawtooth', 0.05); },
    cast_agua: () => { noise(0.3, 600, 1800, 2, 0.18); tone(500, 800, 0.2, 'sine', 0.06); },
    cast_terra: () => { tone(90, 50, 0.3, 'square', 0.12); noise(0.25, 300, 120, 1, 0.2, 'lowpass'); },
    cast_ar: () => { noise(0.4, 2400, 700, 1.5, 0.16, 'bandpass'); },
    hit_fogo: () => noise(0.18, 1200, 300, 1, 0.16), hit_agua: () => noise(0.16, 1400, 600, 2, 0.14), hit_terra: () => tone(120, 60, 0.15, 'square', 0.12), hit_ar: () => noise(0.12, 2000, 900, 1, 0.1), hit_neutro: () => noise(0.1, 800, 300, 1, 0.1),
    swing: () => noise(0.12, 1800, 700, 1.2, 0.09, 'bandpass'), hit_phys: () => { tone(140, 60, 0.12, 'square', 0.12); noise(0.08, 700, 250, 1, 0.14); }, hit_big: () => { tone(100, 40, 0.2, 'square', 0.18); noise(0.14, 600, 150, 1, 0.2, 'lowpass'); },
    hit_enemy: () => { tone(160, 70, 0.14, 'square', 0.14); noise(0.1, 900, 300, 1, 0.12); },
    boom_fogo: () => { noise(0.6, 700, 90, 0.7, 0.35, 'lowpass'); tone(110, 40, 0.5, 'sawtooth', 0.14); },
    boom_agua: () => { noise(0.5, 1800, 300, 1, 0.26, 'bandpass'); tone(300, 90, 0.3, 'sine', 0.1); },
    boom_terra: () => { noise(0.6, 300, 60, 0.7, 0.4, 'lowpass'); tone(70, 35, 0.5, 'square', 0.16); },
    boom_ar: () => { noise(0.5, 2600, 400, 1, 0.24, 'bandpass'); },
    hurt: () => { tone(180, 80, 0.2, 'sawtooth', 0.14); }, dash: () => noise(0.18, 1600, 500, 1, 0.12), jump: () => tone(300, 520, 0.12, 'sine', 0.07),
    level: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.3, 'triangle', 0.1, i * 0.09)); },
    avatar: () => { [220, 330, 440, 660, 880].forEach((f, i) => tone(f, f * 1.01, 0.8, 'sine', 0.1, i * 0.06)); noise(0.9, 500, 3000, 1, 0.12); },
    combo: () => { tone(440, 880, 0.3, 'triangle', 0.1); tone(660, 1320, 0.3, 'triangle', 0.08, 0.1); },
    die: () => { tone(260, 60, 0.4, 'sawtooth', 0.1); }, boss: () => { tone(80, 55, 1.2, 'sawtooth', 0.2); noise(1.0, 400, 80, 1, 0.2, 'lowpass'); },
    break: () => { noise(0.25, 1200, 300, 1, 0.2); tone(180, 90, 0.15, 'square', 0.08); }, ice: () => { noise(0.3, 4000, 1500, 3, 0.16); tone(1400, 900, 0.2, 'triangle', 0.05); }, rock: () => { noise(0.4, 250, 80, 0.8, 0.3, 'lowpass'); },
    flame: () => noise(0.22, 700, 400, 0.6, 0.1), wind: () => noise(0.2, 1800, 900, 1, 0.07), shoot: () => tone(600, 300, 0.12, 'triangle', 0.07),
    parry: () => { tone(1200, 1800, 0.15, 'triangle', 0.14); tone(800, 800, 0.2, 'sine', 0.08); }, block: () => { tone(300, 200, 0.1, 'square', 0.1); },
    ui: () => tone(700, 900, 0.06, 'sine', 0.05), pick: () => { tone(880, 1320, 0.1, 'sine', 0.06); }, quest: () => { [392, 523, 659].forEach((f, i) => tone(f, f, 0.25, 'triangle', 0.09, i * 0.1)); },
    roulette: () => tone(900 + Math.random() * 200, 700, 0.04, 'square', 0.04), win: () => { [392, 494, 587, 784, 988].forEach((f, i) => tone(f, f, 0.5, 'triangle', 0.1, i * 0.12)); },
  };
  A.sfxAt = function (n, x, z) { const P = G.player; if (P && Math.hypot(x - P.x, z - P.z) < 30) A.sfx(n); };
  A.sfx = function (n) {
    if (!on()) return; const now = performance.now(); if (last[n] && now - last[n] < 45) return; last[n] = now;
    const f = SFX[n]; if (f) try { f(); } catch (e) {}
  };
  A.vibrate = function (ms) {
    if (!G.save.settings.vib) return;
    try { if (window.AndroidBridge && window.AndroidBridge.vibrar) window.AndroidBridge.vibrar(ms); else if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
  };
  /* música ambiente: pad lento com notas pentatônicas (original, procedural) */
  const SC = { hub: [0, 2, 4, 7, 9], agua: [0, 3, 5, 7, 10], fogo: [0, 1, 4, 5, 8], terra: [0, 2, 5, 7, 9], ar: [0, 2, 4, 7, 11] };
  const ROOT = { hub: 196, agua: 174.6, fogo: 146.8, terra: 164.8, ar: 220 };
  let mT = 0, step = 0;
  A.music = function (dt, reg, night, combat) {
    if (!on() || !G.save.settings.music) return;
    mT -= dt; if (mT > 0) return;
    mT = combat ? 0.45 : 1.6 + Math.random() * 1.4; step++;
    const sc = SC[reg] || SC.hub, root = (ROOT[reg] || 196) * (night > 0.5 ? 0.75 : 1);
    const n = sc[Math.floor(Math.random() * sc.length)] + (Math.random() < 0.3 ? 12 : 0), f = root * Math.pow(2, n / 12);
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = combat ? 'triangle' : 'sine'; o.frequency.value = f;
    const dur = combat ? 0.5 : 3.2; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(combat ? 0.04 : 0.03, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    if (step % 4 === 0) { const o2 = ctx.createOscillator(), g2 = ctx.createGain(); o2.type = 'sine'; o2.frequency.value = root / 2; g2.gain.setValueAtTime(0.0001, t); g2.gain.linearRampToValueAtTime(0.035, t + 1.5); g2.gain.exponentialRampToValueAtTime(0.0001, t + 5); o2.connect(g2); g2.connect(master); o2.start(t); o2.stop(t + 5.1); }
  };
})();
