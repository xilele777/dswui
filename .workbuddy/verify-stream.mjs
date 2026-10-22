import { chromium } from 'playwright-core';
import path from 'node:path';

const exe = path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1234/chrome-win64/chrome.exe');
const browser = await chromium.launch({ executablePath: exe, headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'zh-CN' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

const check = (ok, label) => {
  if (!ok) throw new Error('FAIL: ' + label);
  console.log('ok -', label);
};

await page.goto('http://127.0.0.1:8787/?theme=light', { waitUntil: 'load' });
await page.waitForTimeout(300);

await page.locator('.sidebar-foot .icon-btn').click();
await page.getByRole('button', { name: '系统设置' }).click();
await page.locator('.settings-nav button', { hasText: '服务商与密钥' }).click();
const inputs = page.locator('.settings-inline-form input');
await inputs.nth(1).fill('http://127.0.0.1:8788/v1');
await inputs.nth(2).fill('test-key');
await inputs.nth(3).fill('mock-reasoner');
await page.keyboard.press('Escape');
await page.waitForTimeout(120);

await page.locator('.composer textarea').fill('请演示流式输出');
await page.keyboard.press('Enter');

await page.waitForSelector('.msg-ai .body', { timeout: 8000 });
await page.waitForSelector('.think-head', { timeout: 8000 });
await page.waitForSelector('.code-block', { timeout: 12000 });
await page.waitForSelector('.katex-block', { timeout: 12000 });
await page.waitForFunction(() => document.body.innerText.includes('结束。'), null, { timeout: 15000 });
await page.waitForTimeout(250);

check((await page.locator('.msg-user').count()) === 1, 'user message rendered');
check((await page.locator('.msg-ai .body').textContent())?.includes('本地 mock 服务'), 'assistant body streamed');
check((await page.locator('.think-body').count()) === 0 || (await page.locator('.think').count()) === 1, 'thinking block rendered');
check((await page.locator('.code-block').count()) === 1, 'code fence rendered');
check((await page.locator('.katex-block').count()) === 1, 'katex block rendered');
check((await page.locator('.msg-ai .msg-meta').allTextContents()).some((t) => t.includes('tokens')), 'usage rendered');
check((await page.locator('.send-btn').count()) === 1, 'composer restored');
check(errors.length === 0, 'no page errors: ' + errors.slice(0, 3).join(' | '));
await browser.close();
