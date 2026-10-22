export function normalizeBase(baseUrl: string): string {
  return (baseUrl || '').trim().replace(/\/+$/, '');
}

export function chatEndpoint(baseUrl: string): string {
  const u = normalizeBase(baseUrl);
  if (!u) throw new Error('还没有配置 Base URL，请到「设置 → 服务商」里填写');
  if (/\/chat\/completions$/i.test(u)) return u;
  if (/\/v\d+(\.\d+)?$/i.test(u)) return `${u}/chat/completions`;
  return `${u}/v1/chat/completions`;
}

export function modelsEndpoint(baseUrl: string): string {
  const u = normalizeBase(baseUrl);
  if (/\/chat\/completions$/i.test(u)) return u.replace(/\/chat\/completions$/i, '/models');
  if (/\/v\d+(\.\d+)?$/i.test(u)) return `${u}/models`;
  return `${u}/v1/models`;
}
