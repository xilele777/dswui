import { uid, useStore } from './store';
import type { Message, Session } from './types';

const ANSWER = `SSE 的三种「断线」要分开处理，否则会出现重复半句或丢尾巴。

### 1. 传输层断了
\`fetch\` 的 \`response.body\` 会抛 \`TypeError\`，此时已经收到的 \`delta\` 是可信的，保留即可。

### 2. 服务端主动结束
正常结束会收到 \`finish\` / \`[DONE]\`，这和「异常中断」在数据层长得一样，必须靠**心跳**区分：

\`\`\`ts
const HEARTBEAT = 15_000;
let last = Date.now();

const timer = setInterval(() => {
  if (Date.now() - last > HEARTBEAT) {
    controller.abort();
    resume();          // 用 message_id 拉续传
  }
}, 5_000);
\`\`\`

### 3. 页面被切走
\`visibilitychange\` 触发时先记下光标位置，回来再决定是否续传。

| 场景 | 数据是否可信 | 处理 |
| --- | --- | --- |
| 心跳超时 | 可信 | 带 \`message_id\` 续传 |
| HTTP 4xx | 不可信 | 展示错误码 |
| 用户点停止 | 可信 | 标记 \`INCOMPLETE\` |

> 关键点：续传请求要带**最后一条片段的序号**，否则服务端不知道从哪继续。

单条消息的期望重试次数可以用指数退避估算：

$$E[T] = \\sum_{k=0}^{n} p^k (1-p)\\, 2^k \\tau$$

这样即使中转站抖动，也不会出现一段话被拼两遍。`;

const REASONING = `用户问的是流式接口的健壮性，本质是「中断后如何恢复」这一个问题。

先拆解中断来源：传输层、服务端、客户端主动。三者对数据完整性的影响不同，所以不能统一处理。

服务端已经提供了 resume_stream 接口，说明它自己也认为这是必须解决的问题 —— 那么客户端至少要有一个心跳检测，否则永远不知道连接是「卡住」还是「正在长思考」。

要注意的是：思考阶段可能几十秒没有正文 delta，所以心跳必须独立于内容，否则会把正常的长思考误判为断线。`;

export function loadDemoSession() {
  const now = Date.now();
  const sid = uid();

  const user: Message = {
    id: uid(),
    role: 'user',
    content: '流式输出经常断在半句话，前端应该怎么做得稳一点？',
    status: 'OK',
    createdAt: now - 60_000,
    thinkingEnabled: true,
  };

  const ai: Message = {
    id: uid(),
    role: 'assistant',
    content: ANSWER,
    reasoning: REASONING,
    reasoningMs: 12_000,
    status: 'OK',
    createdAt: now - 50_000,
    model: 'deepseek-reasoner',
    usage: { prompt_tokens: 218, completion_tokens: 476, total_tokens: 694 },
    thinkingEnabled: true,
  };

  const session: Session = {
    id: sid,
    title: '流式输出经常断在半句话',
    createdAt: now - 60_000,
    updatedAt: now,
    messages: [user, ai],
  };

  const st = useStore.getState();
  useStore.setState({
    sessions: [session, ...st.sessions.filter((s) => s.id !== sid)],
    activeSessionId: sid,
  });
  return sid;
}
