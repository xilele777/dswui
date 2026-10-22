import type MarkdownIt from 'markdown-it';
import katex from 'katex';
import { escapeHtml } from './highlight';

function renderMath(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
      output: 'html',
      trust: false,
    });
  } catch {
    return `<code>${escapeHtml(tex)}</code>`;
  }
}

/** 行内 $...$ 与块级 $$...$$（块级在 fence 之前注册）。 */
export function installMath(md: MarkdownIt) {
  md.inline.ruler.after('backticks', 'math_inline', (state, silent) => {
    const start = state.pos;
    if (state.src.charCodeAt(start) !== 0x24 /* $ */) return false;
    if (state.src.charCodeAt(start + 1) === 0x24) return false;

    let pos = start + 1;
    let found = -1;
    while (pos < state.posMax) {
      const ch = state.src.charCodeAt(pos);
      if (ch === 0x5c /* \ */) {
        pos += 2;
        continue;
      }
      if (ch === 0x24) {
        found = pos;
        break;
      }
      pos++;
    }
    if (found < 0 || found === start + 1) return false;

    const tex = state.src.slice(start + 1, found);
    if (/^\s|\s$/.test(tex)) return false;

    if (!silent) {
      const token = state.push('math_inline', 'math', 0);
      token.markup = '$';
      token.content = tex;
    }
    state.pos = found + 1;
    return true;
  });

  md.renderer.rules.math_inline = (tokens, idx) =>
    `<span class="katex-inline">${renderMath(tokens[idx].content, false)}</span>`;

  md.block.ruler.before('fence', 'math_block', (state, startLine, endLine, silent) => {
    const start = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];
    if (start + 2 > max) return false;
    if (state.src.slice(start, start + 2) !== '$$') return false;
    if (silent) return true;

    let nextLine = startLine;
    let closed = false;
    let content = '';
    const first = state.src.slice(start + 2, max);
    if (first.trim().endsWith('$$') && first.trim().length > 2) {
      content = first.trim().slice(0, -2);
      closed = true;
      nextLine = startLine + 1;
    } else {
      content = first;
      nextLine = startLine + 1;
      while (nextLine < endLine) {
        const s = state.bMarks[nextLine] + state.tShift[nextLine];
        const e = state.eMarks[nextLine];
        const line = state.src.slice(s, e);
        if (line.trim().endsWith('$$')) {
          content += '\n' + line.slice(0, line.lastIndexOf('$$'));
          closed = true;
          nextLine++;
          break;
        }
        content += '\n' + line;
        nextLine++;
      }
    }
    if (!closed) return false;

    const token = state.push('math_block', 'math', 0);
    token.block = true;
    token.content = content;
    token.map = [startLine, nextLine];
    state.line = nextLine;
    return true;
  });

  md.renderer.rules.math_block = (tokens, idx) =>
    `<div class="katex-block">${renderMath(tokens[idx].content, true)}</div>`;
}
