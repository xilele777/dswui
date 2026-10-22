import { chromium } from 'playwright-core';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const exe = path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1234/chrome-win64/chrome.exe');
const base = pathToFileURL(path.resolve('dist/index.html')).href;
const out = path.resolve('docs/local-probe');
const browser = await chromium.launch({ executablePath: exe, headless: true });
const context = await browser.newContext({ viewport: { width: 1200, height: 820 }, deviceScaleFactor: 2, locale: 'zh-CN' });
const page = await context.newPage();
await page.goto(`${base}?demo=1&theme=light`, { waitUntil: 'load' });
await page.waitForTimeout(350);

// 多选态
await page.locator('.session-batch-entry').click();
await page.waitForTimeout(200);
await page.locator('.session-item').first().click();
await page.waitForTimeout(150);
await page.screenshot({ path: path.join(out, 'multi-select.png'), clip: { x: 0, y: 0, width: 280, height: 340 } });

const multi = await page.evaluate(() => {
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
  };
  return {
    bar: box('.session-batch-bar'),
    firstItem: box('.session-item'),
    check: box('.session-check'),
    text: document.querySelector('.session-batch-bar .count')?.textContent,
  };
});
console.log('multi', JSON.stringify(multi));
await page.getByRole('button', { name: '完成' }).click();
await page.waitForTimeout(150);

// 标题点击进入重命名
await page.locator('.conversation-title').click();
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(out, 'title-edit.png'), clip: { x: 280, y: 0, width: 640, height: 70 } });
const title = await page.evaluate(() => {
  const el = document.querySelector('.conversation-title-input');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], border: getComputedStyle(el).borderColor };
});
console.log('title', JSON.stringify(title));

await browser.close();
