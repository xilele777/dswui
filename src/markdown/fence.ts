import type MarkdownIt from 'markdown-it';
import { escapeHtml, highlightCode } from './highlight';

/** 代码块：DeepSeek 风格（顶部语言条 + 复制按钮）。 */
export function installCodeFence(md: MarkdownIt) {
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const info = token.info ? md.utils.unescapeAll(token.info).trim() : '';
    const lang = (info.split(/\s+/)[0] || '').toLowerCase();
    const body = highlightCode(token.content, lang);
    const label = lang || 'text';
    return (
      `<div class="code-block" data-lang="${escapeHtml(label)}">` +
      `<div class="code-head"><span class="code-lang">${escapeHtml(label)}</span>` +
      `<button class="code-copy" type="button" aria-label="复制代码">复制</button></div>` +
      `<pre class="code-pre"><code class="hljs language-${escapeHtml(label)}">${body}</code></pre>` +
      `</div>`
    );
  };
}
