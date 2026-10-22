# DeepSeek 网页端深度逆向：协议、数据模型与设计令牌

> 取证对象：`chat.deepseek.com` 线上产物（commit-id `6c40ca01`，2026-10-22 抓取）
> 产物：`main.a34f79a498.js` 1,592,032 B／`default-vendors.3473f64207.js` 1,031,463 B／`main.4591aecc90.css` 296,392 B（均为解压后大小）
>
> 本文与 `deepseek-ui-analysis-2026-10-22.md`、`deepseek-reconstructed-client-modules.md` 互补：
> 那两份讲「交互与渲染策略」，这份讲「协议、事件机、数据模型、设计令牌」，即**真正决定复刻成本的那一层**。
>
> 标注约定：**【实证】**＝产物里能 grep 到原文；**【推断】**＝由多处证据交叉得出，产物里无直接断言；**【未找到】**＝产物中确无，不臆测。

---

## 0. 结论先行

DeepSeek 网页端的「完善」不来自某个黑科技组件，而来自四件事：

1. **消息不是字符串，是有序片段树**（`fragments[]` + `childIds` + `currentChildIndex`），所以「思考／正文／搜索／工具调用」能并存、能分别折叠、能重新生成出分支。
2. **SSE 不是「收到 delta 就追加」**，而是有 `ready → delta → close` 三态 + 心跳超时 + `resume_stream` 续传的事件机，所以断网不会把一段话拼两遍。
3. **能力位由服务端下发**（`model_configs` 带 `think_feature / vision / tts_feature / edit_quota / regenerate_quota`），前端只做能力到 UI 的映射，不做业务判断。
4. **设计是一套 token**（`--dsw-*` 340 个变量覆盖颜色／字号／高度／圆角／动效），所以深浅色、紧凑模式、RTL 不需要写第二套样式。

复刻时照抄这四层，工作量能降一个数量级；照抄视觉细节但忽略协议层，做到 80% 就会卡住。

---

## 1. 技术栈：从指纹到结论

| 项目 | 结论 | 证据（可在产物中 grep） |
| --- | --- | --- |
| 构建工具 | **Rspack**（非 Webpack） | main.js 出现 `data-rspack` 动态注入属性、`data-rspack-loading`、chunk 名 `"@deepseek/chat:"+id`；vendors 中 `rspackChunk` 全局 |
| CSS 处理 | **Lightning CSS** | main.css 中 4 处 `--lightningcss-light/--lightningcss-dark`（Lightning CSS 的 `light-dark()` 降级产物） |
| UI 框架 | **React 19**（另有一份 18.3.1 副本） | `e.version="19.2.7"`（React 导出对象）；`{bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"}`（DevTools 注入）。两者各出现 1 次 → **【推断】** 主应用为 19，18.3.1 是嵌套依赖遗留 |
| 状态管理 | **Zustand v5 + Immer** | `zustand/traditional` 迁移提示（v5 专属文案）；`set(state => ...)` 的 draft 风格更新；`__REDUX_DEVTOOLS_EXTENSION__` |
| 数据请求 | **SWR** | `window.__SWR_DEVTOOLS_USE__`、`$inf$`（SWR 内部 key） |
| 路由 | **React Router** | `__reactRouterVersion` 全局注入 |
| i18n | **自研字典**，非 i18next | main.js 内联 `{zh_CN:()=>(a),en:()=>(o)}`，330+ camelCase key 的中文字面量 |
| 输入框 | **原生 `textarea`** | `data-slate` / `slate-react` / `ProseMirror` / `monaco` 全部 **0 命中**（此前误报来自 `trans-late` 子串）；存在 `selectionStart`、`document.execCommand`、composition 处理 |
| Markdown | **自研渲染器** + Prism 分包 | 类名 `ds-markdown`／`ds-markdown-paragraph`／`ds-markdown-code-copy-button`；`markdown-it`/`remark`/`micromark` **0 命中** |
| 公式 | **KaTeX + LaTeX-WASM 双通道** | `latexRenderer:["katex","wasm"]`、`oE={inline:'<span class="katex">'...}`、失败时上报 `katexRenderFailLatexWasmSuccess` |
| 图表 | Mermaid，独立 chunk | `h.u` 映射里 `66233:"mermaidRender"` |
| 传输 | **自研 XHR 层 + 手写 SSE 解析** | `EventSource` **0 命中**、`getReader` **0 命中**；而是在 `onDownloadProgress` 里对 `responseText` 增量 `parse()` |
| 跨端 | **Web 与微信小程序同构** | 大量 `"miniprogram"===(0,eu.Ax)().platform` 分支；超时 600s 仅小程序侧 |
| 桌面端 | **Tauri** | `navigator.userAgent.includes("Tauri") \|\| "__TAURI__" in window` |
| 埋点 | 自研 tracker + Sentry | `__dsDataFinderStarted`；事件统一 `{name, message, payload}`，name 为 snake_case，message 为中文 |
| 字体 | Inter 子集 + `unicode-range` 分片 | `Inter-Regular-subset.*.woff2` 等 4 个字重 × 正/斜 |

**值得注意的一点**：他们**没有用浏览器原生 `EventSource`**。原因是 `EventSource` 只能 GET、不能带 body 和自定义头；而 DeepSeek 的 completion 是 POST + 自定义 PoW 头 + 需要中途 `abort`。这也是为什么你要自己写 SSE 解析器 —— 复刻时同样绕不开。

---

## 2. 完整接口地图【实证】

```
POST /api/v0/chat/completion            # 主对话（SSE）
POST /api/v0/chat/regenerate            # 重新生成
POST /api/v0/chat/continue              # 继续生成（截断后接上）
POST /api/v0/chat/edit_message          # 编辑用户消息并重发
POST /api/v0/chat/resume_stream         # 断线续传
POST /api/v0/chat/stop_stream           # 停止
POST /api/v0/chat/create_pow_challenge  # 反爬挑战
GET  /api/v0/chat/history_messages      # 会话消息树
POST /api/v0/chat/message_feedback      # 点赞/点踩
GET  /api/v0/chat/tts/{voices,voice}    # 朗读（Opus 解码 WASM）

POST /api/v0/chat_session/{create,delete,delete_all,fetch_page,update_title,batch_update_pinned}
POST /api/v0/file/{upload_file,fetch_files,fork_file_task}
POST /api/v0/index/{prepare,query}       # 文件向量化
POST /api/v0/share/{create,list,content,delete,fork}
GET  /api/v0/client/settings             # ← 关键：下发模型能力位
POST /api/v0/users/{settings,update_settings,create_email_verification_code,...}
GET  /api/v0/export_all , /api/v0/download_export_history
```

### 2.1 对话请求体（逐字段还原）

```jsonc
// POST /api/v0/chat/completion
{
  "chat_session_id": "…",
  "parent_message_id": null,        // null = 新会话第一条
  "model_type": "default",          // 服务端 model_configs 里的 key
  "prompt": "用户输入原文",
  "ref_file_ids": [],               // 引用的文件 id
  "thinking_enabled": true,         // 深度思考开关
  "search_enabled": false,          // 联网搜索开关
  "source": "…",                    // 入口来源，用于归因
  "action": null,
  "preempt": null                   // 抢占式生成：打字时先掐掉上一条
}
```

`regenerate` / `continue` / `edit_message` 的字段各不相同，唯独都带 `chat_session_id` + 一个消息 id，说明**服务端以消息树为准，不以客户端传的 messages 数组为准**。这是它和你接 OpenAI 兼容协议的**根本差异**：

| | DeepSeek 网页端 | OpenAI 兼容接口 |
| --- | --- | --- |
| 上下文来源 | 服务端按 `parent_message_id` 回溯 | 客户端每次传全量 `messages` |
| 分支 | 服务端 `childIds` 天然多叉 | 客户端自己维护 |
| 计费单位 | 服务端累计 `accumulated_token_usage` | 每次返回 `usage` |

→ **复刻必然要换成「客户端组装 messages」**，这是无法回避的重写点，也是本仓库 `src/chat/history.ts#buildHistory` 做的事。

### 2.2 PoW 反爬（不是验证码）

```js
// 先要挑战
POST /api/v0/chat/create_pow_challenge  { target_path: "/api/v0/chat/completion" }
// 返回 { challenge: { algorithm, challenge, salt, difficulty, signature, expire_at } }
// 本地算出答案，base64 后塞进自定义请求头（头名由 addSSEHeader() 给）
```

`r1PowComputeFail` / `POW_HEADER_ERROR` / `INVALID_POW_RESPONSE` 三个错误码互为佐证。挑战计算**在 Worker 里跑**（产物中有 Worker 构造调用位于挑战相关代码），避免卡住主线程。

**代价**：第三方客户端想直连官方接口，必须实现同一套 PoW。这也是「为什么只能用自己的中转站」的技术原因之一 —— 不是不能，而是每加一道风控你就得跟一次。

---

## 3. SSE 事件机：韧性设计的核心【实证】

服务端会发这些 `event:`，客户端在 `SC.onServerEvent()` 里分流：

| event | 载荷 | 客户端动作 |
| --- | --- | --- |
| `ready` | `response_message_id`, `request_message_id`, `model_type` | 落库真实消息 id，**开启 60s 就绪超时计时** |
| `delta` | 增量 JSON，被 `deltaParser.parse()` 展开成多个片段 | 按 `type` 追加到对应 fragment |
| `close` | `click_behavior` | 本轮结束，按行为决定是否提示 |
| `finish` | — | 收尾、结算 usage |
| `title` | 自动生成的会话标题 | 更新侧栏（标题是服务端生成的，不是截首句） |
| `toast` | `type/content/finish_reason` | 弹提示（限流、审核等） |
| `hint` | `content/type/clear_response` | 内联提示条，可选择清空已生成内容 |
| `update_session` | `updated_at` | 侧栏排序 |
| `update_parent_message` | `chat_message` | 父消息被改写（编辑分支场景） |
| `update_file` | 文件解析状态 | 附件卡片状态 |

配套的三道保险：

1. **心跳头**：`x-ds-sse-heartbeat-timeout-secs` —— 服务端告诉客户端「多久没数据算死」。
2. **ready 超时**：60s 内没 `ready` 就主动中断，上报 `SSEReadyTimeout`。因为思考阶段可能几十秒没有正文 delta，**心跳必须独立于内容**，否则长思考会被误判为断线。
3. **续传**：`/api/v0/chat/resume_stream` 带 `message_id` 继续；若服务端已经生成完，会回 `RESUME_MESSAGE_GOT_FULL_MESSAGE_CODE` 把整条消息直接给你。

错误码到文案的映射也是一张表（`Sk.*` → i18n key），例如：

```
INVALID_SESSION_ID        → hintInvalidParams
MAX_MESSAGE_COUNT_REACHED → hintMaxMessageCount
LAST_MESSAGE_IS_WIP       → hintLastMessageIsWIP（可重试）
PARENT_MESSAGE_IS_LOCKED  → msgGeneratingTryLater
SEARCH_CANNOT_WITH_FILE   → hintMessageSearchWithFileError
IP_ACCESS_RESTRICTED      → operationTooFastToast
```

**这套「事件机 + 错误码表」是复刻时最该抄、也最容易漏的部分。** 大多数人只实现 `data:` 里的 `delta`，于是停止、限流、审核、断线全变成「转圈」。

---

## 4. 数据模型：fragments 与消息树【实证】

一条消息标准化后的形状（`nc()` 映射函数原文）：

```js
{
  id, renderKey, parentId,
  role: 'USER' | 'ASSISTANT',
  status,              // OK | WIP | INCOMPLETE | TIMEOUT | CONTEXT_LENGTH_EXCEEDED
  quasiStatus,         // 中间态（如“正在搜索”）
  childIds, currentChildIndex,   // ← 多叉分支
  accumulatedTokenUsage,
  feedback, banRegenerate,
  searchEnabled, searchTriggered,
  thinkingEnabled,
  fragments: [...],    // ← 内容是有序片段
  hasPendingFragment, isContinuing,
  conversationMode,    // DEFAULT | SEARCH | ...
  extraSearchProviders,
  localInterrupted, incompleteMessage
}
```

片段类型（在产物中可 grep 到的字面量）：

- `THINK`：思维链，可折叠，独立计时
- `RESPONSE`：正文
- `SEARCH`：联网检索结果，带 `results[]`（`url/title/snippet/publishedAt/siteName/siteIcon/provider`）
- `TIP`：内联提示
- `TOOL_OPEN` / `TOOL_SEARCH`：工具调用，`TOOL_SEARCH` 的 `results.at(index)` 被引用卡片按索引取用

**为什么这层设计值得照抄**：如果只存 `content: string`，你没法表达「思考先流、正文后流、搜索卡片插在中间、正文里还有 `[citation:3]` 角标」；一旦要支持重新生成，还得把整条消息重算一遍。用片段数组，UI 就是 `fragments.map(renderByType)`，重新生成只是换一个 `childId`。

**复刻的最小可用版本**：`{ content, reasoning, status, usage }`（本仓库采用），把 `fragments` 留成后续扩展点 —— 一旦要加「搜索卡片」「工具调用」就必须升级成片段数组。

---

## 5. 能力位：UI 不是写死的【实证】

`GET /api/v0/client/settings` 返回 `model_configs`，每个模型自带能力位：

```jsonc
{
  "model_type": "…", "name": "…", "desc": "…",
  "enabled": true, "switchable": true, "is_default": false,
  "think_feature": true,     // 是否显示“深度思考”
  "vision": true,            // 是否允许传图
  "file_feature": true,      // 是否允许传文件
  "tts_feature": true,       // 是否显示“朗读”
  "edit_quota": 5,           // 编辑次数配额
  "regenerate_quota": 10,    // 重生成配额
  "show_model_name_in_session": true
}
```

UI 侧的写法是**映射**而不是判断：

```js
// 有 think_feature 才渲染开关，有 tts_feature 才渲染喇叭
i = !!(modelConfig?.tts_feature)   // → 决定朗读按钮是否挂载
m = thinkingEnabled && !!modelConfig?.think_feature
```

**这是「设计得完善」的核心手法**：新模型上线不需要发前端版本，运营改配置即可。复刻时对应到本仓库的 `Provider.thinkingModel / passSearchParam`，虽然简陋，但保留了同一个思路 —— **能力由配置驱动，不由代码硬编码**。

---

## 6. 设计令牌：可以直接抄的数值【实证】

### 6.1 颜色

品牌色是 `--dsw-static-deepseek-500: #3964fe`（不是常见的 #4D6BFE）。

```
deepseek-50  #edf3fe   deepseek-300 #b7c8fe   deepseek-500 #3964fe   deepseek-800 #34415b
deepseek-100 #e4edfd   deepseek-400 #679efe   deepseek-600 #4868b2   deepseek-900 #283142
deepseek-200 #d3e2ff   deepseek-450 #5686fe
```

中性色是**带蓝调的灰**（`neutral-bluish`），这是 DeepSeek 视觉「不脏」的关键：

```
00   #ffffff   300  #cfd3d6   700  #61666b   900  #1b1b1c
50   #f9fafb   400  #adb2b8   750  #43454a   950  #151517
75   #f1f3f5   500  #979da6   800  #353638   1000 #0f1115
100  #ebeef2   600  #81858c   850  #2c2c2e
150  #e9ecf2                 875  #232324
200  #e1e5ee
```

语义别名（浅色／深色两套）：

| 别名 | 浅色 | 深色 |
| --- | --- | --- |
| `bg-base` | `#ffffff` | `#151517` |
| `bg-layer-1/2/3` | `#fff/#fff/#fff` | `#1b1b1c/#232324/#2c2c2e` |
| `label-primary` | `#0f1115` | `#f9fafb` |
| `label-secondary` | `#61666b` | `#adb2b8` |
| `label-tertiary` | `#81858c` | `#adb2b8`(≈) |
| `border-l1` | `rgba(0,0,0,.04)` | `rgba(255,255,255,.06)` |
| `interactive-bg-hover` | `rgba(38,49,72,.06)` | `rgba(255,255,255,.08)` |

状态色：`red-600 #ec1313`、`green-500 #22c55e`、`blue-500 #3b82f6`。

### 6.2 度量

| 项 | 值 | 用途 |
| --- | --- | --- |
| 侧栏宽 | `261px`（`--sider-width`） | 固定 + `max-width` 双动画收起 |
| 消息列表最大宽 | `840px`（桌面）/ `712px`（窄屏） | `--message-list-max-width` |
| 列表水平内边距 | `44px` | `--message-list-padding-horizontal` |
| 正文排版 | `16px / 28px` | `--dsw-font-markdown-base` |
| 段落间距 | `16px`（生成中 `8px`，嵌套 `2px`） | `.ds-markdown-paragraph` |
| 输入卡圆角 | `24px` | `--dsl-input-*` |
| 输入卡最小高 | `44px` | |
| 控件高度档位 | `xs/s/m/l/xl` | `--ds-control-height-*`（m=36px） |
| 断点 | `768px` | 侧栏从 fixed 变 relative |
| 动效 | `0.3s cubic-bezier(.4,0,.2,1)` | `--ds-transition-duration-slow` / `--ds-ease-in-out` |

### 6.3 结构手法

- **侧栏收起**用 `transform: translateX(-100%)` **加** `max-width: 0` 同时动画 —— 只做 transform 会留下占位空白，只做 max-width 会触发大量重排。
- **组件类名**是 `ds-` BEM（`ds-button--primary` / `ds-button--xs` / `ds-button__icon`），**业务类名**是 CSS Modules 哈希（`dc04ec1d`）。两层分离，改业务不影响组件库。
- **深浅色**不是两份 CSS，而是 `.dark` 改 token 值 + `color-scheme` 声明；`prefers-color-scheme` 只作为默认。
- **字体**用 `unicode-range` 切成子集，中文字符回落到系统字体 —— 英文用 Inter，中文不下载字体包，首屏省几百 KB。

---

## 7. 十二个值得抄的工程决策

1. **服务端下发能力位**，前端只做映射。新模型不发版。
2. **内容用片段数组**，不用字符串。折叠、分支、工具调用全靠它。
3. **SSE 三段式**（ready/delta/close）+ 心跳 + 续传，而不是「收到就追加」。
4. **错误码 → 文案 key 的映射表**，一处集中，不散落在组件里。
5. **PoW 放 Worker**，不阻塞输入。
6. **输入框用 textarea**，不为一个聊天框引入富文本编辑器；只补 composition、自动高度、粘贴。
7. **Markdown 按渲染成本节流**（上游实现带 `timeConsumingRate` 和 `maxWait`，按上次渲染耗时决定下次提交时机）。
8. **代码高亮按语言分包**（`prism-common` / `prism-m-r` / `prism-s-z` / `prism-web-t`），首屏只下公共部分。
9. **公式双通道**（KaTeX 快速路径 + WASM 精确路径），失败降级而不是白屏。
10. **自动滚动分状态**（用户上滚即停止跟随，回到底部才恢复），而不是永远 `scrollIntoView`。
11. **Web / 小程序同构**：把 `http`、`tracker`、`base64`、`platform` 抽成注入式上下文，一套业务跑两端。
12. **埋点统一形态**（`{name, message, payload}`，name 英文、message 中文），日志可读且可聚合。

---

## 8. 复刻什么、放弃什么

| 官网能力 | 复刻难度 | 本仓库的做法 |
| --- | --- | --- |
| 侧栏 / 消息流 / 输入卡 | 低 | 已还原（令牌级取色与度量） |
| Markdown + 代码 + 公式 | 低 | markdown-it + hljs + KaTeX，自绘代码块头部 |
| 深度思考折叠 | 低 | `reasoning_content` 映射成 THINK 区 |
| 停止 / 重生成 / 编辑分支 | 中 | 本地截断 + 重建，等价于「换 childId」 |
| 流式韧性 | 中 | AbortController + 60ms 合并刷新 + 中断标记 |
| 联网搜索卡片 | 高 | 已支持多种服务端搜索参数和 DeepSeek 独立检索，显示来源链接；未复刻完整官网检索卡片 |
| 文件问答 / 向量化 | 高 | 未做（需服务端） |
| PoW / 账号体系 | —— | 不做：直连中转站不需要，也不需要 |
| 多端同步 | 高 | 不做：localStorage，提供导出 |

**一句话**：官网那套「会话树 + 片段」是**为了服务端做上下文管理与计费**，你用 OpenAI 兼容协议时不需要服务端树；但**事件机、节流、能力位、令牌**这四层是纯客户端收益，照抄即可。

---

## 9. 复现本文证据的方法

```bash
# 1. 抓入口，读出两个 bundle 地址（HTML 里有 commit-id）
curl -s https://chat.deepseek.com/ | grep -o 'https://fe-static[^"]*\.js'

# 2. 下载并解压（请求头必须带 Accept-Encoding: br）
# 3. 直接 grep 本文的关键字即可复核：
#    data-rspack / lightningcss / rendererPackageName:"react-dom" / e.version="19
#    "zustand/traditional" / __SWR_DEVTOOLS_USE__ / __reactRouterVersion / __TAURI__
#    text/event-stream / x-ds-sse-heartbeat-timeout-secs / resume_stream
#    create_pow_challenge / accumulated_token_usage / fragments / think_feature
#    --dsw-static-deepseek-500 / --sider-width / --message-list-max-width
```

注意两点，否则会得到相反结论：

- **`slate` 是假阳性**：`trans-late` 里包含 `slate`。判定富文本编辑器要看 `data-slate-editor` / `createEditor`，本次 0 命中。
- **`EventSource` 0 命中不等于不做 SSE**：他们把解析器写在自己的 XHR 适配层里，搜 `text/event-stream` 才有结果。

## 10. 通用中转的联网与思考（2026-10-23）

官网的 `thinking_enabled/search_enabled` 不能直接等同于任意 Chat Completions 中转参数。新增 `api/capabilities.ts`，按真实主机识别 OpenRouter、DeepSeek、百炼、硅基流动；通用域名保留手动协议选择与 JSON 参数覆盖，不对未知站点进行盲目试请求。

- 搜索：OpenRouter `plugins:[{id:'web'}]`；百炼 `enable_search`；兼容旧配置 `search_enabled`；自定义顶层 JSON。未知站点自动模式显示未配置，点击搜索打开服务商配置。
- DeepSeek：依据当前公开 Search API，调用同一 Base URL 下的 `/tools/search`（query 最多 128 个 Unicode 字符，count=5、need_content=true），将结果插入本轮请求并提示模型引用。不是官网私有搜索接口，也不是多轮自主浏览；失败会报错并停止，不回退成无搜索回答。
- 思考：模型切换独立于参数协议，可同时使用；支持 `reasoning_effort`、DeepSeek `thinking.type`、OpenRouter `reasoning`、`enable_thinking/thinking_budget`、硅基 V4 强度以及自定义开关 JSON。候选强度不代表所有模型都支持相同档位。固定推理模型通常不能控制内部推理开关。
- 自定义参数可引用 `$effort/$budget`，非法 JSON 与覆盖 model/messages/stream 会在发请求前拒绝。参数仅在相应开关开启时发送，思考关闭可提供单独 JSON。
- 发送时保存强度与预算到用户消息，重生成与编辑重发沿用；接口返回的 `reasoning_details` 文本、URL annotations、非流式 JSON 也能解析。来源按 URL 去重并展示、导出。
- 不支持客户端通用 function tools 执行；遇到工具调用直接给出说明。模型内部推理不可见时，不伪造思考过程。中转静默忽略参数也无法由前端保证检测。

配置步骤与官方文档链接统一放在 [README](../README.md#联网搜索与思考强度怎么配置)。验证使用隔离浏览器和模拟 HTTP/SSE，不消耗用户真实 API 配额。
