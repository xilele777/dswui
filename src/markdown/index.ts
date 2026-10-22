import MarkdownIt from 'markdown-it';
import { installCodeFence } from './fence';
import { installMath } from './math';
import { installLinks } from './links';

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false,
});

installCodeFence(md);
installMath(md);
installLinks(md);

// Keep wide tables inside their own scroll area, preserving cell alignment.
md.renderer.rules.table_open = () => '<div class="md-table-wrap"><table>\n';
md.renderer.rules.table_close = () => '</table></div>\n';

export function renderMarkdown(text: string): string {
  if (!text) return '';
  return md.render(text);
}
