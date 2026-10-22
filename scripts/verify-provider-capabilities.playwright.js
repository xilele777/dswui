async (page) => {
  const context = await page.context().browser().newContext({ viewport: { width: 1200, height: 820 }, locale: 'zh-CN' });
  const p = await context.newPage();
  const errors = [], results = [], requests = [];
  const check = (ok, label) => { if (!ok) throw new Error(label); results.push(label); };
  p.on('pageerror', (e) => errors.push(e.message));
  let responseMode = 'sse';
  await p.route('**/chat/completions', async (route) => {
    requests.push({ url: route.request().url(), body: route.request().postDataJSON() });
    if (responseMode === 'json') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ model: 'test', choices: [{ message: { content: '完整回答', reasoning: '整包思考', annotations: [{ type: 'url_citation', url_citation: { title: '来源', url: 'https://example.com/source' } }] } }] }) });
    if (responseMode === 'error') return route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'data: {"error":{"message":"搜索插件不可用"}}\n\n' });
    return route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'data: {"choices":[{"delta":{"reasoning_details":[{"type":"reasoning.text","text":"检查来源。"}]}}]}\n\ndata: {"choices":[{"delta":{"content":"测试回答","annotations":[{"type":"url_citation","url_citation":{"title":"参考网页","url":"https://example.com/source"}}]}}]}\n\ndata: [DONE]\n\n' });
  });
  let searchMode = 'ok';
  await p.route('**/tools/search', async (route) => {
    requests.push({ url: route.request().url(), body: route.request().postDataJSON() });
    if (searchMode === 'error') return route.fulfill({ status: 404, body: 'not supported' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [{ title: '真实检索资料', url: 'https://example.com/search', summary: '可引用的最新资料' }, { title: '无效地址', url: 'javascript:alert(1)', summary: '无效' }] }) });
  });
  const call = (provider, options = {}) => p.evaluate(async ({ provider, options }) => {
    const { streamChat } = await import('/src/api/stream.ts');
    let text = '', reasoning = '', sources = [], error = '';
    try { await streamChat({ provider: { id: 'test', name: '测试', apiKey: 'fixture-key', models: [], defaultModel: 'test-model', ...provider }, model: provider.thinkingModel || 'test-model', messages: [{ role: 'user', content: '本周的新消息' }], ...options, onDelta: (s) => text += s, onReasoning: (s) => reasoning += s, onSources: (s) => sources.push(...s) }); }
    catch (e) { error = e.message; }
    return { text, reasoning, sources, error };
  }, { provider, options });
  const lastBody = () => requests.at(-1)?.body;
  try {
    await p.goto('http://127.0.0.1:5173/');
    const unknown = { baseUrl: 'https://relay.example/v1' };
    await call(unknown, { thinking: true });
    check(lastBody().reasoning_effort === 'high', 'Unknown relay enables thinking using reasoning_effort=high by default');
    await call({ ...unknown, thinkingMode: 'reasoning_effort', thinkingModel: 'relay-reasoner', reasoningEffort: 'low' }, { thinking: true });
    check(lastBody().reasoning_effort === 'low' && lastBody().model === 'relay-reasoner', 'Model switching and selected effort both reach the request');
    await call(unknown, { thinking: false });
    check(!('reasoning_effort' in lastBody()), 'Generic effort omitted when thinking is off');
    const count = requests.length;
    const unavailable = await call(unknown, { search: true });
    check(unavailable.error.includes('未识别到联网能力') && requests.length === count, 'Unknown relay does not silently ignore requested search');
    await call({ ...unknown, passSearchParam: true }, { search: true });
    check(lastBody().search_enabled === true, 'Legacy search_enabled configuration is preserved');
    const streamed = await call({ baseUrl: 'https://openrouter.ai/api/v1', reasoningEffort: 'low' }, { thinking: true, search: true });
    check(lastBody().plugins[0].id === 'web' && lastBody().reasoning.effort === 'low' && !lastBody().search_enabled, 'OpenRouter auto detection sends web plugin and reasoning.effort');
    check(streamed.reasoning === '检查来源。' && streamed.sources[0].url === 'https://example.com/source', 'Streaming reasoning_details and citations are consumed');
    await call({ baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', thinkingBudget: 4096 }, { thinking: true, search: true });
    check(lastBody().enable_search === true && lastBody().enable_thinking === true && lastBody().thinking_budget === 4096, 'DashScope auto detection sends search, thinking and token budget');
    await call({ baseUrl: 'https://api.siliconflow.cn/v1', defaultModel: 'deepseek-ai/DeepSeek-V4-Flash', reasoningEffort: 'max' }, { thinking: true });
    check(lastBody().enable_thinking === true && lastBody().reasoning_effort === 'max', 'SiliconFlow V4 sends supported effort protocol');
    await call({ baseUrl: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-flash', reasoningEffort: 'max' }, { thinking: true, search: true });
    check(requests.at(-2).url.endsWith('/v1/tools/search') && lastBody().thinking.type === 'enabled' && lastBody().reasoning_effort === 'max', 'DeepSeek auto detection searches before generating with selected effort');
    check(lastBody().messages.some((m) => m.role === 'system' && m.content.includes('可引用的最新资料')) && lastBody().messages.at(-1).content === '本周的新消息', 'Retrieved source text reaches model while original question is preserved');
    searchMode = 'error';
    const beforeFailure = requests.length;
    const failedSearch = await call({ ...unknown, searchMode: 'deepseek' }, { search: true });
    check(failedSearch.error.includes('404') && requests.length === beforeFailure + 1, 'Failed search stops generation instead of claiming successful web access');
    searchMode = 'ok';
    await call({ ...unknown, thinkingMode: 'custom', thinkingOnParams: '{"vendor_thinking":{"effort":"$effort","budget":"$budget"}}', thinkingOffParams: '{"vendor_thinking":false}', reasoningEffort: 'medium', thinkingBudget: 2048, searchMode: 'custom', searchParams: '{"vendor_search":{"enabled":true}}' }, { thinking: true, search: true });
    check(lastBody().vendor_thinking.effort === 'medium' && lastBody().vendor_thinking.budget === 2048 && lastBody().vendor_search.enabled, 'Custom relay parameters substitute selected effort and budget');
    await call({ ...unknown, thinkingMode: 'custom', thinkingOffParams: '{"vendor_thinking":false}' }, { thinking: false });
    check(lastBody().vendor_thinking === false && !lastBody().vendor_search, 'Custom disabled-thinking parameters sent without search parameters');
    const invalidBefore = requests.length;
    const invalid = await call({ ...unknown, searchMode: 'custom', searchParams: '{broken' }, { search: true });
    const reserved = await call({ ...unknown, searchMode: 'custom', searchParams: '{"messages":[]}' }, { search: true });
    check(invalid.error.includes('JSON') && reserved.error.includes('messages') && requests.length === invalidBefore, 'Invalid JSON and history overrides fail before network access');
    responseMode = 'json';
    const json = await call(unknown);
    check(json.text === '完整回答' && json.reasoning === '整包思考' && json.sources.length === 1, 'Nonstream JSON fallback renders answer, reasoning and source');
    responseMode = 'error';
    const error = await call(unknown);
    check(error.error === '搜索插件不可用', 'SSE provider errors surface to user');
    responseMode = 'sse';

    await p.getByRole('button', { name: '账户菜单', exact: true }).click();
    await p.getByRole('button', { name: '系统设置', exact: true }).click();
    await p.getByRole('button', { name: '数据管理', exact: true }).click();
    for (const theme of ['light', 'dark']) {
      await p.evaluate(async (theme) => { const { useStore } = await import('/src/store/index.ts'); useStore.getState().setSettings({ theme }); }, theme);
      const buttons = await p.locator('.settings-content .btn').evaluateAll((bs) => bs.map((b) => { const c = getComputedStyle(b); return { w: b.offsetWidth, h: b.offsetHeight, weight: c.fontWeight, justify: c.justifyContent, color: c.color, border: c.borderColor }; }));
      check(buttons.length === 4 && buttons.every((b) => b.w === 72 && b.h === 36 && b.weight === '400' && b.justify === 'center') && buttons[3].border === buttons[3].color, `${theme}: all four data buttons match official geometry and danger border`);
      await p.locator('.overlay').evaluate((e) => Promise.all(e.getAnimations().map((a) => a.finished)));
      await p.screenshot({ path: `docs/local-probe/provider-review-data-${theme}.png` });
    }
    await p.getByRole('button', { name: '服务商与密钥', exact: true }).click();
    await p.getByRole('button', { name: '选择默认模型', exact: true }).click();
    await p.getByRole('option', { name: 'deepseek-reasoner', exact: true }).click();
    check(await p.getByRole('textbox', { name: '默认模型', exact: true }).inputValue() === 'deepseek-reasoner', 'Default model uses the custom dropdown');
    await p.getByRole('textbox', { name: '默认模型', exact: true }).fill('my-custom-model');
    check(await p.getByRole('textbox', { name: '默认模型', exact: true }).inputValue() === 'my-custom-model', 'Custom model names remain editable');
    await p.getByRole('button', { name: '选择深度思考模型', exact: true }).click();
    const selectedStyle = await p.getByRole('option', { selected: true }).evaluate((e) => ({ color: getComputedStyle(e).color, expected: getComputedStyle(document.documentElement).getPropertyValue('--label-primary').trim(), icon: e.querySelector('svg').getBoundingClientRect().width }));
    await p.getByRole('option', { name: 'deepseek-chat', exact: true }).click();
    check(selectedStyle.icon === 16 && selectedStyle.color === 'rgb(249, 250, 251)' && await p.getByRole('textbox', { name: '深度思考模型', exact: true }).inputValue() === 'deepseek-chat', 'Thinking model dropdown uses official neutral selected color and 16px check');
    await p.getByRole('button', { name: '新增', exact: true }).click();
    await p.getByRole('button', { name: '服务商', exact: true }).click();
    check(await p.getByRole('listbox').getByRole('option').count() === 2, 'Provider select uses a custom option list');
    await p.keyboard.press('Escape');
    check(await p.locator('.settings-dialog').count() === 1 && await p.getByRole('listbox').count() === 0, 'Escape closes dropdown while retaining settings dialog');
    await p.getByRole('button', { name: '联网搜索协议', exact: true }).click();
    await p.getByRole('option', { name: 'OpenRouter web 插件', exact: true }).click();
    await p.getByRole('button', { name: '深度思考协议', exact: true }).click();
    await p.getByRole('option', { name: 'reasoning_effort', exact: true }).click();
    await p.getByRole('button', { name: '思考强度', exact: true }).click();
    await p.getByRole('option', { name: '低', exact: true }).click();
    await p.reload();
    const stored = await p.evaluate(async () => { const { activeProvider, useStore } = await import('/src/store/index.ts'); return activeProvider(useStore.getState()); });
    check(stored.searchMode === 'openrouter' && stored.thinkingMode === 'reasoning_effort' && stored.reasoningEffort === 'low', 'Per-provider protocol and effort choices survive reload');
    await p.evaluate(async () => { const { useStore } = await import('/src/store/index.ts'); const s = useStore.getState(); s.updateProvider(s.activeProviderId, { baseUrl: 'https://relay.example/v1', apiKey: 'fixture-key', defaultModel: 'test-model', thinkingModel: 'test-reasoner' }); });
    await p.getByRole('button', { name: '深度思考', exact: true }).click();
    await p.getByRole('button', { name: '思考强度', exact: true }).click();
    await p.getByRole('option', { name: '中', exact: true }).click();
    await p.getByRole('button', { name: '智能搜索', exact: true }).click();
    await p.locator('.composer textarea').fill('验证按钮实际请求');
    await p.locator('.send-btn').click();
    await p.locator('.msg-ai .body').getByText('测试回答', { exact: true }).waitFor();
    check(lastBody().model === 'test-reasoner' && lastBody().reasoning_effort === 'medium' && lastBody().plugins[0].id === 'web', 'Composer switches model and sends selected effort plus search protocol');
    await p.evaluate(async () => { const { useStore } = await import('/src/store/index.ts'); const s = useStore.getState(); s.updateProvider(s.activeProviderId, { reasoningEffort: 'high' }); });
    await p.locator('.msg-ai button[title="重新生成"]').click();
    await p.locator('.msg-ai .body').getByText('测试回答', { exact: true }).waitFor();
    check(lastBody().reasoning_effort === 'medium', 'Regeneration preserves original message effort');
    check(await p.locator('.message-sources summary').innerText() === '1 个网页', 'Returned citations appear below reply');
    for (const width of [390, 320]) {
      await p.setViewportSize({ width, height: 844 });
      const fit = await p.locator('.composer-bar').evaluate((e) => { const r = e.getBoundingClientRect(); return [...e.querySelectorAll('button')].every((b) => { const s = b.getBoundingClientRect(); return s.left >= r.left - 1 && s.right <= r.right + 1 && s.width > 24; }); });
      check(fit, `Composer controls fit ${width}px viewport including effort selection`);
    }
    await p.screenshot({ path: 'docs/local-probe/provider-review-composer-mobile.png' });
    check(errors.length === 0, 'No runtime errors');
    return { passed: results.length, results, errors };
  } catch (e) {
    await p.screenshot({ path: 'docs/local-probe/provider-review-failure.png' });
    throw new Error(`${e.message}\nPassed: ${results.join('; ')}\nListboxes: ${await p.getByRole('listbox').allTextContents()}`);
  } finally { await context.close(); }
}
