async (page) => {
  const context = await page.context().browser().newContext({ viewport: { width: 1400, height: 900 } });
  const p = await context.newPage();
  const passed = [], errors = [], external = [];
  const check = (ok, label) => { if (!ok) throw new Error(label); passed.push(label); };
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:5173') && !r.url().startsWith('data:') && !r.url().startsWith('https://fixture.example')) external.push(r.url()); });
  const one = { title: '发布说明', url: 'https://example.com/news', snippet: '官方更新的摘要。', site_name: 'Example', published_at: '2026-10-23' };
  const two = { title: '协议文档', url: 'https://docs.example.org/api', summary: '接口说明。' };
  const three = { title: '项目文档', url: 'https://project.example.net/guide' };
  await p.route('**/chat/completions', route => route.fulfill({ contentType: 'text/event-stream', body: [
    { choices: [{ delta: { reasoning_content: '先确认问题，再检索资料。' } }] },
    { search_info: { search_results: [one, two] } },
    { search_info: { search_results: [one, two] } },
    { choices: [{ delta: { reasoning_content: '根据首轮资料进一步核对。' } }] },
    { search_info: { search_results: [one, two, three] } },
    { choices: [{ delta: { reasoning_content: '资料核对完成，整理回答。' } }] },
    { choices: [{ delta: { content: '这是根据来源整理的回答。' } }] },
  ].map(event => `data: ${JSON.stringify(event)}\n\n`).join('') + 'data: [DONE]\n\n' }));
  try {
    await p.goto('http://127.0.0.1:5173/');
    await p.evaluate(async () => {
      const { useStore } = await import('/src/store/index.ts');
      const s = useStore.getState();
      s.updateProvider(s.activeProviderId, { apiKey: 'fixture', baseUrl: 'https://fixture.example/v1', defaultModel: 'fixture', thinkingMode: 'deepseek', thinkingModel: '', searchMode: 'enable_search' });
      const { sendMessage } = await import('/src/chat/actions.ts');
      await sendMessage('请搜索并核对这项更新', { thinking: true, search: true });
    });
    await p.locator('.think .md-muted').last().waitFor();
    const sequence = await p.locator('.think-timeline > *').evaluateAll(nodes => nodes.map(el => (el.classList.contains('think-body') ? el.textContent : el.querySelector('[role=status]').textContent).trim()));
    check(JSON.stringify(sequence) === JSON.stringify(['先确认问题，再检索资料。', '搜索到 2 个网页', '根据首轮资料进一步核对。', '搜索到 1 个网页', '资料核对完成，整理回答。']), '思考与多次来源节点按接收顺序排列且重复快照不新增节点');
    check(await p.locator('.think details').count() === 0 && await p.locator('.think a').count() === 0, '搜索节点不再使用内联折叠链接');
    check(await p.locator('.search-site-marks .source-mark').count() === 3, '搜索行展示站点标记');
    await p.locator('.search-step').first().click();
    await p.locator('.search-sources-panel').waitFor();
    check(await p.locator('.search-source-card').count() === 2 && (await p.locator('.search-source-card').first().innerText()).includes('官方更新的摘要。') && (await p.locator('.search-source-card').first().innerText()).includes('2026-10-23'), '搜索节点打开对应结果面板并显示站点、日期、摘要');
    check(await p.locator('.search-source-card').first().getAttribute('target') === '_blank', '来源在新标签页打开');
    check(await p.locator('.main').evaluate(el => el.getBoundingClientRect().right <= document.querySelector('.search-sources-panel').getBoundingClientRect().left + 1), '宽屏结果面板与对话并排显示');
    await p.screenshot({ path: 'docs/local-probe/search-timeline-light.png' });
    await p.keyboard.press('Escape');
    check(await p.locator('.search-sources-panel').count() === 0 && await p.locator('.search-step').first().evaluate(el => el === document.activeElement), 'Escape关闭结果面板并归还键盘焦点');
    await p.locator('.search-step').last().click();
    check(await p.locator('.search-source-card').count() === 1 && await p.locator('.search-source-title').innerText() === '项目文档', '不同搜索节点打开各自来源');
    await p.getByRole('button', { name: '关闭搜索结果' }).click();
    await p.locator('.think-head').click();
    check(await p.locator('.think-timeline').count() === 0, '折叠思考区同时折叠搜索节点');
    await p.locator('.think-head').click();
    await p.reload();
    await p.locator('.think-timeline').waitFor();
    check(await p.locator('.think-body').count() === 3 && await p.locator('.search-step').count() === 2, '重载后历史保留搜索思考顺序');
    await p.evaluate(async () => { const { useStore } = await import('/src/store/index.ts'); useStore.getState().setSettings({ theme: 'dark' }); });
    await p.locator('.search-step').first().click();
    await p.screenshot({ path: 'docs/local-probe/search-timeline-dark.png' });
    check(await p.locator('.search-sources-panel').evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(21, 21, 23)'), '结果面板适配深色主题');
    await p.setViewportSize({ width: 390, height: 844 });
    check(await p.locator('.search-sources-panel').evaluate(el => { const r=el.getBoundingClientRect(); return r.x >= -1 && r.right <= innerWidth + 1; }) && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '390px结果面板不超出屏幕（允许亚像素舍入）');
    await p.screenshot({ path: 'docs/local-probe/search-timeline-mobile.png' });
    await p.getByRole('button', { name: '关闭搜索结果' }).click();
    const bufferChecks = await p.evaluate(async () => {
      const { StreamBuffer } = await import('/src/chat/streamBuffer.ts');
      let snapshot;
      const b = new StreamBuffer('test', patch => snapshot = patch);
      b.setSearchStatus('searching'); b.addReasoning('先思考'); b.addSources([{ title: '资料', url: 'https://example.com' }]); b.addReasoning('继续思考'); b.finish('INCOMPLETE');
      const ordered = snapshot.thinkingSteps.map(s => s.type).join(',') === 'reasoning,search,reasoning';
      const previous = snapshot; b.addReasoning('新增'); b.finish('OK');
      const stable = previous.thinkingSteps[2].text === '继续思考';
      const stopped = new StreamBuffer('test', patch => snapshot = patch); stopped.setSearchStatus('searching'); stopped.finish('INCOMPLETE');
      return { ordered, stable, stopped: snapshot.thinkingSteps.length === 1 && snapshot.thinkingSteps[0].status === 'searching' };
    });
    check(bufferChecks.ordered && bufferChecks.stable && bufferChecks.stopped, '停止生成保留时间线且后续delta不篡改既有快照');
    await p.evaluate(async () => {
      const { useStore } = await import('/src/store/index.ts'); const s = useStore.getState();
      const message = s.sessions.find(x => x.id === s.activeSessionId).messages.find(m => m.role === 'assistant');
      s.patchMessage(s.activeSessionId, message.id, { thinkingSteps: undefined });
    });
    check(await p.locator('.search-step').count() === 1 && await p.locator('.think-body').count() === 1, '旧历史无时间线时仍能查看思考与合并来源');
    check(external.length === 0 && errors.length === 0, '来源展示不请求外部图标且浏览器无运行错误');
    return { passed };
  } finally { await context.close(); }
}
