async (page) => {
  const context = await page.context().browser().newContext({ viewport: { width: 1536, height: 900 } });
  const p = await context.newPage();
  const passed = [], errors = [], external = [];
  const check = (ok, label) => { if (!ok) throw new Error(label); passed.push(label); };
  p.on('pageerror', e => errors.push(e.message));
  p.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:878') && !r.url().startsWith('data:')) external.push(r.url()); });
  try {
    await p.goto('http://127.0.0.1:8787/');
    await p.locator('.composer textarea').waitFor();
    await p.evaluate(() => localStorage.setItem('dswui.store.v1', JSON.stringify({ version: 1, state: { sessions: [], activeSessionId: null, activeProviderId: 'p-default', providers: [{ id: 'p-default', name: '本地Mock', baseUrl: 'http://127.0.0.1:8788/v1', apiKey: 'local-mock-fixture', defaultModel: 'mock-chat', thinkingModel: 'mock-reasoner', thinkingMode: 'model', searchMode: 'none', models: [] }], settings: { theme: 'light' } } })));
    await p.reload();
    await p.locator('.profile-trigger').click();
    await p.getByRole('button', { name: '系统设置', exact: true }).click();
    await p.locator('.settings-nav').getByRole('button', { name: '服务商与密钥', exact: true }).click();
    await p.getByRole('button', { name: '拉取模型', exact: true }).click();
    await p.waitForFunction(() => JSON.parse(localStorage.getItem('dswui.store.v1')).state.providers[0].models.length === 2);
    check(true, '生产包通过真实HTTP拉取模型列表');
    await p.keyboard.press('Escape');
    await p.getByRole('button', { name: '深度思考', exact: true }).click();
    await p.locator('.composer textarea').fill('验证完整的流式渲染');
    await p.getByRole('button', { name: '发送', exact: true }).click();
    await p.getByRole('button', { name: '停止生成', exact: true }).waitFor();
    await p.getByRole('button', { name: '发送', exact: true }).waitFor();
    check(await p.locator('.think-body').count() === 1 && (await p.locator('.msg-ai .body').innerText()).includes('结束。'), '生产包逐段接收思考与完整回答');
    check(await p.locator('.code-pre').count() === 1 && await p.locator('.katex').count() > 0 && await p.locator('table').count() === 1, '生产包代码、表格和公式渲染正确');
    check((await p.locator('.msg-meta').innerText()).includes('356'), '最终usage帧在生产包正确显示');
    await p.screenshot({ path: 'docs/local-probe/final-production-chat.png' });
    await p.locator('.composer textarea').fill('验证停止');
    await p.getByRole('button', { name: '发送', exact: true }).click();
    await p.getByRole('button', { name: '停止生成', exact: true }).click();
    await p.getByText('已停止', { exact: true }).waitFor();
    check(await p.getByRole('button', { name: '发送', exact: true }).isVisible(), '真实HTTP请求可停止且恢复发送');
    await p.reload();
    await p.locator('.msg-user').first().waitFor();
    check(await p.getByRole('button', { name: '停止生成', exact: true }).count() === 0 && await p.locator('.msg-user').count() === 2, '生产包刷新后历史与停止状态正确恢复');
    await p.setViewportSize({ width: 390, height: 844 });
    await p.locator('.side-mask').click({ position: { x: 300, y: 80 } });
    await p.waitForFunction(() => { const e = document.querySelector('.sidebar'); return getComputedStyle(e).visibility === 'hidden'; });
    await p.screenshot({ path: 'docs/local-probe/final-production-mobile.png' });
    check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '生产包390px无横向溢出');
    check(errors.length === 0 && external.length === 0, '生产包无运行错误且仅访问本地HTTP服务');
    return { passed, errors, external };
  } finally { await context.close(); }
}
