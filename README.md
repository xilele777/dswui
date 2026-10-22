# DeepChat

照着 DeepSeek 网页端的交互与视觉重写的一个对话客户端，**前端直连任意 OpenAI 兼容接口**，所以你自己的中转站、自己的 Key、自己的模型都能用。

没有后端，没有账号体系，所有数据（对话、服务商配置、Key）只存在本机 `localStorage`。

## 快速开始

```bash
npm install
npm run dev          # 开发模式，http://localhost:5173
npm run build        # 产出「单文件」dist/index.html，双击即可用
```

`npm run build` 会把 JS/CSS/字体全部内联进一个 HTML（约 2 MB，主要是 KaTeX 数学字体），可以直接发给别人、放到任意静态托管。

## 接入你的中转站

点左下角头像旁的齿轮 → **服务商与密钥**：

| 字段 | 填法 |
| --- | --- |
| Base URL | `https://你的中转站.com/v1`（也可以直接贴完整的 `.../chat/completions`） |
| API Key | 中转站给你的 `sk-...` |
| 默认模型 | 例如 `deepseek-chat`、`gpt-4o-mini`、`claude-3-5-sonnet` |
| 深度思考用的模型 | 开启思考时切换到此模型；留空则用默认模型。思考协议和强度单独设置 |

填完点**拉取模型列表**，会请求 `GET {Base URL}/models`，成功后模型名可以下拉选择。

地址写成这几种都能识别：

```
https://api.xxx.com              → https://api.xxx.com/v1/chat/completions
https://api.xxx.com/v1           → https://api.xxx.com/v1/chat/completions
https://api.xxx.com/v1/chat/completions   → 原样使用
```

## 联网搜索与思考强度怎么配置

进入 **系统设置 → 服务商与密钥 → 联网与思考**，每个服务商单独保存配置。已知地址自动选择协议；任意中转域名无法说明其上游模型与参数支持情况，因此允许手动覆盖。

| 地址 / 上游协议 | 联网搜索 | 深度思考 |
| --- | --- | --- |
| OpenRouter `https://openrouter.ai/api/v1` | 自动发送 `plugins:[{"id":"web"}]` | `reasoning.enabled` + 所选 `reasoning.effort` |
| 百炼 `https://dashscope.aliyuncs.com/compatible-mode/v1`（也识别国际站和 `*.maas.aliyuncs.com`） | 自动发送 `enable_search:true`，需模型支持 | `enable_thinking`，可填 `thinking_budget` |
| DeepSeek `https://api.deepseek.com/v1` | 先请求 `/v1/tools/search`，再将网页资料交给模型 | 新模型用 `thinking.type` + `reasoning_effort`；旧 `deepseek-chat/reasoner` 保留模型切换 |
| 硅基流动 `https://api.siliconflow.cn/v1` / `.com` | 未默认启用搜索；需另行配置上游搜索能力 | 多数推理模型用 `enable_thinking` + 可选预算；V4 / GLM-5.2 用 `reasoning_effort` |
| 其他中转 | 选择它支持的 OpenRouter / 百炼 / `search_enabled` / DeepSeek 搜索协议，或自定义 JSON | 选模型切换、`reasoning_effort`、DeepSeek、OpenRouter、`enable_thinking`，或自定义 JSON |

**通用中转的操作步骤：**

1. 填入 Base URL、Key 和模型，拉取模型列表；模型也可以手动输入。
2. 查中转文档是否支持服务端联网。例如支持 OpenRouter 插件就选「OpenRouter web 插件」，支持百炼参数就选「百炼 enable_search」。仅仅兼容 `/chat/completions` 不表示支持联网。
3. 如果只有私有参数，选「自定义 JSON」，把其联网参数填入「联网开启参数 JSON」。参数直接合并到请求顶层，不要再套一层 `extra_body`。不能覆盖 `model`、`messages`、`stream`。
4. 选实际支持的思考协议。若只靠 `deepseek-reasoner` 一类固定推理模型工作，选「仅切换推理模型」；若中转接受 `reasoning_effort`，可以同时填写推理模型和选择强度。
5. 关闭设置，在输入框开启「深度思考」「智能搜索」。支持强度参数时，输入框会出现强度选择；按预算控制的模型在设置里填 Token 预算。

自定义思考示例（具体字段按中转文档调整）：

```json
{"reasoning":{"effort":"$effort"}}
```

`$effort` 会替换为所选强度，需要选具体档位；`$budget` 替换为设置中的思考预算（未填时为 8192）。可另填「思考关闭参数 JSON」，用于关闭默认开启的推理。设置里可展开预览生效参数。

强度档位由上游模型决定：DeepSeek 协议显示默认/低/高/最高，硅基 V4 显示默认/高/最高；通用协议提供候选档位，但中转可能不接受其中某些值。仅切换模型时不显示强度，`enable_thinking` 模式则使用 Token 预算。不能靠客户端开关让不支持推理的模型拥有推理能力；部分模型只返回答案、不返回思考过程。

联网返回来源时，会显示可展开的网页链接并写入 Markdown 导出。DeepSeek 独立检索失败会停止本次生成；服务端插件若静默忽略参数，客户端无法仅凭答案断定它执行过搜索。此版本没有通用 function tools 执行循环；中转若要求前端执行搜索工具，需要增加工具执行服务，或改用服务端插件。联网可能另行计费，浏览器直连仍需 CORS。

参考资料（2026-10-23 核对）：[OpenRouter 联网](https://openrouter.ai/docs/features/web-search)、[OpenRouter 思考](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)、[百炼联网](https://help.aliyun.com/zh/model-studio/web-search)、[DeepSeek 思考](https://api-docs.deepseek.com/guides/thinking_mode)、[DeepSeek 检索](https://api-docs.deepseek.com/guides/search)、[硅基流动参数](https://docs.siliconflow.cn/cn/api-reference/chat-completions/chat-completions)。

## 没 Key 也想看看效果？

仓库自带一个本地 mock 服务，会把整条流式链路（含思维链、代码块、表格、公式、usage）跑一遍：

```bash
npm run build
npm run mock          # 打开 http://127.0.0.1:8787
```

页面里填：Base URL = `http://127.0.0.1:8788/v1`，Key 随便写，模型选 `mock-reasoner`（带思维链）或 `mock-chat`。

另外，任意页面加 `?demo=1` 会载入一段静态演示对话（不联网），`?demo=1&theme=dark` 直接看深色。

## 关于 CORS（十有八九会碰到）

浏览器直连第三方接口，对方必须允许跨域。如果发送后提示：

> 请求没有发出去：Failed to fetch

说明中转站没开 CORS。三个办法，按推荐度排：

1. **换一个允许浏览器直连的中转**（多数商业中转都允许）。
2. **本地起一个反向代理**，把跨域问题收在代理层：

```js
// proxy.mjs  —— node proxy.mjs 后，Base URL 填 http://127.0.0.1:8788/v1
import http from 'node:http';
const UPSTREAM = 'https://你的中转站.com';   // 不要带 /v1

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();

  const up = http.request(
    UPSTREAM + req.url,
    { method: req.method, headers: { ...req.headers, host: new URL(UPSTREAM).host } },
    (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); },
  );
  up.on('error', (e) => { res.writeHead(502).end(String(e)); });
  req.pipe(up);
}).listen(8788, '127.0.0.1');
```

3. 用支持 CORS 的公开反代（不推荐，Key 会经过第三方）。

## 功能

- 多服务商 / 多 Key 切换，模型下拉，配置持久化
- 流式输出，逐字渲染；思维链独立折叠，带「已深度思考（用时 N 秒）」
- Markdown：标题 / 列表 / 表格 / 引用 / 任务列表 / 代码高亮 + 一键复制 / KaTeX 公式
- 停止生成、重新生成、复制消息、编辑用户消息并重发（用户消息不提供删除入口）
- 空白新对话为临时状态，发送首条消息后才进入历史；离开空对话不会留下历史条目
- 会话管理：置顶、重命名、删除、搜索（按标题和内容）、按时间分组
- 深浅色主题（跟随系统），移动端侧栏抽屉
- token 用量展示（服务端返回 `usage` 时）
- 导出单条 / 全部对话为 Markdown

## 快捷键

| 组合 | 作用 |
| --- | --- |
| `Enter` | 发送（可在设置里改成 ⌘/Ctrl+Enter） |
| `Shift + Enter` | 换行 |
| `⌘/Ctrl + J` | 新对话 |
| `⌘/Ctrl + K` | 搜索对话 |
| `/` | 聚焦输入框 |
| `Esc` | 关闭弹层 |

## 目录

```
src/
  api/                请求适配层
    endpoints.ts      URL 归一化（/v1、/chat/completions）
    sse.ts            只负责 SSE 分帧
    stream.ts         请求构造 + delta / reasoning / usage 映射
    models.ts         /models 拉取
  chat/               生成编排
    history.ts        消息树 → messages
    streamBuffer.ts   高频 delta 节流与最终快照
    controllers.ts    AbortController 注册表
    generation.ts     单条 assistant 消息的生成流程
    actions.ts        发送 / 重生成 / 编辑重发 / 删除
  store/              zustand + persist
    defaults.ts       默认服务商与设置
    slices/           sessions / providers / settings / ui 四个 slice
    selectors.ts      activeProvider / activeSession / getModelFor
  lib/                无 UI 依赖的小工具（剪贴板、导出、分组、节流）
  markdown/           markdown-it 规则：代码块 / 数学 / 外链
  app/hooks/          主题、快捷键、滚动、标题编辑、首屏初始化
  styles/             令牌 / 布局 / 消息 / 输入 / 弹层 / 响应式，按序 @import
  components/
    sidebar/          品牌头、会话列表、会话项、菜单、多选栏、账户菜单
    settings/         设置壳 + 通用 / 服务商 / 数据 / 协议四个 section
    message/          用户消息、助手消息、思维链、操作栏
    composer/         输入卡、工具栏、输入状态 hook
    chat/             欢迎页、顶栏、消息列表、悬浮目录、回到底部
    dialogs/          对话搜索
    ui/               通用遮罩层
    Markdown.tsx      Markdown 渲染 + 代码块复制事件委托
docs/                 对 chat.deepseek.com 的逆向分析报告
```

拆分原则：**协议解析 / 生成编排 / 持久化 / 纯展示组件**分层，组件只消费自己需要的 store 切片；样式按页面区块拆分，`styles/index.css` 只保留有序的 `@import`。

文档维护入口见 [`docs/文档索引.md`](./docs/文档索引.md)。每次体验或协议改动都追加到对应主题文档，并在 `docs/维护记录-YYYY-MM-DD.md` 留下当天记录，避免重复堆叠同类文件。

## 与官网的差异

| 官网 | 这里 |
| --- | --- |
| 上下文由服务端按消息树回溯 | 客户端每次组装全量 `messages` |
| 联网搜索 | 按服务商协议调用服务端插件，或先调用 DeepSeek Search API；返回来源时显示链接，未复刻官网完整搜索卡片 |
| 文件问答 | 未接入文件解析 |
| 语音朗读 | 使用浏览器 speechSynthesis |
| 断线自动续传 `resume_stream` | 中断后保留已收内容，可手动重生成 |
| 服务端 PoW 风控 | 不需要（直连中转站） |
| 多端同步 | 无，本地存储 + Markdown 导出 |

逆向细节（协议、SSE 事件机、片段模型、设计令牌取值）见：

- [`docs/deepseek-protocol-and-tokens.md`](./docs/deepseek-protocol-and-tokens.md) —— 协议与设计令牌
- [`docs/deepseek-ui-analysis-2026-10-22.md`](./docs/deepseek-ui-analysis-2026-10-22.md) —— 交互与渲染策略
- [`docs/deepseek-reconstructed-client-modules.md`](./docs/deepseek-reconstructed-client-modules.md) —— 可复用模块伪代码

## 安全提醒

API Key 以明文存在浏览器 `localStorage`。仅限个人本机使用；如果要部署成多人服务，请把 Key 放到自己的后端，前端只调你的后端。
