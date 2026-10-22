import { createContext, useCallback, useContext, useRef, useState } from 'react';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div className="confirm-overlay" onMouseDown={(e) => e.target === e.currentTarget && close(false)}>
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onKeyDown={(e) => {
            if (e.key === 'Escape') { e.stopPropagation(); close(false); }
          }}>
            <h3 id="confirm-title">{options.title}</h3>
            {options.description && <p>{options.description}</p>}
            <div className="confirm-actions">
              <button className="confirm-cancel" onClick={() => close(false)}>
                {options.cancelText ?? '取消'}
              </button>
              <button
                className={`confirm-ok ${options.danger ? 'danger' : ''}`}
                autoFocus
                onClick={() => close(true)}
              >
                {options.confirmText ?? '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
