import { activeProvider, useStore } from '../../../store';
import { SettingRow } from '../controls';
import { ProviderForm } from './ProviderForm';
import { ProviderPresets } from './ProviderPresets';
import { ProviderActions } from './ProviderActions';
import { Select } from '../../ui/Select';
import { ProviderCapabilities } from './ProviderCapabilities';

export function ProviderSection() {
  const providers = useStore((s) => s.providers);
  const provider = useStore(activeProvider);
  const addProvider = useStore((s) => s.addProvider);
  const setActiveProvider = useStore((s) => s.setActiveProvider);

  return (
    <>
      <SettingRow title="服务商" sub="不同服务商各自保存地址、Key 与模型">
        <Select
          label="服务商"
          value={provider.id}
          onChange={setActiveProvider}
          options={providers.map((p) => ({ value: p.id, label: p.name || '未命名' }))}
        />
        <button className="btn btn-ghost" onClick={() => addProvider()}>
          新增
        </button>
      </SettingRow>

      <ProviderForm />
      <ProviderCapabilities />
      <ProviderPresets />
      <ProviderActions />
    </>
  );
}
