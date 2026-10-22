import { useMemo } from 'react';
import { activeProvider, useStore } from '../../store';
import { groupSessions } from '../../lib/sessions';
import { SidebarHeader } from './SidebarHeader';
import { BatchBar } from './BatchBar';
import { SessionList } from './SessionList';
import { SidebarFooter } from './SidebarFooter';
import { useSessionController } from './useSessionController';
import type { SidebarProps } from './types';
import { IconNewChat, IconSearch, IconSidebar } from '../Icons';
import deepseekMark from '../../assets/deepseek-mark.svg';

export function Sidebar({ onOpenSettings, onOpenSearch }: SidebarProps) {
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const collapsed = !useStore((s) => s.sidebarOpen);
  const provider = useStore(activeProvider);
  const newSession = useStore((s) => s.newSession);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);

  const controller = useSessionController();
  const history = useMemo(() => sessions.filter((s) => s.messages.length > 0), [sessions]);
  const groups = useMemo(() => groupSessions(history), [history]);

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <SidebarHeader
          onOpenSearch={onOpenSearch}
          onCollapse={() => setSidebarOpen(false)}
          onNewChat={() => newSession()}
          multi={controller.multi}
          selectedCount={controller.selected.size}
          onExitMulti={controller.exitMulti}
        />

        <div className="session-region">
          <SessionList
            groups={groups}
            total={history.length}
            activeSessionId={activeSessionId}
            controller={controller}
          />
        </div>

        {controller.multi ? <BatchBar selectedCount={controller.selected.size}
          allPinned={controller.selected.size > 0 && sessions.filter((s) => controller.selected.has(s.id)).every((s) => s.pinned)}
          onPin={controller.requestPinSelected} onDelete={controller.requestDeleteSelected} />
          : <SidebarFooter provider={provider} onOpenSettings={onOpenSettings} />}
      </aside>
      {collapsed && <div className="collapsed-nav">
        <button className="collapsed-brand" onClick={() => setSidebarOpen(true)} aria-label="打开边栏">
          <img src={deepseekMark} alt="DeepSeek" />
        </button>
        <div className="collapsed-actions">
          <button className="icon-btn" onClick={() => setSidebarOpen(true)} title="打开边栏" aria-label="打开边栏"><IconSidebar /></button>
          <button className="icon-btn" onClick={onOpenSearch} title="搜索对话" aria-label="搜索对话"><IconSearch /></button>
          <button className="icon-btn" onClick={() => newSession()} title="开启新对话" aria-label="开启新对话"><IconNewChat width={16} height={16} /></button>
        </div>
      </div>}
      {!collapsed && <div className="side-mask mobile-only" onClick={() => setSidebarOpen(false)} />}
    </>
  );
}
