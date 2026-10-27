// Tira fotos da tela de salas e dos cômodos da pizzaria (uso manual: SHOTS=pasta node tests/shots.js)
const { chromium } = require('playwright'); const D = process.env.SHOTS || '/tmp';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 450 } });
  await p.goto('file://' + __dirname + '/../web/index.html'); await p.waitForFunction('window.__ready', null, { timeout: 240000 });
  await p.keyboard.press('m'); await p.waitForTimeout(600);
  await p.evaluate(() => { G.mp.list = async () => [{ id: 'a', name: 'Turno da Noite', count: 2, max: 8 }, { id: 'b', name: 'Vigias do Mofo', count: 8, max: 8 }]; G.mp.configured = () => true; $ = 0; });
  await p.evaluate(() => document.getElementById('m-multi').click()); await p.waitForTimeout(800);
  await p.screenshot({ path: D + '/salas.png' });
  await p.evaluate(() => { G.mp.create = async () => ({ id: 'x', name: 't' }); G.mp.join = async () => {}; G.mp.send = () => {}; document.getElementById('mp-create').disabled = false; });
  await p.click('#mp-create'); await p.waitForTimeout(3500);
  const at = async (n, x, z, yaw, k) => { await p.evaluate(([a, c, y]) => { G.player.teleport(120 + a, 30 + c, y); G.cam.yaw = y; }, [x, z, yaw]); await p.waitForTimeout(1200); if (k) { await p.keyboard.press(k); await p.waitForTimeout(900); } await p.screenshot({ path: D + '/' + n + '.png' }); };
  await at('porta', 9.4, 43.0, -Math.PI / 2, 'j'); await at('fliperama', 47, 19.5, Math.PI / 2); await at('cinema', 66, 10, Math.PI); await at('garagem', 47, 40, Math.PI / 2); await at('banheiros', 46, 9, 1.0);
  await b.close();
})();
