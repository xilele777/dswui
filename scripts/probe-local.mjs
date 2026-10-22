import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const exe = path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1234/chrome-win64/chrome.exe');
const outDir = path.resolve('docs/local-probe');
fs.mkdirSync(outDir, { recursive: true });
const url = pathToFileURL(path.resolve('dist/index.html')).href;

const browser = await chromium.launch({ executablePath: exe, headless: true });
const context = await browser.newContext({ viewport: { width: 1482, height: 900 }, deviceScaleFactor: 1, locale: 'zh-CN' });
const page = await context.newPage();

async function shot(name, search) {
  await page.goto(url + (search ?? ''), { waitUntil: 'load' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(outDir, name + '.png') });
  return page.evaluate(() => {
    const info = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        cls: typeof el.className === 'string' ? el.className : '',
        text: (el.innerText || el.textContent || '').trim().slice(0, 80),
        box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        bg: cs.backgroundColor,
        color: cs.color,
        radius: cs.borderRadius,
        font: `${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight}`,
        padding: cs.padding,
        shadow: cs.boxShadow,
      };
    };
    return {
      sidebar: info(document.querySelector('.sidebar')),
      brand: info(document.querySelector('.brand')),
      newChat: info(document.querySelector('.new-chat')),
      session: info(document.querySelector('.session-item')),
      welcome: info(document.querySelector('.welcome')),
      welcomeHeading: info(document.querySelector('.welcome h1')),
      composer: info(document.querySelector('.composer')),
      textarea: info(document.querySelector('.composer textarea')),
      pill: info(document.querySelector('.pill')),
      send: info(document.querySelector('.send-btn')),
      bubble: info(document.querySelector('.msg-user .bubble')),
      assistantBody: info(document.querySelector('.msg-ai .body')),
      think: info(document.querySelector('.think-head')),
      actions: info(document.querySelector('.msg-actions')),
      code: info(document.querySelector('.code-block')),
      table: info(document.querySelector('.md-body table')),
      disclaimer: info(document.querySelector('.disclaimer')),
    };
  });
}

const empty = await shot('local-empty', '?demo=0&theme=light');
// demo=1 only loads if no history; clear storage and reload
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(outDir, 'local-demo-light.png') });
fs.writeFileSync(path.join(outDir, 'local-probe.json'), JSON.stringify({ empty }, null, 2));
console.log(JSON.stringify(empty, null, 2));
await browser.close();
