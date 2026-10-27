'use strict';
/* Capa do Fnaf de IA: imagem de fundo com botões invisíveis (New Game / Continue / Multiplayer) e atalhos de PC. */
(function () {
  const G = window.G, $ = (id) => document.getElementById(id);
  G.fnafOnly = true;
  const ft = $('ft');
  // noites: a 1 já vem liberada; passar uma noite libera a próxima
  G.fnafUnlocked = () => { try { return Math.min(5, parseInt(localStorage.getItem('fda_night'), 10) || 1); } catch (e) { return 1; } };
  G.fnafNight = 1;
  const nb = $('fz-nights');
  const drawNights = () => {
    nb.textContent = ''; const u = G.fnafUnlocked(); if (G.fnafNight > u) G.fnafNight = 1;
    for (let n = 1; n <= 5; n++) { const b = document.createElement('button'); b.type = 'button'; b.disabled = n > u; b.textContent = (n > u ? '🔒 ' : '') + 'NOITE ' + n; b.classList.toggle('on', n === G.fnafNight); b.onclick = () => { G.fnafNight = n; drawNights(); }; nb.appendChild(b); }
  };
  drawNights();
  // a capa aparece sempre que o jogo pede o menu principal
  const um = G.ui.menu;
  G.ui.menu = function (n) { ft.hidden = n !== 'title'; return um.apply(this, arguments); };
  const go = (fn) => () => { if (ft.hidden) return; fn(); };
  const play = (reset) => { try { if (reset) localStorage.setItem('ew_fnafc_n', '1'); } catch (e) { /* sem storage */ } G.ui.menu(null); G.fnaf && G.fnaf.audio.init(); G.fnafc.start(); };
  const nw = go(() => play(true)), ct = go(() => play(false)), mp = go(() => { G.fnafMode = true; drawNights(); $('mp-name').textContent = G.save.settings.name || 'Player 1'; $('m-multi').click(); });
  $('ft-new').onclick = nw; $('ft-cont').onclick = ct; $('ft-mp').onclick = mp;
  const clk = $('fz-clock'); const tick = () => { const d = new Date(); clk.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }; tick(); setInterval(tick, 20000);
  window.addEventListener('keydown', (e) => {
    if (ft.hidden || e.repeat) return; const k = e.key.toLowerCase();
    if (k === 'n' || k === 'enter' || k === '1') nw(); else if (k === 'c' || k === '2') ct(); else if (k === 'm' || k === '3') mp();
  });
})();
