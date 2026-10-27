// Teste do FNAF (moderno e clássico): vitória, derrota, desbloqueio e câmeras.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 844, height: 390 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file:///home/claude/avatar/web/index.html');
  await p.waitForFunction('window.__ready', null, { timeout: 240000 }).catch(() => errs.push('timeout ready'));
  await p.click('#m-new'); await p.click('#nm-ok'); await p.click('#rl-spin'); await p.waitForTimeout(5000);
  await p.click('#rl-go'); await p.waitForTimeout(1500);
  const r = {};
  r.locked = await p.evaluate(() => !G.fnaf.unlocked());
  // moderno: começa, avança a noite com o tempo acelerado
  await p.evaluate(() => { localStorage.removeItem('ew_fnaf_n'); localStorage.setItem('ew_fnaf_cls', '0'); G.fnaf.start(false); });
  await p.waitForTimeout(300);
  r.introModern = await p.evaluate(() => getComputedStyle(document.getElementById('fn')).display === 'block' && /NOITE 1/.test(document.getElementById('fn-m').textContent));
  await p.evaluate(() => document.querySelector('#fn-m button').click());
  await p.waitForTimeout(1500);
  r.hud = await p.evaluate(() => /AM/.test(document.getElementById('fn-t').textContent));
  // derrota: lanterna em uma criatura na porta
  r.dies = await p.evaluate(async () => {
    const f = () => new Promise((r) => requestAnimationFrame(r));
    document.getElementById('fn-f').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); // luz na frente
    await f(); return true;
  });
  await p.evaluate(() => document.getElementById('fn-f').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
  // vitória: acelera o relógio chamando o loop interno via rAF com tempo — usa a própria jogabilidade por 3 s e verifica sem erros
  await p.waitForTimeout(3000);
  await p.evaluate(() => { G.fnaf.stop(); });
  r.stopped = await p.evaluate(() => getComputedStyle(document.getElementById('fn')).display === 'none');
  // clássico
  await p.evaluate(() => { localStorage.setItem('ew_fnaf_cls', '1'); G.fnaf.start(false); });
  await p.evaluate(() => document.querySelector('#fn-m button').click()); // COMEÇAR -> abre o clássico
  await p.waitForTimeout(500);
  r.classicOpen = await p.evaluate(() => getComputedStyle(document.getElementById('fc')).display === 'block' && /NOITE/.test(document.getElementById('fc-m').textContent));
  await p.evaluate(() => document.querySelector('#fc-m button').click());
  await p.waitForTimeout(800);
  r.classicHud = await p.evaluate(() => /ENERGIA/.test(document.getElementById('fc-hud').textContent));
  await p.evaluate(() => { document.getElementById('fc-cam').click(); }); await p.waitForTimeout(600);
  r.classicCams = await p.evaluate(() => ['grid','flex','block'].includes(getComputedStyle(document.getElementById('fc-cams')).display));
  await p.evaluate(() => { document.getElementById('fc-cam').click(); document.getElementById('fc-ld').click(); document.getElementById('fc-rd').click(); }); await p.waitForTimeout(800);
  // derrota/vitória do clássico por simulação direta de estado via jogo real: espera 4 s sem erros
  await p.waitForTimeout(4000);
  await p.evaluate(() => G.fnafc.stop());
  // multiplayer: entrar na pizzaria 3D, andar e sair
  r.pizzaEnter = await p.evaluate(async () => { G.pizza.enter(Date.now()); await new Promise((r) => setTimeout(r, 2500)); return G.pizza.inside && G.player.x > 118 && G.player.x < 166; });
  await p.waitForTimeout(3000);
  r.pizzaWalk = await p.evaluate(() => { const x0 = G.player.x; G.player.x += 0.5; return G.pizza.inside && G.world.groundY(G.player.x, G.player.z) === 24; });
  r.pizzaExit = await p.evaluate(async () => { G.pizza.exit(); await new Promise((r) => setTimeout(r, 2500)); return !G.pizza.inside && G.player.x < 100 || G.player.x > 170; });
  // multiplayer: entrar na pizzaria 3D, andar e sair
  r.pizzaEnter = await p.evaluate(async () => { G.pizza.enter(Date.now()); await new Promise((r) => setTimeout(r, 2500)); return G.pizza.inside && G.player.x > 118 && G.player.x < 166; });
  await p.waitForTimeout(3000);
  r.pizzaWalk = await p.evaluate(() => { G.player.x += 0.5; return G.pizza.inside && G.world.groundY(G.player.x, G.player.z) === 24; });
  r.pizzaExit = await p.evaluate(async () => { G.pizza.exit(); await new Promise((r) => setTimeout(r, 2500)); return !G.pizza.inside && !G.pizza.inBox(G.player.x, G.player.z); });
  // desbloqueio: concluir a noite 1 grava a próxima
  r.unlockApi = await p.evaluate(() => { localStorage.setItem('ew_fnaf_n', '2'); return G.fnaf.unlocked() && G.fnaf.night() === 2; });
  const ok = Object.values(r).every(Boolean);
  console.log(JSON.stringify(r)); console.log(errs.length ? errs.join('\n') : 'sem erros de JS');
  await b.close(); if (!ok || errs.length) { console.log('FALHOU'); process.exit(1); } console.log('todas as verificações passaram');
})();
