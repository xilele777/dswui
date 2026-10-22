import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const exe = path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1234/chrome-win64/chrome.exe');
const outDir = path.resolve('docs/live-probe');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: exe,
  headless: true,
  args: ['--disable-blink-features=AutomationControlled'],
});
const context = await browser.newContext({
  viewport: { width: 1482, height: 900 },
  deviceScaleFactor: 1,
  locale: 'zh-CN',
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
});
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
await page.goto('https://chat.deepseek.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
try {
  await page.waitForLoadState('networkidle', { timeout: 10000 });
} catch {}
await page.screenshot({ path: path.join(outDir, 'live-home-1482.png'), fullPage: false });
fs.writeFileSync(path.join(outDir, 'live-home.html'), await page.content());

const probe = await page.evaluate(() => {
  const info = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      cls: (typeof el.className === 'string' ? el.className : '').slice(0, 200),
      text: (el.innerText || el.textContent || '').trim().slice(0, 200),
      box: { x: r.x, y: r.y, w: r.width, h: r.height },
      style: {
        background: cs.backgroundColor,
        color: cs.color,
        border: cs.border,
        borderRadius: cs.borderRadius,
        boxShadow: cs.boxShadow,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        fontWeight: cs.fontWeight,
        padding: cs.padding,
        margin: cs.margin,
        fontFamily: cs.fontFamily,
      },
    };
  };
  const all = [...document.querySelectorAll('body *')];
  const pick = (sel) => info(document.querySelector(sel));
  const textEls = (t) => all.filter((e) => (e.innerText || '').trim() === t).slice(0, 6).map(info);
  const textarea = document.querySelector('textarea');
  const textareaParentChain = [];
  let e = textarea;
  for (let i = 0; e && i < 8; i++, e = e.parentElement) textareaParentChain.push(info(e));
  const buttons = [...document.querySelectorAll('button')].slice(0, 60).map(info);
  const keyClasses = {};
  for (const el of all) {
    const cls = typeof el.className === 'string' ? el.className : '';
    for (const c of cls.split(/\s+/)) {
      if (/^(ds-|_)/.test(c) && c.length < 80) keyClasses[c] = (keyClasses[c] || 0) + 1;
    }
  }
  return {
    title: document.title,
    lang: document.documentElement.lang,
    theme: document.documentElement.getAttribute('data-theme'),
    htmlClass: document.documentElement.className,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyFont: getComputedStyle(document.body).fontFamily,
    rootText: (document.getElementById('root')?.innerText || '').slice(0, 2000),
    rootHTML: (document.getElementById('root')?.innerHTML || '').slice(0, 12000),
    textarea: info(textarea),
    textareaParentChain,
    buttons,
    welcomeHeading: textEls('你好，有什么我能帮你的吗？'),
    newChat: textEls('开启新对话'),
    searchTexts: textEls('搜索'),
    keyClasses: Object.entries(keyClasses).sort((a, b) => b[1] - a[1]).slice(0, 120),
    bodyChildren: [...document.body.children].map(info),
  };
});
fs.writeFileSync(path.join(outDir, 'live-home-probe.json'), JSON.stringify({ consoleErrors, probe }, null, 2));
console.log(JSON.stringify({ consoleErrors, rootText: probe.rootText, textarea: probe.textarea, welcomeHeading: probe.welcomeHeading }, null, 2));
await browser.close();
