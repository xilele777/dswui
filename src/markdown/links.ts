import type MarkdownIt from 'markdown-it';

/** 外链统一新窗口打开。 */
export function installLinks(md: MarkdownIt) {
  const defaultLink =
    md.renderer.rules.link_open ||
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    tokens[idx].attrSet('target', '_blank');
    tokens[idx].attrSet('rel', 'noopener noreferrer');
    return defaultLink(tokens, idx, options, env, self);
  };
}
