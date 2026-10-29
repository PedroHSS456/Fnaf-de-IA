// Trava do mouse (Shift): liga, gira a câmera com o movimento do mouse e solta ao abrir menu.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 480, height: 270 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + __dirname + '/../web/index.html'); await p.waitForFunction('window.__ready', null, { timeout: 240000 });
  await p.keyboard.press('m'); await p.waitForTimeout(400);
  await p.evaluate(() => { G.mp.create = async (n) => ({ id: 'x', name: n }); G.mp.join = async () => {}; G.mp.send = () => {}; });
  await p.click('#mp-create'); await p.waitForTimeout(3500);
  const r = {};
  await p.evaluate(() => { const cv = document.getElementById('cv'); window.__lock = 0; cv.requestPointerLock = () => { window.__lock++; Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => cv }); document.dispatchEvent(new Event('pointerlockchange')); }; document.exitPointerLock = () => { window.__lock--; Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => null }); document.dispatchEvent(new Event('pointerlockchange')); }; });
  await p.keyboard.press('Shift'); await p.waitForTimeout(200);
  r.travou = await p.evaluate(() => window.__lock === 1 && getComputedStyle(document.getElementById('ml-tag')).display === 'block');
  const y0 = await p.evaluate(() => G.cam.yaw);
  await p.evaluate(() => window.dispatchEvent(new MouseEvent('mousemove', { movementX: 120, movementY: 0 }))); await p.waitForTimeout(600);
  const y1 = await p.evaluate(() => G.cam.yaw); r.giraDireita = y1 < y0 - 0.1; r.dy = +(y1 - y0).toFixed(2);
  await p.keyboard.press('Shift'); await p.waitForTimeout(200); r.soltou = await p.evaluate(() => window.__lock === 0);
  await p.keyboard.press('Shift'); await p.waitForTimeout(200); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  r.menuSolta = await p.evaluate(() => window.__lock === 0);
  console.log(JSON.stringify(r), 'erros:', errs.length ? errs : 'nenhum'); await b.close();
})();
