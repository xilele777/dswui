import { activeProvider, useStore } from '../../../store';
import { downloadText } from '../../../lib/download';
import { sessionToMarkdown } from '../../../lib/export';
import { loadDemoSession } from '../../../demo';
import { toast } from '../../Toast';
import { useConfirm } from '../../ConfirmDialog';
import { SettingRow } from '../controls';

interface Props {
  onClose: () => void;
}

export function DataSection({ onClose }: Props) {
  const sessions = useStore((s) => s.sessions);
  const providers = useStore((s) => s.providers);
  const settings = useStore((s) => s.settings);
  const provider = useStore(activeProvider);
  const clearAllSessions = useStore((s) => s.clearAllSessions);
  const confirm = useConfirm();

  const exportAll = () => {
    const all = sessions
      .map((s) => sessionToMarkdown(s, provider.defaultModel))
      .join('\n\n---\n\n');
    downloadText(`deepchat-export-${Date.now()}.md`, all || '（暂无对话）');
  };

  const copyConfig = () => {
    void navigator.clipboard
      ?.writeText(JSON.stringify({ providers, settings }, null, 2))
      .then(() => toast('配置已复制（含 Key，注意保管）'));
  };

  const loadDemo = () => {
    loadDemoSession();
    onClose();
    toast('已载入演示对话');
  };

  const clearAll = () => {
    void confirm({
      title: '删除所有对话？',
      description: '所有本地对话都将被清空且无法找回。',
      confirmText: '删除',
      danger: true,
    }).then((ok) => {
      if (!ok) return;
      clearAllSessions();
      toast('已清空');
    });
  };

  return (
    <>
      <SettingRow title="导出所有对话" sub="打包成本地 Markdown 文件">
        <button className="btn btn-ghost" onClick={exportAll}>
          导出
        </button>
      </SettingRow>

      <SettingRow title="复制配置 JSON" sub="包含服务商与 Key，注意保管">
        <button className="btn btn-ghost" onClick={copyConfig}>
          复制
        </button>
      </SettingRow>

      <SettingRow title="载入演示对话" sub="用于预览渲染效果">
        <button className="btn btn-ghost" onClick={loadDemo}>
          载入
        </button>
      </SettingRow>

      <div className="settings-danger-zone">
        <div>
          <div className="txt">删除所有对话</div>
          <div className="sub">所有本地对话都将被清空且无法找回。</div>
        </div>
        <button className="btn btn-danger" onClick={clearAll}>
          删除
        </button>
      </div>
    </>
  );
}
