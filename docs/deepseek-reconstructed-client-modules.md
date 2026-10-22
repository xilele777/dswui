# 从公开前端包重构出的客户端模块

这份文档依据 2026-10-22 获取的 chat.deepseek.com 公开前端包整理，不是服务端源码，也不是原始 TypeScript 的完整恢复。压缩包可恢复客户端控制流和数据边界，但无法恢复原始变量名、类型和后端实现。

## 1. 按渲染成本延迟 Markdown 更新

公开包中的辅助逻辑接受 content、maxWait、enable、timeConsumingRate 和 getNow。它记录上一次真正提交的时间，并按最近更新耗时计算下一次允许提交的时间。

```js
import { useEffect, useMemo, useRef, useState } from "react";

export function useCostAwareContent({
  content, enabled, maxWait = 2000, timeConsumingRate = 2,
  getNow = () => performance.now(),
}) {
  const lastCommitAt = useRef(0);
  const nextCommitAt = useRef(0);
  const clock = useRef(getNow);
  const [committed, setCommitted] = useState(content);
  clock.current = getNow;

  useMemo(() => { lastCommitAt.current = clock.current(); }, [committed]);
  useEffect(() => {
    const now = clock.current();
    const budget = Math.min(maxWait,
      (now - lastCommitAt.current) * Math.max(1, timeConsumingRate));
    nextCommitAt.current = now + budget;
  }, [content, maxWait, timeConsumingRate]);
  useEffect(() => {
    if (clock.current() >= nextCommitAt.current) setCommitted(content);
  }, [content]);
  return enabled ? committed : content;
}
```

它把网络到达速度和 Markdown AST、代码、公式渲染速度解耦。正式实现时建议把提交时间记录改为明确的提交回调，避免把副作用放在 useMemo；上面保留的是压缩包控制流的可读化表达。

## 2. 自动跟随滚动

消息区维护 isFollowing：用户离开底部时停止自动跟随，回到底部或收到强制指令时恢复。生成中的回复高度变化时还会计算滚动补偿。

```js
export function createFollowScrollController(listRef) {
  let following = true;

  function onUserScroll() {
    const list = listRef.current?.listElRef.current;
    if (!list) return;
    following = list.scrollTop + list.offsetHeight >= list.scrollHeight - 1;
  }

  function requestFollowScroll() {
    if (!following) return;
    listRef.current?.submitScrollAdjustingTask?.(() => {});
    adjustStreamingMessage();
  }

  function forceScrollToBottom() {
    following = true;
    listRef.current?.scrollTo({ position: "bottom" });
  }

  function adjustStreamingMessage() {
    const list = listRef.current?.listElRef.current;
    if (!list || !following) return;
    const bottom = list.scrollHeight - list.clientHeight;
    list.scrollTo({ left: 0, top: Math.max(list.scrollTop, bottom),
      behavior: "instant" });
  }

  return { onUserScroll, requestFollowScroll, forceScrollToBottom,
    isFollowing: () => following };
}
```

原包还通过 data-virtual-list-item-key 找到当前 assistant message，读取 .ds-assistant-message-main-content 的 getBoundingClientRect()，在正文高度变化时维持视觉位置。

## 3. SSE 流式请求管线

公开包的生成路径发送 POST，检查 text/event-stream，在增量下载中读取 responseText 并交给 SSE 解析器，同时维护 AbortController、解析错误和非流式回退。独立客户端可以用标准 fetch 这样重构：

```js
export async function requestChatStream({ baseUrl, payload, signal, onEvent }) {
  const response = await fetch(`${baseUrl}/api/v0/chat/completion`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify(payload), signal,
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream")) {
    onEvent({ type: "non_stream_error",
      body: await response.json().catch(() => null), status: response.status });
    return;
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("ReadableStream is unavailable");
  const decoder = new TextDecoder();
  const parser = createSseParser(event => {
    try { onEvent({ type: event.event || "message", data: JSON.parse(event.data) }); }
    catch (error) { onEvent({ type: "parse_error", error, raw: event.data }); }
  });
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(decoder.decode(value, { stream: true }));
    }
    parser.feed(decoder.decode());
    onEvent({ type: "close" });
  } catch (error) {
    onEvent({ type: signal?.aborted ? "aborted" : "network_error", error });
  }
}
```

官网事件比通用 OpenAI 兼容接口丰富，独立客户端应归一化为 text_delta、reasoning_delta、usage、done、error。

## 4. 官网协议与自定义中转站

公开包中 completion 请求字段包括 chat_session_id、parent_message_id、model_type、prompt、ref_file_ids、thinking_enabled、search_enabled、source、action、preempt。这是官网会话协议，不应直接当作中转站协议。

```ts
type ChatRequest = {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  stream: true;
  temperature?: number;
};
type ProviderEvent =
  | { type: "text_delta"; text: string }
  | { type: "reasoning_delta"; text: string }
  | { type: "usage"; input: number; output: number }
  | { type: "done"; finishReason?: string }
  | { type: "error"; message: string; retryable?: boolean };
```

这样可以复刻交互层，同时隔离 Base URL、Key、模型和中转协议。Key 不应编译进静态页面；是否浏览器直连或增加自己的代理层取决于 CORS、部署方式和密钥保管要求。

## 能恢复与不能恢复

可以恢复：客户端请求路径、部分请求字段和流式控制流；虚拟列表、自动跟随、输入法处理和 Markdown 更新调度的核心思路；公开 CSS 中的布局、主题变量和动效参数。

不能仅靠前端包恢复：服务端模型编排、账户校验、配额和搜索后端；未触发功能的完整数据协议；原始变量名、类型定义、源码目录和构建配置；官网的服务端断线恢复语义。

证据资源：main.a34f79a498.js SHA-256 49d1f126646236b5aabb8ee530f5f0953b542ad36fd1f9fa073d3499b62ab71c；default-vendors.3473f64207.js SHA-256 2b0a5517ea9651adfdc364d01f2a46a5459c1db5c0056886823da43c54c71451；main.4591aecc90.css SHA-256 1f558783b65fbea0b8361bc90cde2bde90c626d8c65909477dd4997ab81cd1ae。
