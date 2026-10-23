import type { Provider, ReasoningEffort, SearchMode, ThinkingMode } from '../types';

export const THINKING_MODES: { value: ThinkingMode; label: string }[] = [
  { value: 'auto', label: '自动识别' },
  { value: 'model', label: '仅切换推理模型' },
  { value: 'reasoning_effort', label: 'reasoning_effort' },
  { value: 'deepseek', label: 'DeepSeek thinking' },
  { value: 'openrouter', label: 'OpenRouter reasoning' },
  { value: 'thinking_budget', label: 'enable_thinking + 预算' },
  { value: 'siliconflow', label: '硅基 V4 / GLM 思考强度' },
  { value: 'custom', label: '自定义 JSON' },
];
export const SEARCH_MODES: { value: SearchMode; label: string }[] = [
  { value: 'auto', label: '自动识别' },
  { value: 'none', label: '不支持联网' },
  { value: 'openrouter', label: 'OpenRouter web 插件' },
  { value: 'enable_search', label: '百炼 enable_search' },
  { value: 'search_enabled', label: '中转 search_enabled' },
  { value: 'deepseek', label: 'DeepSeek Search API' },
  { value: 'custom', label: '自定义 JSON' },
];
export const EFFORT_LABELS: Record<ReasoningEffort, string> = {
  auto: '默认', minimal: '极低', low: '低', medium: '中', high: '高', xhigh: '极高', max: '最高',
};

export function providerFamily(provider: Provider) {
  let host = '';
  try { host = new URL(provider.baseUrl.trim()).hostname.toLowerCase(); } catch { /* incomplete URL */ }
  if (host === 'openrouter.ai') return 'openrouter';
  if (host === 'api.deepseek.com') return 'deepseek';
  if (host === 'api.siliconflow.cn' || host === 'api.siliconflow.com') return 'siliconflow';
  if (host === 'dashscope.aliyuncs.com' || host === 'dashscope-intl.aliyuncs.com' || host.endsWith('.maas.aliyuncs.com')) return 'dashscope';
  return 'unknown';
}

export function resolveThinkingMode(p: Provider): Exclude<ThinkingMode, 'auto'> {
  if (p.thinkingMode && p.thinkingMode !== 'auto') return p.thinkingMode;
  const family = providerFamily(p);
  const model = p.thinkingModel || p.defaultModel;
  if (family === 'openrouter') return 'openrouter';
  // 旧版 reasoner 为固定推理模型，不承诺可调强度。
  if (family === 'deepseek') return /^deepseek-(chat|reasoner)$/.test(model) ? 'model' : 'deepseek';
  if (family === 'siliconflow') return /deepseek-v4|glm-5\.2/i.test(model) ? 'siliconflow' : 'thinking_budget';
  if (family === 'dashscope') return 'thinking_budget';
  return p.thinkingModel ? 'model' : 'reasoning_effort';
}

export function resolveSearchMode(p: Provider): Exclude<SearchMode, 'auto'> {
  if (p.searchMode && p.searchMode !== 'auto') return p.searchMode;
  if (p.passSearchParam) return 'search_enabled';
  const family = providerFamily(p);
  if (family === 'openrouter') return 'openrouter';
  if (family === 'dashscope') return 'enable_search';
  if (family === 'deepseek') return 'deepseek';
  return 'none';
}

export function effortOptions(p: Provider): ReasoningEffort[] {
  switch (resolveThinkingMode(p)) {
    case 'model': case 'thinking_budget': return [];
    case 'deepseek': return ['auto', 'low', 'high', 'max'];
    case 'siliconflow': return ['auto', 'high', 'max'];
    case 'reasoning_effort': return ['minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
    default: return ['auto', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
  }
}

export function effectiveEffort(p: Provider, effort = p.reasoningEffort ?? 'auto'): ReasoningEffort {
  return effortOptions(p).includes(effort) ? effort : resolveThinkingMode(p) === 'reasoning_effort' ? 'high' : 'auto';
}

const reserved = new Set(['model', 'messages', 'stream', '__proto__', 'constructor', 'prototype']);
function mergeParams(target: Record<string, unknown>, source: Record<string, unknown>) {
  for (const [key, value] of Object.entries(source)) {
    const previous = target[key];
    if (previous && value && typeof previous === 'object' && typeof value === 'object' && !Array.isArray(previous) && !Array.isArray(value)) {
      target[key] = { ...previous, ...value };
    } else target[key] = value;
  }
}
export function parseFeatureParams(raw: string | undefined, label: string, effort: ReasoningEffort, budget: number): Record<string, unknown> {
  if (!raw?.trim()) return {};
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error(`${label}必须是有效的 JSON 对象`); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`${label}必须是 JSON 对象，例如 {"enable_search":true}`);
  const replace = (v: unknown): unknown => {
    if (v === '$effort') {
      if (effort === 'auto') throw new Error('自定义参数使用了 $effort，请先选择具体思考强度');
      return effort;
    }
    if (v === '$budget') return budget;
    if (Array.isArray(v)) return v.map(replace);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, replace(x)]));
    return v;
  };
  for (const key of Object.keys(parsed)) if (reserved.has(key)) throw new Error(`${label}不能覆盖 ${key}`);
  return replace(parsed) as Record<string, unknown>;
}

export function featureParams(p: Provider, thinking: boolean, search: boolean, requestedEffort?: ReasoningEffort, requestedBudget?: number) {
  const mode = resolveThinkingMode(p);
  const effort = effectiveEffort(p, requestedEffort);
  const budget = requestedBudget ?? p.thinkingBudget;
  if (['thinking_budget', 'custom'].includes(mode) && thinking && budget != null && (!Number.isInteger(budget) || budget < 128 || budget > 32768)) {
    throw new Error('思考预算需要是 128–32768 之间的整数');
  }
  const body: Record<string, unknown> = {};
  if (mode === 'deepseek') body.thinking = { type: thinking ? 'enabled' : 'disabled' };
  if (mode === 'openrouter') body.reasoning = thinking ? { enabled: true, ...(effort !== 'auto' ? { effort } : {}) } : { enabled: false };
  if (mode === 'thinking_budget' || mode === 'siliconflow') body.enable_thinking = thinking;
  if (thinking && mode === 'thinking_budget' && budget != null) body.thinking_budget = budget;
  if (thinking && ['deepseek', 'siliconflow', 'reasoning_effort'].includes(mode) && effort !== 'auto') body.reasoning_effort = effort;
  if (mode === 'custom') Object.assign(body, parseFeatureParams(thinking ? p.thinkingOnParams : p.thinkingOffParams, '自定义思考参数', effort, budget ?? 8192));
  if (thinking && mode === 'model' && !p.thinkingModel) throw new Error('请在「设置 → 服务商与密钥」填写深度思考模型，或选择参数协议');
  if (thinking && mode === 'custom' && !p.thinkingOnParams?.trim()) throw new Error('请先填写自定义思考开启参数');
  if (search) {
    switch (resolveSearchMode(p)) {
      case 'none': throw new Error('当前地址未识别到联网能力，请在「设置 → 服务商与密钥 → 联网搜索协议」选择中转实际支持的协议');
      case 'openrouter': body.plugins = [{ id: 'web' }]; break;
      case 'enable_search': body.enable_search = true; body.search_options = { enable_source: true }; break;
      case 'search_enabled': body.search_enabled = true; break;
      case 'custom':
        if (!p.searchParams?.trim()) throw new Error('请先填写自定义联网搜索参数');
        mergeParams(body, parseFeatureParams(p.searchParams, '自定义联网参数', effort, budget ?? 8192)); break;
    }
  }
  return body;
}
