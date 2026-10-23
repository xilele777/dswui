import { IconNewChat, IconClose, IconSearch, IconSidebar } from '../Icons';
import deepseekWordmark from '../../assets/deepseek-wordmark.svg';

interface Props {
  onOpenSearch: () => void;
  onCollapse: () => void;
  onNewChat: () => void;
  multi: boolean;
  selectedCount: number;
  onExitMulti: () => void;
}

export function SidebarHeader({ onOpenSearch, onCollapse, onNewChat, multi, selectedCount, onExitMulti }: Props) {
  return (
    <div className="sidebar-top">
      <div className="brand-row">
        <button className="brand" onClick={onNewChat} title="返回主页" aria-label="返回主页">
          <img src={deepseekWordmark} alt="DeepSeek" />
        </button>
        <div className="brand-actions">
          {!multi && <button className="icon-btn" onClick={onOpenSearch} title="搜索对话 Ctrl K" aria-label="搜索对话">
            <IconSearch />
          </button>}
          <button className="icon-btn" onClick={onCollapse} title="收起边栏" aria-label="收起边栏">
            <IconSidebar width={16} height={16} />
          </button>
        </div>
      </div>

      {multi ? <div className="session-batch-bar">
        <span className="count">{selectedCount ? `已选择 ${selectedCount} 个对话` : '选择对话'}</span>
        <button onClick={onExitMulti} aria-label="退出多选" title="退出多选"><IconClose width={12} height={12} /></button>
      </div> : <button className="new-chat" onClick={onNewChat}>
        <IconNewChat width={16} height={16} />
        <span>开启新对话</span>
      </button>}
    </div>
  );
}
