import hljs from 'highlight.js/lib/common';

const cache = new Map<string, string>();

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function highlightCode(code: string, lang: string): string {
  const key = `${lang}\u0000${code}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  let out: string;
  if (lang && hljs.getLanguage(lang)) {
    try {
      out = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    } catch {
      out = escapeHtml(code);
    }
  } else {
    out = escapeHtml(code);
  }

  if (cache.size > 400) cache.clear();
  cache.set(key, out);
  return out;
}
