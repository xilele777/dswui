import { useRef, useState } from 'react';
import type { Provider } from '../../types';
import { toast } from '../Toast';
import { IconDownload, IconLogout, IconMore, IconHelp, IconSettings } from '../Icons';
import { AnchoredMenu } from '../ui/AnchoredMenu';

interface Props {
  provider?: Provider;
  onOpenSettings: () => void;
}

export function SidebarFooter({ provider, onOpenSettings }: Props) {
  const [accountMenu, setAccountMenu] = useState(false);
  const menuAnchor = useRef<HTMLButtonElement>(null);
  const close = () => setAccountMenu(false);

  return (
    <div className="sidebar-foot">
      <button ref={menuAnchor} className="profile-trigger" onClick={() => setAccountMenu((v) => !v)} title="账户菜单" aria-label="账户菜单" aria-haspopup="menu" aria-expanded={accountMenu}>
        <span className="avatar">{(provider?.name || 'D').slice(0, 1).toUpperCase()}</span>
        <span className="who" title={provider?.baseUrl}>
          {provider?.name || '未配置服务商'}
        </span>
        <IconMore className="profile-more" />
      </button>
      {accountMenu && (
          <AnchoredMenu anchor={menuAnchor} placement="above" className="profile-menu" onClose={close}>
            <button
              onClick={() => {
                close();
                toast('移动端安装包暂未接入');
              }}
            >
              <IconDownload />
              下载手机应用
            </button>
            <button
              onClick={() => {
                close();
                onOpenSettings();
              }}
            >
              <IconSettings />
              系统设置
            </button>
            <button
              onClick={() => {
                close();
                toast('帮助与反馈入口暂未接入');
              }}
            >
              <IconHelp />
              帮助与反馈
            </button>
            <button
              onClick={() => {
                close();
                toast('当前为本地模式，无需登录');
              }}
            >
              <IconLogout />
              退出登录
            </button>
          </AnchoredMenu>
      )}
    </div>
  );
}
