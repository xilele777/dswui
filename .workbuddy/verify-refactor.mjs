import { chromium } from 'playwright-core';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const exe = path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1234/chrome-win64/chrome.exe');
const base = pathToFileURL(path.resolve('dist/index.html')).href;
const browser = await chromium.launch({ executablePath: exe, headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: 'zh-CN' });
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

await page.goto(`${base}?demo=1&theme=light`, { waitUntil: 'load' });
await page.waitForTimeout(350);
check((await page.locator('.msg').count()) === 2, 'demo renders 2 messages');
check((await page.locator('.session-item').count()) === 1, 'sidebar renders session');

// 搜索对话
await page.keyboard.press('Control+k');
await page.waitForTimeout(150);
check(await page.locator('.search-dialog').isVisible(), 'Ctrl+K opens search');
await page.locator('.search-dialog input').fill('流式');
await page.waitForTimeout(120);
check((await page.locator('.search-result').count()) === 1, 'search returns result');
await page.keyboard.press('Escape');
await page.waitForTimeout(120);
check((await page.locator('.search-dialog').count()) === 0, 'Esc closes search');

// 会话菜单 + 多选
await page.locator('.session-item').first().hover();
await page.locator('.session-item .row-actions .icon-btn').click();
await page.waitForTimeout(120);
check((await page.locator('.session-menu button').count()) === 4, 'session menu has 4 actions');
await page.locator('.session-menu button', { hasText: '多选' }).click();
await page.waitForTimeout(120);
check(await page.locator('.session-batch-bar').isVisible(), 'multi-select bar visible');
check((await page.locator('.session-batch-bar .count').textContent())?.includes('1 个对话'), 'multi preselects item');
await page.locator('.session-item').first().click();
check((await page.locator('.session-batch-bar .count').textContent())?.includes('0 个对话'), 'multi toggle off');
await page.locator('.session-item').first().click();
check((await page.locator('.session-batch-bar .count').textContent())?.includes('1 个对话'), 'multi toggle on');
await page.getByRole('button', { name: '完成' }).click();

// 标题重命名
await page.locator('.conversation-title').click();
await page.locator('.conversation-title-input').fill('重命名验证');
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
check((await page.locator('.conversation-title').textContent()) === '重命名验证', 'title rename works');

// 设置弹层 & 服务商表单
await page.locator('.sidebar-foot .icon-btn').click();
await page.getByRole('button', { name: '系统设置' }).click();
await page.waitForTimeout(150);
check(await page.locator('.settings-dialog').isVisible(), 'settings opens');
await page.locator('.settings-nav button', { hasText: '服务商与密钥' }).click();
check((await page.locator('.settings-inline-form input').first().inputValue()) === 'DeepSeek 官方', 'provider form loads');
await page.locator('.settings-inline-form input').first().fill('本地模型');
await page.locator('.settings-nav button', { hasText: '数据管理' }).click();
check(await page.locator('.settings-danger-zone').isVisible(), 'data section renders');
await page.keyboard.press('Escape');
await page.waitForTimeout(120);
check((await page.locator('.settings-dialog').count()) === 0, 'Esc closes settings');
check((await page.locator('.sidebar-foot .who').textContent()) === '本地模型', 'provider edit reflected in sidebar');

// 发送链路：没有 Key 时应落到错误卡片，而不是崩溃
const textarea = page.locator('.composer textarea');
await textarea.fill('测试消息');
await page.keyboard.press('Enter');
await page.waitForTimeout(450);
check((await page.locator('.msg-user').count()) === 2, 'send appends user message');
check(await page.locator('.error-card').isVisible(), 'missing API key produces error card');

// 刷新后配置持久化
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(350);
check((await page.locator('.sidebar-foot .who').textContent()) === '本地模型', 'provider name persists');
check((await page.locator('.conversation-title').textContent()) === '重命名验证', 'title persists');

check(errors.length === 0, 'no page errors: ' + errors.slice(0, 3).join(' | '));
await browser.close();
