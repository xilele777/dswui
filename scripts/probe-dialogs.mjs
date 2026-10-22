import { chromium } from 'playwright-core';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const exe = path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1234/chrome-win64/chrome.exe');
const base = pathToFileURL(path.resolve('dist/index.html')).href;
const out = path.resolve('docs/local-probe');
const browser = await chromium.launch({ executablePath: exe, headless: true });
const context = await browser.newContext({ viewport: { width: 1200, height: 820 }, locale: 'zh-CN' });
const page = await context.newPage();

await page.goto(`${base}?demo=1&theme=light`, { waitUntil: 'load' });
await page.waitForTimeout(300);

await page.locator('.sidebar-foot .icon-btn').click();
await page.getByRole('button', { name: '系统设置' }).click();
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(out, 'settings-light.png') });
await page.keyboard.press('Escape');

await page.locator('.session-item').first().hover();
await page.locator('.session-item .row-actions .icon-btn').last().click();
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(out, 'confirm-light.png') });

await browser.close();
