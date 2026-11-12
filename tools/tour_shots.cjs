// node tools/tour_shots.cjs <outDir> [ids...]  — screenshot the start view and each landmark showcase
const { chromium } = require('playwright');
(async () => {
  const [out, ...ids] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  await p.goto((process.env.BASE || 'http://localhost:4173') + '/?q=medium&nointro');
  await p.waitForFunction(() => window.__app, null, { timeout: 180000 });
  const frames = (n) => p.evaluate((n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  await frames(3);
  await p.screenshot({ path: `${out}/t-start.png` });
  for (const id of ids) {
    await p.evaluate((id) => { const A = window.__app; const poi = A.pois.find((q) => q.id === id); if (!poi) return;
      A.rider.teleport(Math.max(5, poi.s - 40), 1); A.visit(poi); A.rig.blend = 1; }, id);
    await frames(3);
    await p.screenshot({ path: `${out}/t-${id}.png` });
  }
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
