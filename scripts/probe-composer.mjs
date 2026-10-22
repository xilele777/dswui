import { chromium } from 'playwright-core';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const exe = path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1234/chrome-win64/chrome.exe');
const base = pathToFileURL(path.resolve('dist/index.html')).href;
const out = path.resolve('docs/local-probe');
const browser = await chromium.launch({ executablePath: exe, headless: true });

for (const theme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 820 }, deviceScaleFactor: 2, locale: 'zh-CN' });
  const page = await context.newPage();
  await page.goto(`${base}?theme=${theme}`, { waitUntil: 'load' });
  await page.waitForTimeout(350);

  await page.locator('.composer textarea').click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, `composer-focus-${theme}.png`), clip: { x: 280, y: 320, width: 760, height: 150 } });

  const m = await page.evaluate(() => {
    const cs = (sel, props) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const s = getComputedStyle(el);
      const out = {};
      for (const p of props) out[p] = s.getPropertyValue(p);
      const r = el.getBoundingClientRect();
      out.box = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
      return out;
    };
    return {
      composer: cs('.composer', ['border-color', 'box-shadow', 'border-radius']),
      textarea: cs('.composer textarea', ['padding', 'line-height', 'font-size']),
      pill: cs('.pill', ['border', 'background-color', 'padding', 'height', 'font-size', 'border-radius']),
      send: cs('.send-btn', ['background-color', 'border-radius']),
    };
  });
  console.log(theme, JSON.stringify(m));
  await context.close();
}
await browser.close();

