'use strict';
/* Elemental World — ciclo dia/noite, céu e clima */
(function () {
  const G = window.G; const M = G.M; const gfx = G.gfx;
  const env = (G.env = { hour: 9, night: 0, day: 1, weather: { type: null, intensity: 0 }, rainT: 0, rainLeft: 0, dayLen: 540 });
  /* chaves por hora: top, horizonte, ambiente, sol, neblina */
  const K = [
    [0, '#070b1e', '#121c3a', [0.16, 0.19, 0.34], [0.2, 0.25, 0.45], '#0c1430'],
    [5, '#0d1430', '#2a3158', [0.2, 0.22, 0.38], [0.25, 0.28, 0.45], '#1a2145'],
    [6.5, '#3a5a9a', '#f2a27a', [0.5, 0.45, 0.5], [1.0, 0.65, 0.45], '#e0a888'],
    [8.5, '#3f78d0', '#a9cdee', [0.6, 0.62, 0.68], [1.0, 0.93, 0.8], '#b4d2ea'],
    [12, '#3a78e0', '#b8d8f4', [0.66, 0.68, 0.74], [1.0, 0.97, 0.9], '#bdd9f0'],
    [16.5, '#3f78d0', '#b5cde8', [0.62, 0.62, 0.68], [1.0, 0.92, 0.78], '#b8cde4'],
    [18.2, '#4a4a8a', '#f08a5a', [0.5, 0.42, 0.5], [1.0, 0.55, 0.3], '#d89a7a'],
    [19.8, '#141c44', '#4a3a62', [0.25, 0.26, 0.4], [0.3, 0.3, 0.5], '#2a2a50'],
    [24, '#070b1e', '#121c3a', [0.16, 0.19, 0.34], [0.2, 0.25, 0.45], '#0c1430'],
  ].map((k) => ({ h: k[0], top: M.hex(k[1]), hor: M.hex(k[2]), amb: k[3], sun: k[4], fog: M.hex(k[5]) }));
  const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  env.setHour = (h) => { env.hour = ((h % 24) + 24) % 24; };
  const REGW = {};
  env.update = function (dt, px, pz) {
    env.hour = (env.hour + (dt * 24) / env.dayLen) % 24;
    const h = env.hour;
    let i = 0; while (i < K.length - 2 && h >= K[i + 1].h) i++;
    const a = K[i], b = K[i + 1], t = M.clamp((h - a.h) / (b.h - a.h), 0, 1);
    const top = mix3(a.top, b.top, t), hor = mix3(a.hor, b.hor, t), amb = mix3(a.amb, b.amb, t), sun = mix3(a.sun, b.sun, t), fog = mix3(a.fog, b.fog, t);
    // altura do sol: nasce às 6, põe às 18
    const ang = ((h - 6) / 12) * Math.PI, el = Math.sin(ang);
    env.day = M.clamp(el * 3 + 0.2, 0, 1);
    env.night = 1 - M.clamp(el * 4 + 0.6, 0, 1);
    let sd = [Math.cos(ang) * 0.75, el, 0.45];
    const trueSun = sd.slice();
    if (el < 0.02) sd = [-sd[0], -el + 0.15, -sd[2]]; // luz da lua
    const l = Math.hypot(sd[0], sd[1], sd[2]); sd = [sd[0] / l, sd[1] / l, sd[2] / l];
    // clima por região
    const w = M.clamp(M.sstep(0, 1, 0), 0, 1); void w;
    G.world.regionW(px, pz, REGW);
    env.regW = REGW;
    updateWeather(dt, REGW);
    const e = gfx.env, wi = env.weather.intensity, rain = env.weather.type === 'rain' ? wi : 0;
    const gray = [0.55, 0.58, 0.62];
    e.top = mix3(top, M.shade(gray, 0.5 + 0.4 * env.day), rain * 0.7);
    e.hor = mix3(hor, M.shade(gray, 0.6 + 0.4 * env.day), rain * 0.7);
    e.bot = M.shade(hor, 0.7);
    e.fogCol = mix3(fog, M.shade(gray, 0.6 + 0.3 * env.day), rain * 0.7);
    e.amb = M.shade(amb, 1 - rain * 0.25);
    e.sunCol = M.shade(sun, (1 - rain * 0.6) * (el > 0.02 ? 1 : 0.35));
    e.sunDir = sd; e.stars = M.clamp(env.night * 1.2 - rain, 0, 1); e.cloud = mix3([1, 1, 1], M.shade(gray, 0.7), rain);
    e.time += dt;
    e.fogNear = 80 - rain * 35 - (REGW.agua > 0.5 ? 10 : 0); e.fogFar = (250 - rain * 90) * (gfx.drawScale || 1);
    e.sunTrue = trueSun;
  };
  function updateWeather(dt, rw) {
    const wt = env.weather;
    // região manda: gelo=neve, brasa=cinzas, picos=folhas/vento
    let want = null, wi = 0;
    if (rw.agua > 0.45) { want = 'snow'; wi = 0.55 + 0.4 * M.noise2(env.hour * 0.5, 3, 9); }
    else if (rw.fogo > 0.5) { want = 'ash'; wi = 0.6; }
    else if (rw.ar > 0.5) { want = 'leaves'; wi = 0.5; }
    // chuva ocasional em campo/mesetas
    env.rainT -= dt;
    if (env.rainLeft > 0) env.rainLeft -= dt;
    else if (env.rainT <= 0) { env.rainT = M.rnd(90, 240); if (Math.random() < 0.45) env.rainLeft = M.rnd(40, 90); }
    if (!want && env.rainLeft > 0 && (rw.hub + rw.terra) > 0.5) { want = 'rain'; wi = 0.85; }
    if (env.force) { want = env.force; wi = 0.9; }
    if (want !== wt.type) { wt.intensity = Math.max(0, wt.intensity - dt * 0.6); if (wt.intensity <= 0.02) { wt.type = want; } }
    else wt.intensity = M.damp(wt.intensity, wi, 0.8, dt);
    if (!wt.type && want) wt.type = want;
  }
  env.isRaining = () => env.weather.type === 'rain' && env.weather.intensity > 0.3;
  env.timeStr = () => { const h = Math.floor(env.hour), m = Math.floor((env.hour - h) * 60); return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; };
})();
