// 把 vite 产物压成单文件 HTML，方便直接双击打开 / 单文件分发
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const htmlPath = path.join(dist, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const assetsDir = path.join(dist, 'assets');
const assets = fs.readdirSync(assetsDir);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

for (const f of assets.filter((x) => x.endsWith('.css'))) {
  const css = fs.readFileSync(path.join(assetsDir, f), 'utf8');
  const re = new RegExp(`<link[^>]*href="[^"]*${esc(f)}"[^>]*>`);
  // 用函数形式替换，避免 CSS/JS 里的 $& $' 等被当成替换模式
  html = html.replace(re, () => `<style>\n${css}\n</style>`);
}

for (const f of assets.filter((x) => x.endsWith('.js'))) {
  const js = fs
    .readFileSync(path.join(assetsDir, f), 'utf8')
    // 源码里可能出现 "</script"，会提前闭合内联脚本
    .replace(/<\/script/gi, '<\\/script');
  const re = new RegExp(`<script[^>]*src="[^"]*${esc(f)}"[^>]*></script>`);
  html = html.replace(re, () => `<script type="module">\n${js}\n</script>`);
}

html = html.replace(/<link[^>]*rel="modulepreload"[^>]*>/g, '');

fs.writeFileSync(htmlPath, html, 'utf8');
const kb = (fs.statSync(htmlPath).size / 1024).toFixed(0);
const opens = (html.match(/<script/g) || []).length;
console.log(`single-file build -> dist/index.html (${kb} KB), <script> occurrences: ${opens}`);
