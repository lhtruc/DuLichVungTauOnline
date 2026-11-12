// Screenshot helper: node tools/shot.cjs <out.png> "<query>" [evalJs]
const { chromium } = require('playwright');
(async () => {
  const [out, query = '', js = ''] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[' + m.type() + ']', m.text().slice(0, 400)); });
  p.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await p.goto('http://localhost:4173/?nointro&q=medium&' + query);
  await p.waitForFunction(() => window.__app, null, { timeout: 120000 });
  if (js) await p.evaluate(js);
  await p.waitForTimeout(4000);
  await p.screenshot({ path: out });
  await b.close();
})();
