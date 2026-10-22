export function AboutSection() {
  return (
    <div className="settings-about">
      <p>
        <b>DeepChat</b> —— 一个照着 DeepSeek 网页端交互逻辑重写的对话客户端，前端直连任意 OpenAI
        兼容接口，因此可以接你自己的中转站和 Key。
      </p>
      <p>
        设计要点来自对 <code>chat.deepseek.com</code> 线上产物的逆向分析：消息树、SSE
        事件机、思维链片段、Markdown 渲染管线、设计令牌（品牌色 <code>#3964fe</code>、侧栏{' '}
        <code>261px</code>、正文 <code>16px/28px</code>）等。
      </p>
      <p>
        所有数据（对话、服务商、Key）都存在本机 <code>localStorage</code>，没有后端。
        换电脑或清缓存会丢，重要对话请在「数据管理」中导出。
      </p>
      <p>
        若提示「请求没有发出去 / Failed to fetch」，通常是中转站没开 CORS。解决办法：换一个允许跨域的中转，
        或在本机起一个反向代理把请求转发过去。
      </p>
    </div>
  );
}
