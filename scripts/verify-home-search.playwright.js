async (page) => {
  const context = await page.context().browser().newContext({ viewport: { width: 1200, height: 820 } });
  const p = await context.newPage();
  const passed = [], requests = [], errors = [];
  const check = (ok, label) => { if (!ok) throw new Error(label); passed.push(label); };
  p.on('pageerror', (error) => errors.push(error.message));
  let failSearch = false, responseMode = 'sources';
  await p.route('**/tools/search', (route) => {
    requests.push(route.request().postDataJSON());
    return route.fulfill(failSearch ? { status: 404, body: 'search unavailable' } : {
      contentType: 'application/json', body: JSON.stringify({ results: [{ title: '检索网页', url: 'https://example.com/search', content: '本次检索的事实资料' }] }),
    });
  });
  await p.route('**/chat/completions', (route) => {
    requests.push(route.request().postDataJSON());
    if (responseMode === 'json') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: '整包回答', reasoning_content: '整包思考', annotations: [] } }], output: { search_info: { search_results: [{ title: '整包来源', url: 'https://example.com/json' }] } } }) });
    const events = [
      { choices: [{ delta: { reasoning_content: '结合网页资料进行思考。' } }] },
      { choices: [{ delta: { content: '根据检索资料回答。', annotations: [] } }], ...(responseMode === 'sources' ? { search_info: { search_results: [{ title: '原生搜索来源', url: 'https://example.com/native' }] } } : {}) },
    ];
    return route.fulfill({ contentType: 'text/event-stream', body: events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('') + 'data: [DONE]\n\n' });
  });
  const setup = () => p.evaluate(async () => {
    const { useStore } = await import('/src/store/index.ts');
    const state = useStore.getState();
    state.updateProvider(state.activeProviderId, { apiKey: 'fixture', baseUrl: 'https://fixture.example/v1', defaultModel: 'fixture', thinkingModel: '', thinkingMode: 'deepseek', searchMode: 'deepseek' });
  });
  const send = () => p.evaluate(async () => {
    const { sendMessage } = await import('/src/chat/actions.ts');
    await sendMessage('查询今天的信息', { thinking: true, search: true });
  });
  try {
    await p.goto('http://127.0.0.1:5173/');
    await p.locator('.session-empty').waitFor();
    check(await p.locator('.session-empty').evaluate((el) => {
      const list = el.parentElement.getBoundingClientRect(), box = el.getBoundingClientRect();
      return !!el.querySelector('svg') && Math.abs(box.x + box.width / 2 - list.x - list.width / 2) < 1 && Math.abs(box.y + box.height / 2 - list.y - list.height / 2) < 1;
    }), '空历史图标及文字居中');
    check(await p.evaluate(async () => {
      const { pickWelcomeMessage } = await import('/src/components/chat/welcomeMessages.ts');
      return [[6, 0, '早上好'], [10, 59, '早上好'], [13, 0, '下午好'], [17, 29, '下午好'], [17, 30, '晚上好'], [21, 59, '晚上好'], [11, 0, '欢迎回来'], [22, 0, '欢迎回来']].every(([h, m, text]) => pickWelcomeMessage(new Date(2026, 9, 23, h, m), 0.999).startsWith(text));
    }), '欢迎语遵循官网时段边界');
    const greeting = await p.locator('h1').innerText();
    await setup();
    await p.getByRole('button', { name: '深度思考', exact: true }).click();
    check(greeting === await p.locator('h1').innerText(), '欢迎语在当前页面交互时保持稳定');
    await send();
    await p.locator('.think .message-sources').first().waitFor();
    check(requests[1].thinking.type === 'enabled' && requests[1].messages.some((m) => m.content.includes('本次检索的事实资料')), '检索资料与思考参数同时送入模型');
    await p.locator('.think .search-step').first().click();
    check(await p.locator('.search-sources-panel a').count() === 1 && await p.locator('.think .md-muted').innerText() === '结合网页资料进行思考。', '独立检索节点打开来源面板并保留思考正文');
    await p.getByRole('button', { name: '关闭搜索结果' }).click();
    check(await p.locator('.think .search-step').count() === 2, '后到来源按顺序生成节点，空 annotations 不遮挡来源');
    await p.screenshot({ path: 'docs/local-probe/home-search-thinking.png' });
    await p.getByRole('button', { name: '返回主页', exact: true }).click();
    await p.locator('h1').waitFor();
    check(await p.locator('.session-item').count() === 1, '品牌图标返回主页且保留历史');
    await p.locator('.session-item').click();
    await p.getByRole('button', { name: '收起边栏', exact: true }).click();
    await p.locator('.collapsed-brand').click();
    await p.locator('h1').waitFor();
    check(await p.locator('.collapsed-brand').isVisible(), '收起侧栏时品牌图标仍返回主页');
    failSearch = true;
    const before = requests.length;
    await send();
    await p.locator('.error-card').waitFor();
    check(requests.length === before + 1 && (await p.locator('.error-card').innerText()).includes('404') && (await p.locator('.message-sources').innerText()).includes('联网搜索暂不可用') && await p.locator('.think').count() === 0, '搜索失败停止生成并结束加载状态');
    check(await p.evaluate(async () => {
      const { featureParams } = await import('/src/api/capabilities.ts');
      const { useStore, activeProvider } = await import('/src/store/index.ts');
      const result = featureParams({ ...activeProvider(useStore.getState()), thinkingMode: 'openrouter', reasoningEffort: 'high', searchMode: 'custom', searchParams: '{"reasoning":{"exclude":false},"plugins":[{"id":"web"}]}' }, true, true);
      return result.reasoning.enabled && result.reasoning.effort === 'high' && result.reasoning.exclude === false && result.plugins[0].id === 'web';
    }), '自定义搜索参数保留已启用的思考与强度');
    const nativeSearch = () => p.evaluate(async () => {
      const { streamChat } = await import('/src/api/stream.ts');
      const { useStore, activeProvider } = await import('/src/store/index.ts');
      let text = '', reasoning = '', sources = [], status;
      await streamChat({ provider: { ...activeProvider(useStore.getState()), searchMode: 'enable_search' }, model: 'fixture', messages: [{ role: 'user', content: '查找资料' }], thinking: true, search: true, onDelta: (s) => text += s, onReasoning: (s) => reasoning += s, onSources: (s) => sources.push(...s), onSearchStatus: (s) => status = s });
      return { text, reasoning, sources, status };
    });
    const nativeBefore = requests.length;
    const native = await nativeSearch();
    check(requests.length === nativeBefore + 1 && requests.at(-1).enable_search && requests.at(-1).search_options.enable_source && requests.at(-1).thinking.type === 'enabled' && native.sources.length === 1 && native.reasoning && native.status === 'complete', '服务端联网携带思考参数、请求来源并解析来源');
    responseMode = 'json';
    const json = await nativeSearch();
    check(json.text === '整包回答' && json.reasoning === '整包思考' && json.sources[0].url === 'https://example.com/json' && json.status === 'complete', '非流式返回保留思考并读取 output.search_info 来源');
    responseMode = 'no-sources';
    const unverified = await nativeSearch();
    check(unverified.text && unverified.sources.length === 0 && unverified.status === 'unverified', '未返回来源时明确标记而不伪称搜索成功');
    await p.setViewportSize({ width: 390, height: 844 });
    await p.locator('.collapsed-brand').click();
    await p.locator('h1').waitFor();
    check(await p.locator('.collapsed-brand').isVisible() && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '移动端返回主页无横向溢出');
    check(errors.length === 0, '浏览器无运行错误');
    return { passed };
  } finally { await context.close(); }
}
