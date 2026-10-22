import { activeProvider, getModelFor, useStore } from '../../../store';
import { EFFORT_LABELS, THINKING_MODES, SEARCH_MODES, effectiveEffort, effortOptions, featureParams, providerFamily, resolveSearchMode, resolveThinkingMode } from '../../../api/capabilities';
import type { ReasoningEffort, SearchMode, ThinkingMode } from '../../../types';
import { Field, SettingRow } from '../controls';
import { Select } from '../../ui/Select';

export function ProviderCapabilities() {
  const provider = useStore(activeProvider);
  const updateProvider = useStore((s) => s.updateProvider);
  const patch = (next: Partial<typeof provider>) => updateProvider(provider.id, next);
  const thinking = resolveThinkingMode(provider);
  const search = resolveSearchMode(provider);
  const efforts = effortOptions(provider);
  let preview = '';
  try { preview = JSON.stringify({ model: getModelFor(provider, true), ...featureParams(provider, true, search !== 'none') }, null, 2); }
  catch (e) { preview = (e as Error).message; }

  return <div className="provider-capabilities">
    <div className="settings-section-title">联网与思考</div>
    <div className="capability-note">
      {providerFamily(provider) === 'unknown'
        ? '通用中转：地址无法确定上游能力，请按中转文档选择协议。自动模式支持切换推理模型或发送 reasoning_effort；联网需手动指定。'
        : '已按地址识别服务商。模型与中转仍需支持所选能力，也可以手动覆盖协议。'}
    </div>
    <SettingRow title="联网搜索协议" sub={search === 'none' ? '尚未配置联网，输入框会提示配置入口' : `当前：${SEARCH_MODES.find((o) => o.value === search)?.label}`}>
      <Select label="联网搜索协议" value={provider.searchMode ?? (provider.passSearchParam ? 'search_enabled' : 'auto')} options={SEARCH_MODES}
        onChange={(value) => patch({ searchMode: value as SearchMode, passSearchParam: false })} />
    </SettingRow>
    {search === 'custom' && <Field label="联网开启参数 JSON" hint='只在智能搜索开启时合并到请求顶层，例如 {"enable_search":true}；不能覆盖 model、messages、stream。'>
      <textarea aria-label="联网开启参数 JSON" rows={3} value={provider.searchParams ?? ''} onChange={(e) => patch({ searchParams: e.target.value })} placeholder={'{"enable_search":true}'} spellCheck={false} />
    </Field>}
    {search === 'deepseek' && <p className="capability-note">先调用同一地址下的 /tools/search，再把网页资料交给模型回答。中转需转发此接口，搜索可能单独计费。</p>}
    <SettingRow title="深度思考协议" sub={`当前：${THINKING_MODES.find((o) => o.value === thinking)?.label}`}>
      <Select label="深度思考协议" value={provider.thinkingMode ?? 'auto'} options={THINKING_MODES} onChange={(value) => patch({ thinkingMode: value as ThinkingMode })} />
    </SettingRow>
    {thinking === 'model' && <p className="capability-note">此模式仅切换模型，不附加思考参数。固定推理模型通常不能关闭内部推理或调整强度；需要可调强度时，选择模型支持的参数协议。</p>}
    {thinking === 'reasoning_effort' && <p className="capability-note">关闭时不附加 reasoning_effort，开启时发送所选强度。模型若默认推理，关闭按钮也不保证停止内部推理；请改用它支持的显式开关协议。</p>}
    {!!efforts.length && <SettingRow title="思考强度" sub="只在深度思考开启时发送；可接受档位取决于上游模型">
      <Select label="思考强度" value={effectiveEffort(provider)} options={efforts.map((value) => ({ value, label: EFFORT_LABELS[value] }))} onChange={(value) => patch({ reasoningEffort: value as ReasoningEffort })} />
    </SettingRow>}
    {(thinking === 'thinking_budget' || thinking === 'custom') && <Field label="思考 Token 预算" hint="留空由服务端决定。128–32768；具体模型可能限制更严。自定义 JSON 可用 $budget 引用（未填时为 8192）。">
      <input type="number" aria-label="思考 Token 预算" min={128} max={32768} step={128} value={provider.thinkingBudget ?? ''} placeholder="使用模型默认值" onChange={(e) => patch({ thinkingBudget: e.target.value === '' ? undefined : Number(e.target.value) })} />
    </Field>}
    {thinking === 'custom' && <>
      <Field label="思考开启参数 JSON" hint='例如 {"reasoning":{"effort":"$effort"}}。$effort 引用所选强度；$budget 引用思考预算。'>
        <textarea aria-label="思考开启参数 JSON" rows={3} value={provider.thinkingOnParams ?? ''} onChange={(e) => patch({ thinkingOnParams: e.target.value })} spellCheck={false} />
      </Field>
      <Field label="思考关闭参数 JSON" hint="留空表示关闭时不附加参数；若模型默认思考，请填写它实际支持的禁用参数。">
        <textarea aria-label="思考关闭参数 JSON" rows={2} value={provider.thinkingOffParams ?? ''} onChange={(e) => patch({ thinkingOffParams: e.target.value })} spellCheck={false} />
      </Field>
    </>}
    <details className="capability-preview"><summary>查看开启联网与思考时的参数</summary><pre>{preview}</pre></details>
    <p className="capability-note">思考过程仅在接口返回 reasoning_content、reasoning 或 reasoning_details 文本时展示；没有过程文本不代表模型未推理。</p>
  </div>;
}
