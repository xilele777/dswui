import { memo, useMemo } from 'react';
import { renderMarkdown } from '../markdown';
import { copyText } from '../lib/clipboard';

interface Props {
  text: string;
  className?: string;
}

export const Markdown = memo(function Markdown({ text, className }: Props) {
  const html = useMemo(() => renderMarkdown(text), [text]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const btn = target.closest('.code-copy') as HTMLElement | null;
    if (!btn) return;
    const block = btn.closest('.code-block');
    const code = block?.querySelector('code')?.textContent ?? '';
    void copyText(code).then(() => {
      const old = btn.textContent;
      btn.textContent = '已复制';
      window.setTimeout(() => {
        btn.textContent = old || '复制';
      }, 1500);
    });
  };

  return (
    <div
      className={`md-body ${className ?? ''}`}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
