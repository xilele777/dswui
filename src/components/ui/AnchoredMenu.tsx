import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../../lib/useEscapeKey';

interface Props {
  anchor: RefObject<HTMLElement>;
  placement?: 'below' | 'above';
  className: string;
  onClose: () => void;
  children: ReactNode;
}

export function AnchoredMenu({ anchor, placement = 'below', className, onClose, children }: Props) {
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  useEscapeKey(onClose);

  useLayoutEffect(() => {
    const trigger = anchor.current;
    const popup = menu.current;
    if (!trigger || !popup) return;
    const rect = trigger.getBoundingClientRect();
    const height = popup.offsetHeight;
    let top = placement === 'above' ? rect.top - height - 8 : rect.bottom + 4;
    if (top + height > window.innerHeight - 8) top = rect.top - height - 4;
    setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - popup.offsetWidth - 8)), top: Math.max(8, top) });
    const close = () => onClose();
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true); };
  }, [anchor, placement, onClose]);

  return createPortal(<>
    <div className="popup-menu-mask" onClick={(e) => { e.stopPropagation(); onClose(); }} />
    <div ref={menu} className={`popup-menu ${className}`} style={position} role="menu" onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button')];
        const index = items.indexOf(document.activeElement as HTMLButtonElement);
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          items[(index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
        }
      }}>{children}</div>
  </>, document.body);
}
