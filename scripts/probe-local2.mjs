import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const exe = path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1234/chrome-win64/chrome.exe');
const outDir = path.resolve('docs/local-probe');
fs.mkdirSync(outDir, { recursive: true });
const base = pathToFileURL(path.resolve('dist/index.html')).href;
const browser = await chromium.launch({ executablePath: exe, headless: true });

async function pageFor(theme) {
  const context = await browser.newContext({ viewport: { width: 1482, height: 900 }, deviceScaleFactor: 1, locale: 'zh-CN' });
  const page = await context.newPage();
  await page.goto(base + '?theme=' + theme, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  return { page, context };
}

function boxes(page) {
  return page.evaluate(() => {
    const info = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], bg: cs.backgroundColor, radius: cs.borderRadius, font: `${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight}`, color: cs.color, padding: cs.padding };
    };
    return {
      welcome: info('.welcome'),
      h1: info('.welcome h1'),
      logo: info('.welcome-logo'),
      composer: info('.composer'),
      textarea: info('.composer textarea'),
      pill: info('.pill'),
      send: info('.send-btn'),
      disclaimer: info('.disclaimer'),
      newChat: info('.new-chat'),
      brand: info('.brand'),
    };
  });
}

for (const theme of ['light', 'dark']) {
  const { page, context } = await pageFor(theme);
  await page.screenshot({ path: path.join(outDir, `empty-${theme}.png`) });
  fs.writeFileSync(path.join(outDir, `empty-${theme}.json`), JSON.stringify(await boxes(page), null, 2));
  await page.goto(base + '?demo=1&theme=' + theme, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('.scroll-area')?.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(outDir, `chat-top-${theme}.png`) });
  await context.close();
}
await browser.close();
