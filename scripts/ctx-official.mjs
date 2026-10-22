// 从官方 main.js 里按关键词抽取上下文（逆向取证用）
// 用法: node scripts/ctx-official.mjs "关键词1" "关键词2" --before=800 --after=1600
import fs from 'node:fs';

const args = process.argv.slice(2);
const opts = { before: 600, after: 1200, max: 6, out: '' };
const keys = [];
for (const a of args) {
  const m = a.match(/^--(before|after|max)=(\d+)$/);
  const o = a.match(/^--out=(.+)$/);
  if (m) opts[m[1]] = Number(m[2]);
  else if (o) opts.out = o[1];
  else keys.push(a);
}

const src = fs.readFileSync('docs/live-probe/main.js', 'utf8');
const buf = [];
const log = (s) => buf.push(s);

for (const k of keys) {
  let from = 0;
  let n = 0;
  while (n < opts.max) {
    const i = src.indexOf(k, from);
    if (i === -1) break;
    const s = Math.max(0, i - opts.before);
    const e = Math.min(src.length, i + k.length + opts.after);
    log(`\n===== [${k}] #${n + 1} @${i} =====`);
    log(src.slice(s, e));
    from = i + k.length;
    n++;
  }
  if (!n) log(`\n===== [${k}] NOT FOUND =====`);
}

const text = buf.join('\n');
if (opts.out) {
  fs.writeFileSync(opts.out, text, 'utf8');
  console.log(`written ${Buffer.byteLength(text)} bytes -> ${opts.out}`);
} else {
  process.stdout.write(text);
}
