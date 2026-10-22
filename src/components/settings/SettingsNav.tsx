import type { ReactNode } from 'react';
import { IconDatabase, IconFile, IconKey, IconSettings } from '../Icons';
import type { SettingsTab } from './types';

interface Props {
  tab: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}

const items: { id: SettingsTab; label: string; icon: ReactNode }[] = [
  { id: 'general', label: '通用设置', icon: <IconSettings /> },
  { id: 'provider', label: '服务商与密钥', icon: <IconKey /> },
  { id: 'data', label: '数据管理', icon: <IconDatabase /> },
  { id: 'about', label: '服务协议', icon: <IconFile /> },
];

export function SettingsNav({ tab, onChange }: Props) {
  return (
    <div className="settings-nav">
      {items.map((item) => (
        <button key={item.id} className={tab === item.id ? 'on' : ''} onClick={() => onChange(item.id)}>
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
