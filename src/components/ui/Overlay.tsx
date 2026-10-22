import type { ReactNode } from 'react';

interface Props {
  className: string;
  onClose: () => void;
  children: ReactNode;
}

/** 点击遮罩关闭的通用弹层容器。 */
export function Overlay({ className, onClose, children }: Props) {
  return (
    <div className={className} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      {children}
    </div>
  );
}
