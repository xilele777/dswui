import { activeProvider, useStore } from '../../../store';
import { Field } from '../controls';
import { Select } from '../../ui/Select';

function ModelInput({ label, value, models, onChange, placeholder }: { label: string; value: string; models: string[]; onChange: (value: string) => void; placeholder: string }) {
  return <div className="model-input">
    <input type="text" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} spellCheck={false} />
    {models.length > 0 && <Select className="model-input-select" label={`选择${label}`} value={value} options={models.map((m) => ({ value: m, label: m }))} onChange={onChange} />}
  </div>;
}

export function ProviderForm() {
  const provider = useStore(activeProvider);
  const settings = useStore((s) => s.settings);
  const updateProvider = useStore((s) => s.updateProvider);
  const setSettings = useStore((s) => s.setSettings);

  return (
    <div className="settings-inline-form">
      <Field label="名称">
        <input
          type="text"
          value={provider.name}
          onChange={(e) => updateProvider(provider.id, { name: e.target.value })}
          placeholder="例如：我的中转站"
        />
      </Field>

      <Field
        label="Base URL"
        hint="兼容 OpenAI 的接口地址。填到 /v1 即可，程序会自动补 /chat/completions；直接贴完整地址也可以。"
      >
        <input
          type="text"
          value={provider.baseUrl}
          onChange={(e) => updateProvider(provider.id, { baseUrl: e.target.value })}
          placeholder="https://api.example.com/v1"
          spellCheck={false}
        />
      </Field>

      <Field label="API Key" hint="保存在本机浏览器；请求时仅发送到你填写的服务商地址。">
        <input
          type="password"
          value={provider.apiKey}
          onChange={(e) => updateProvider(provider.id, { apiKey: e.target.value })}
          placeholder="sk-..."
          spellCheck={false}
        />
      </Field>

      <div className="row-2">
        <Field label="默认模型">
          <ModelInput
            label="默认模型"
            value={provider.defaultModel}
            models={provider.models}
            onChange={(defaultModel) => updateProvider(provider.id, { defaultModel })}
            placeholder="deepseek-chat"
          />
        </Field>
        <Field label="“深度思考”用的模型" hint="可选。开启后切换到此模型；留空则用默认模型。思考参数在下方配置。">
          <ModelInput
            label="深度思考模型"
            value={provider.thinkingModel ?? ''}
            models={provider.models}
            onChange={(thinkingModel) => updateProvider(provider.id, { thinkingModel })}
            placeholder="deepseek-reasoner"
          />
        </Field>
      </div>

      <div className="row-2">
        <Field label="Temperature" hint="越高越发散，0 表示尽量确定">
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={settings.temperature}
            onChange={(e) => setSettings({ temperature: Number(e.target.value) })}
          />
        </Field>
        <Field label="Max tokens">
          <input
            type="number"
            step="256"
            min="256"
            value={settings.maxTokens}
            onChange={(e) => setSettings({ maxTokens: Number(e.target.value) })}
          />
        </Field>
      </div>

      <Field label="系统提示词" hint="会作为 system 消息放在每次请求最前面。">
        <textarea
          rows={3}
          value={settings.systemPrompt}
          onChange={(e) => setSettings({ systemPrompt: e.target.value })}
          placeholder="例如：你是一个严谨的中文技术助手，回答尽量给出可运行的代码。"
        />
      </Field>
    </div>
  );
}
