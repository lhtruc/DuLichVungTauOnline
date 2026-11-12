// Smoke test: node tools/e2e.cjs [outDir]
// Needs `npm run preview` (port 4173) and a global/local playwright. Fails on any console error / page error.
const { chromium } = require('playwright');
const fs = require('fs');

const OUT = process.argv[2] || '/tmp';
const errors = [];
const log = (...a) => console.log(...a);
let step = 0;
const check = (ok, msg) => { log(ok ? '  ok  ' : ' FAIL ', msg); if (!ok) errors.push('check: ' + msg); };

(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 800, height: 450 }, acceptDownloads: true });
  const p = await ctx.newPage();
  p.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error') errors.push('console.error: ' + t.slice(0, 300));
    else if (m.type() === 'warning' && !/toNonIndexed|THREE\.Clock|GPU stall|ReadPixels/.test(t)) log('  warn', t.slice(0, 160));
  });
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  p.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url()));
  p.on('response', (r) => { if (r.status() >= 400) errors.push('http ' + r.status() + ' ' + r.url()); });

  const shot = async (name) => { await p.screenshot({ path: `${OUT}/${name}.png` }); };
  const app = (fn) => p.evaluate(fn);
  // software GL runs at a few FPS, so wait on conditions instead of fixed sleeps
  const until = (fn, t = 30000) => p.waitForFunction(fn, null, { timeout: t }).then(() => true, () => false);

  log('1. load + intro');
  await p.goto((process.env.BASE || 'http://localhost:4173') + '/?q=low&s=900');
  await p.waitForFunction(() => window.__app, null, { timeout: 120000 });
  check(await p.$eval('#start', (e) => !e.disabled), 'Start button enabled after load');
  await p.click('#start');
  await p.waitForTimeout(1200);
  check(await app(() => !document.querySelector('#hud').hidden), 'HUD visible after start');
  check(await app(() => window.__app.sound.enabled), 'sound engine initialised on start');
  check(await app(() => window.__app.route.sections[window.__app.route.sectionIndex(window.__app.rider.s)].name === 'Thùy Vân'), 'tour starts on Thùy Vân (Bãi Sau)');
  await shot('e2e-1-start');

  log('2. drive with keyboard');
  const s0 = await app(() => window.__app.rider.s);
  await p.keyboard.down('KeyW');
  const moved = await p.waitForFunction((from) => window.__app.rider.s > from + 8, s0, { timeout: 60000 }).then(() => true, () => false);
  await p.keyboard.up('KeyW');
  const s1 = await app(() => window.__app.rider.s);
  check(moved, `W moves forward (${s0.toFixed(1)} -> ${s1.toFixed(1)} m)`);
  const lat0 = await app(() => window.__app.rider.lat);
  await p.keyboard.down('KeyD');
  const steered = await p.waitForFunction((l) => window.__app.rider.lat > l + 0.2 || window.__app.rider.lat > 5, lat0, { timeout: 20000 }).then(() => true, () => false);
  await p.keyboard.up('KeyD');
  check(steered, 'D steers sideways');
  await p.keyboard.press('KeyH');
  await p.keyboard.press('KeyR');
  check(await until(() => window.__app.rider.dir === -1, 15000), 'R turns around');
  await p.keyboard.press('KeyR');
  await until(() => window.__app.rider.dir === 1, 15000);

  log('3. minimap click teleports');
  const box = await (await p.$('#minimap')).boundingBox();
  check(!!box && box.width > 50, `minimap present (${box && Math.round(box.width)}x${box && Math.round(box.height)})`);
  const before = await app(() => window.__app.rider.s);
  await p.mouse.click(box.x + box.width * 0.46, box.y + box.height * 0.55);
  await until((b) => Math.abs(window.__app.rider.s - b) > 50, 15000);
  await p.waitForTimeout(400);
  const after = await app(() => window.__app.rider.s);
  check(Math.abs(after - before) > 50, `minimap click moved rider (${before.toFixed(0)} -> ${after.toFixed(0)})`);

  log('4. progress bar click');
  const bar = await (await p.$('#bar')).boundingBox();
  await p.mouse.click(bar.x + bar.width * 0.8, bar.y + bar.height / 2);
  await until(() => window.__app.rider.s / window.__app.route.length > 0.7, 15000);
  const f = await app(() => window.__app.rider.s / window.__app.route.length);
  check(f > 0.7 && f < 0.9, `bar click jumps to ~80% (got ${(f * 100).toFixed(0)}%)`);

  log('5. points of interest');
  await p.click('[data-act=stops]');
  check(await app(() => !document.querySelector('#stops').hidden), 'stops list opens');
  await p.click('#stops [data-i="9"]');
  check(await until(() => Math.abs(window.__app.rider.s - (window.__app.pois[9].s - 60)) < 3 && !document.querySelector('#fade').classList.contains('on'), 20000), 'stop click teleports with fade');
  check(await app(() => window.__app.rig.mode === 'chase' && window.__app.rig.blend === 1), 'camera snapped behind rider (no swoop)');
  await app(() => window.__app.visit(window.__app.pois[9]));
  await p.waitForTimeout(2500);
  check(await app(() => !document.querySelector('#card').hidden), 'POI card shown');
  check(await app(() => document.querySelector('#minimap').style.opacity === '0'), 'minimap hides during visit');
  await shot('e2e-5-poi');
  await p.click('#tts'); await p.waitForTimeout(300); await p.click('#tts');
  await p.click('#leave');
  await p.waitForTimeout(800);
  check(await app(() => document.querySelector('#card').hidden && window.__app.rig.mode === 'chase'), 'leave returns to chase cam');

  log('6. time of day / sound / photo / fly');
  for (let i = 0; i < 2; i++) await p.click('[data-act=time]');   // 16:36 -> 17:33 -> 20:30
  await p.waitForTimeout(1500);
  check(/🌙/.test(await p.$eval('#clock-badge', (e) => e.textContent)), 'clock badge shows night (20:30)');
  await shot('e2e-6-night');
  await p.click('[data-act=sound]'); await p.click('[data-act=sound]');
  const dl = p.waitForEvent('download', { timeout: 20000 }).catch(() => null);
  await p.keyboard.press('KeyP');
  const d = await dl;
  check(!!d, 'photo mode downloads a PNG' + (d ? ' (' + d.suggestedFilename() + ')' : ''));
  await p.click('[data-act=fly]'); await p.waitForTimeout(1500);
  await shot('e2e-6-fly');
  await p.click('[data-act=fly]');

  log('7. street view link');
  const href = await p.$eval('#sv', (e) => { e.dispatchEvent(new Event('pointerdown')); return e.href; });
  check(/viewpoint=10\.\d+,107\.\d+&heading=/.test(href), 'Street View link has live lat/lon/heading: ' + href.slice(0, 120));

  log('8. traffic + boats');
  const info = await app(() => {
    const g = window.__app.scene.getObjectByName('coastal-life');
    return g ? { children: g.children.length } : null;
  });
  check(!!info && info.children > 5, 'coastal-life group present: ' + JSON.stringify(info));

  await b.close();
  log('\n' + (errors.length ? 'ERRORS (' + errors.length + '):\n' + [...new Set(errors)].join('\n') : 'ALL GOOD'));
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error('script crashed', e); process.exit(2); });
