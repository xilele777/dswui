import { chromium } from 'playwright-core';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const exe = path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1234/chrome-win64/chrome.exe');
const base = pathToFileURL(path.resolve('dist/index.html')).href;
const out = path.resolve('docs/local-probe');
const browser = await chromium.launch({ executablePath: exe, headless: true });
const context = await browser.newContext({
  viewport: { width: 1200, height: 820 },
  deviceScaleFactor: 2,
  locale: 'zh-CN',
});
const page = await context.newPage();
page.on('console', (m) => {
  if (m.type() === 'error') console.log('[console]', m.text());
});

await page.goto(`${base}?demo=1&theme=light`, { waitUntil: 'load' });
await page.waitForTimeout(400);

// 侧栏头部特写（对比官方的 logo / 新对话 / 分组行）
await page.screenshot({ path: path.join(out, 'sidebar-top-2x.png'), clip: { x: 0, y: 0, width: 280, height: 340 } });

// 打开系统设置，逐个分区截图
await page.locator('.sidebar-foot .icon-btn').click();
await page.getByRole('button', { name: '系统设置' }).click();
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(out, 'settings-general.png') });

for (const [label, file] of [
  ['服务商与密钥', 'settings-provider.png'],
  ['数据管理', 'settings-data.png'],
  ['服务协议', 'settings-about.png'],
]) {
  await page.locator('.settings-nav button', { hasText: label }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, file) });
}

const metrics = await page.evaluate(() => {
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
  };
  const nav = [...document.querySelectorAll('.settings-nav button')].map((el) => el.textContent?.trim());
  return {
    dialog: box('.settings-dialog'),
    nav,
    navItem: box('.settings-nav button'),
    content: box('.settings-content'),
    contentScrolls: (() => {
      const el = document.querySelector('.settings-content');
      return el ? el.scrollHeight > el.clientHeight : null;
    })(),
    navScrolls: (() => {
      const el = document.querySelector('.settings-nav');
      return el ? el.scrollHeight > el.clientHeight : null;
    })(),
  };
});
console.log(JSON.stringify(metrics, null, 2));

await browser.close();
