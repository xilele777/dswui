import type { Provider } from '../types';
import { modelsEndpoint } from './endpoints';

export async function fetchModels(p: Provider): Promise<string[]> {
  const url = modelsEndpoint(p.baseUrl);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${p.apiKey}`, ...(p.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}：${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  const list = (j?.data ?? j?.models ?? []) as any[];
  return list
    .map((m) => (typeof m === 'string' ? m : m?.id ?? m?.name))
    .filter(Boolean)
    .sort();
}
