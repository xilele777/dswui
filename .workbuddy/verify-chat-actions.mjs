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

const waitDone = async () => {
  await page.waitForFunction(() => document.body.innerText.includes('结束。'), null, { timeout: 15000 });
  await page.waitForTimeout(150);
};

await page.locator('.composer textarea').fill('第一版消息');
await page.keyboard.press('Enter');
await waitDone();

// 编辑用户消息并重发
await page.locator('.msg-user .icon-btn[title="修改"]').click();
await page.locator('.bubble-editing textarea').fill('编辑后的消息');
await page.locator('.bubble-editing textarea').press('Enter');
await waitDone();
check((await page.locator('.msg-user .bubble').textContent()) === '编辑后的消息', 'edit and resend updates user message');
check((await page.locator('.msg-ai').count()) === 1, 'edit and resend keeps one assistant message');

// 重新生成
await page.locator('.msg-ai .icon-btn[title="重新生成"]').click();
await waitDone();
check((await page.locator('.msg-ai .body').textContent())?.includes('本地 mock 服务'), 'regenerate streams again');

// 停止生成
await page.locator('.msg-ai .icon-btn[title="重新生成"]').click();
await page.waitForTimeout(420);
await page.locator('.send-btn.stop').click();
await page.waitForFunction(() => document.querySelector('.msg-ai')?.textContent?.includes('已停止'), null, {
  timeout: 5000,
});
check(true, 'stop marks message as 已停止');
check((await page.locator('.send-btn.stop').count()) === 0, 'stop restores send button');
check(errors.length === 0, 'no page errors: ' + errors.slice(0, 3).join(' | '));
await browser.close();
