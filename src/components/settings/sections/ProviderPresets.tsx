import { activeProvider, useStore } from '../../../store';
import { PROVIDER_PRESETS } from '../presets';

export function ProviderPresets() {
  const provider = useStore(activeProvider);
  const updateProvider = useStore((s) => s.updateProvider);

  return (
    <div className="settings-data-actions">
      <div className="settings-inline-form">
        <div className="hint" style={{ marginBottom: 8, fontSize: 12, color: 'var(--label-tertiary)' }}>
          快速填充：
        </div>
        <div className="provider-tabs">
          {PROVIDER_PRESETS.map((p) => (
            <button
              key={p.name}
              className="provider-tab"
              onClick={() =>
                updateProvider(provider.id, {
                  name: p.name,
                  baseUrl: p.baseUrl,
                  defaultModel: p.model,
                  thinkingModel: p.thinkingModel ?? '',
                  thinkingMode: 'auto',
                  searchMode: 'auto',
                  passSearchParam: false,
                  reasoningEffort: 'auto',
                  models: provider.models.length ? provider.models : [p.model],
                })
              }
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
