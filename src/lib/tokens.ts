/** 粗略估算 token 数，仅用于本地提示，不参与请求。 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const rest = text.length - cjk;
  return Math.round(cjk * 1 + rest / 4);
}
