/**
 * 逐块读取 SSE 响应，并把每个 `data:` 负载交给回调。
 * 只负责分帧，不关心 OpenAI / DeepSeek 的字段结构。
 */
export async function readSse(
  body: ReadableStream<Uint8Array>,
  onData: (payload: string) => void,
): Promise<boolean> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  let completed = false;
  const emitBlock = (block: string) => {
    const data: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (!line.startsWith('data:')) continue;
      data.push(line.slice(5).replace(/^ /, ''));
    }
    const payload = data.join('\n').trim();
    if (payload === '[DONE]') completed = true;
    else if (payload) onData(payload);
  };

  try {
    while (!completed) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const block = buffer.slice(0, idx);
        const match = buffer.slice(idx).match(/^\r?\n\r?\n/);
        buffer = buffer.slice(idx + (match ? match[0].length : 2));
        if (block.trim()) emitBlock(block);
        if (completed) break;
      }
    }

    if (!completed) {
      buffer += decoder.decode();
      if (buffer.trim()) emitBlock(buffer);
    } else {
      await reader.cancel().catch(() => {});
    }
    return completed;
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
