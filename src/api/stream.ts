import { chatEndpoint } from './endpoints';
import { readSse } from './sse';
import type { StreamOptions } from './types';
import { featureParams, resolveSearchMode } from './capabilities';
import { responseSources, searchContext } from './search';

function pickDelta(delta: unknown): { text: string; reasoning: string } {
  if (!delta || typeof delta !== 'object') return { text: '', reasoning: '' };
  const d = delta as Record<string, unknown>;
  const text =
    typeof d.content === 'string'
      ? d.content
      : Array.isArray(d.content)
        ? d.content.map((c: any) => c?.text ?? '').join('')
        : '';
  const reasoning =
    (typeof d.reasoning_content === 'string' && d.reasoning_content) ||
    (typeof d.reasoning === 'string' && d.reasoning) ||
    (typeof d.thinking === 'string' && d.thinking) ||
    (Array.isArray(d.reasoning_details) ? d.reasoning_details.map((r: any) => r?.text || r?.summary || '').join('') : '') ||
    '';
  return { text, reasoning };
}

async function parseHttpError(res: Response): Promise<string> {
  const raw = await res.text().catch(() => '');
  let msg = raw;
  try {
    const j = JSON.parse(raw);
    msg = j?.error?.message || j?.message || j?.error || raw;
    if (typeof msg !== 'string') msg = JSON.stringify(msg);
  } catch {
    /* keep raw */
  }
  return `HTTP ${res.status}：${msg.slice(0, 600) || '服务端没有返回内容'}`;
}

async function consumeJsonResponse(res: Response, opts: StreamOptions): Promise<void> {
  let j: any;
  try {
    j = await res.json();
  } catch {
    throw new Error('服务端返回了非流式内容，且无法解析');
  }
  if (j?.error) throw new Error(String(j.error.message || j.error));
  const m = j?.choices?.[0]?.message;
  const { text, reasoning } = pickDelta(m);
  if (reasoning) opts.onReasoning?.(reasoning);
  if (text) opts.onDelta(text);
  const sources = responseSources(j);
  if (sources.length) opts.onSources?.(sources);
  if (m?.tool_calls?.length) throw new Error('接口返回了需要客户端执行的工具调用。请改用服务端联网插件或 DeepSeek Search API；本客户端尚未执行通用 function tools。');
  if (j?.model) opts.onModel?.(j.model);
  if (j?.usage) opts.onUsage?.(j.usage);
}

export async function streamChat(options: StreamOptions): Promise<void> {
  let hasSources = false;
  const opts: StreamOptions = { ...options, onSources: (sources) => {
    if (!sources.length) return;
    hasSources = true;
    options.onSources?.(sources);
    options.onSearchStatus?.('complete');
  } };
  if (opts.search) opts.onSearchStatus?.('searching');
  try {
    await requestChat(opts);
    if (opts.search && resolveSearchMode(opts.provider) !== 'deepseek' && !hasSources) opts.onSearchStatus?.('unverified');
  } catch (error: any) {
    if (opts.search && error?.name !== 'AbortError') opts.onSearchStatus?.('error');
    throw error;
  }
}

async function requestChat(opts: StreamOptions): Promise<void> {
  const { provider, model, signal } = opts;
  const url = chatEndpoint(provider.baseUrl);
  const params = featureParams(provider, !!opts.thinking, !!opts.search, opts.reasoningEffort, opts.thinkingBudget);
  let messages = opts.messages;
  if (opts.search && resolveSearchMode(provider) === 'deepseek') {
    try { messages = await searchContext(opts); }
    catch (e: any) {
      if (e?.name === 'AbortError') throw e;
      throw new Error(`联网搜索未完成：${e?.message ?? e}`);
    }
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
    ...params,
  };
  if (opts.temperature != null) body.temperature = opts.temperature;
  if (opts.maxTokens != null) body.max_tokens = opts.maxTokens;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
        Accept: 'text/event-stream',
        ...(provider.headers ?? {}),
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    throw new Error(
      `请求没有发出去：${e?.message ?? e}\n\n常见原因：\n1. Base URL 写错（应形如 https://api.xxx.com/v1）\n2. 中转站未开启浏览器跨域（CORS），需要换支持 CORS 的中转，或用本地代理`,
    );
  }

  if (!res.ok) {
    throw new Error(await parseHttpError(res));
  }

  // 少数中转站会忽略 stream:true 直接返回整包 JSON
  if (!res.body || res.headers.get('content-type')?.includes('application/json')) {
    await consumeJsonResponse(res, opts);
    return;
  }

  await readSse(res.body, (payload) => {
    let json: any;
    try {
      json = JSON.parse(payload);
    } catch {
      return;
    }
    if (json?.error) throw new Error(String(json.error.message || json.error));
    if (json?.model) opts.onModel?.(json.model);
    if (json?.usage) opts.onUsage?.(json.usage);
    const choice = json?.choices?.[0];
    const sources = responseSources(json);
    if (sources.length) opts.onSources?.(sources);
    if (!choice) return;
    if (choice.delta?.tool_calls?.length) throw new Error('接口返回了需要客户端执行的工具调用，请改用服务端联网插件或 DeepSeek Search API。');
    const { text, reasoning } = pickDelta(choice.delta ?? choice.message);
    if (reasoning) opts.onReasoning?.(reasoning);
    if (text) opts.onDelta?.(text);
  });
}
