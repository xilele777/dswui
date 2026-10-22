import { useState } from 'react';
import { activeProvider, useStore } from '../../../store';
import { fetchModels } from '../../../api';
import { toast } from '../../Toast';
import { useConfirm } from '../../ConfirmDialog';
import { SettingRow } from '../controls';

export function ProviderActions() {
  const provider = useStore(activeProvider);
  const updateProvider = useStore((s) => s.updateProvider);
  const removeProvider = useStore((s) => s.removeProvider);
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  const pullModels = async () => {
    if (!provider.baseUrl) {
      toast('先填写 Base URL');
      return;
    }
    setBusy(true);
    try {
      const list = await fetchModels(provider);
      if (!list.length) throw new Error('接口没有返回模型');
      updateProvider(provider.id, {
        models: list,
        defaultModel: list.includes(provider.defaultModel) ? provider.defaultModel : list[0],
      });
      toast(`已获取 ${list.length} 个模型`);
    } catch (e: any) {
      toast(`获取失败：${String(e?.message ?? e).slice(0, 80)}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    void confirm({
      title: '删除这个服务商？',
      description: '只会删除本机保存的接口地址、Key 和模型配置。',
      confirmText: '删除',
      danger: true,
    }).then((ok) => {
      if (ok) removeProvider(provider.id);
    });
  };

  return (
    <SettingRow
      title="模型列表"
      sub="按 Base URL + Key 拉取 /models"
      style={{ borderTop: '1px solid var(--border-l1)' }}
    >
      <button className="btn btn-ghost" onClick={pullModels} disabled={busy}>
        {busy ? '获取中…' : '拉取模型'}
      </button>
      {provider.id !== 'p-default' && (
        <button className="btn btn-danger" onClick={remove}>
          删除服务商
        </button>
      )}
    </SettingRow>
  );
}
