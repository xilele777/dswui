// 本地 mock 服务：静态托管 dist + OpenAI 兼容 SSE 接口。
// 用途：没有 API Key 时也能把整条流式链路跑通。
// 用法：npm run build && npm run mock  然后 Base URL 填 http://127.0.0.1:8788/v1，Key 随便填。
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const DIST = path.resolve(__dirname, '../dist');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };

const web = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(DIST, p);
  if (!file.startsWith(DIST) || !fs.existsSync(file)) {
    res.writeHead(404); res.end('404'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const REASON = `用户想让我演示流式输出的效果。

我应该先给一个简短开头，然后把代码块、表格、公式一次过一遍，这样渲染管线就全测到了。

注意：思考过程要和正文分开推送，前端才好折叠。`;

const BODY = `这是通过 **本地 mock 服务** 推送的流式响应，用来验证前端管线。

### 渲染检查清单

1. 行内代码 \`response.body\` 与 **加粗**、*斜体*
2. 代码块高亮与复制按钮
3. 表格与引用
4. LaTeX 公式

\`\`\`ts
export async function* stream(url: string) {
  const res = await fetch(url);
  const reader = res.body!.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    yield new TextDecoder().decode(value);
  }
}
\`\`\`

| 环节 | 状态 |
| --- | --- |
| SSE 解析 | ✅ |
| 增量渲染 | ✅ |
| 用量统计 | ✅ |

> 如果这些都正常，说明复刻版的渲染管线已经跑通。

行内公式 $E = mc^2$，块级公式：

$$\\int_0^\\infty e^{-x^2}dx = \\frac{\\sqrt{\\pi}}{2}$$

结束。`;

const api = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url || '';

  if (url.startsWith('/v1/models')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: [{ id: 'mock-chat' }, { id: 'mock-reasoner' }] }));
    return;
  }

  if (url.startsWith('/v1/chat/completions')) {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      let body = {};
      try { body = JSON.parse(raw); } catch { /* empty */ }
      const withReasoning = /reasoner/.test(body.model || '');
      console.log('completion start, model=' + body.model + ' reasoning=' + withReasoning);

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      });
      res.flushHeaders?.();

      const send = (obj) => res.write('data: ' + JSON.stringify(obj) + '\n\n');

      const steps = [];
      if (withReasoning) {
        for (let k = 0; k < REASON.length; k += 8) steps.push({ reasoning_content: REASON.slice(k, k + 8) });
      }
      for (let k = 0; k < BODY.length; k += 6) steps.push({ content: BODY.slice(k, k + 6) });

      let i = 0;
      const timer = setInterval(() => {
        if (i >= steps.length) {
          clearInterval(timer);
          send({ id: 'mock', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] });
          send({ id: 'mock', choices: [], usage: { prompt_tokens: 128, completion_tokens: 356, total_tokens: 484 } });
          res.write('data: [DONE]\n\n');
          res.end();
          console.log('completion done, chunks=' + steps.length);
          return;
        }
        send({ id: 'mock', model: body.model || 'mock-chat', choices: [{ index: 0, delta: steps[i++] }] });
      }, 12);
    });
    return;
  }

  res.writeHead(404); res.end('nope');
});

web.listen(8787, '127.0.0.1', () => console.log('web 8787'));
api.listen(8788, '127.0.0.1', () => console.log('api 8788'));
