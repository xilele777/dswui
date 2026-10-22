import type { CSSProperties, ReactNode } from 'react';

export function SettingRow({
  title,
  sub,
  children,
  className,
  style,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`setting-row ${className ?? ''}`} style={style}>
      <div>
        <div className="txt">{title}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      <div className="ctrl">{children}</div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function SwitchRow({
  title,
  sub,
  on,
  onChange,
}: {
  title: string;
  sub?: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="switch-row">
      <div>
        <div className="txt">{title}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      <button className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} aria-label={title} />
    </div>
  );
}
