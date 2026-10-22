/**
 * 逐块读取 SSE 响应，并把每个 `data:` 负载交给回调。
 * 只负责分帧，不关心 OpenAI / DeepSeek 的字段结构。
 */
export async function readSse(
  body: ReadableStream<Uint8Array>,
  onData: (payload: string) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const emitBlock = (block: string) => {
    for (const line of block.split(/\r?\n/)) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      onData(payload);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const block = buffer.slice(0, idx);
        const match = buffer.slice(idx).match(/^\r?\n\r?\n/);
        buffer = buffer.slice(idx + (match ? match[0].length : 2));
        if (block.trim()) emitBlock(block);
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) emitBlock(buffer);
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* noop */
    }
  }
}
