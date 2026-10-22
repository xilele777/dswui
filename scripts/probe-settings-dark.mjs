import { chromium } from 'playwright-core';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const exe = path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1234/chrome-win64/chrome.exe');
const base = pathToFileURL(path.resolve('dist/index.html')).href;
const out = path.resolve('docs/local-probe');
const browser = await chromium.launch({ executablePath: exe, headless: true });
const context = await browser.newContext({ viewport: { width: 1200, height: 820 }, deviceScaleFactor: 2, locale: 'zh-CN' });
const page = await context.newPage();
await page.goto(`${base}?demo=1&theme=dark`, { waitUntil: 'load' });
await page.waitForTimeout(350);
await page.locator('.sidebar-foot .icon-btn').click();
await page.getByRole('button', { name: '系统设置' }).click();
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(out, 'settings-dark.png') });
const m = await page.evaluate(() => {
  const cs = (sel, props) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const s = getComputedStyle(el);
    const o = {};
    for (const p of props) o[p] = s.getPropertyValue(p);
    return o;
  };
  return {
    dialog: cs('.settings-dialog', ['background-color', 'border-radius']),
    navOn: cs('.settings-nav button.on', ['background-color', 'color']),
    segOn: cs('.seg button.on', ['background-color', 'color', 'box-shadow']),
  };
});
console.log(JSON.stringify(m));
await browser.close();
