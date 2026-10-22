async (page) => {
  const context = await page.context().browser().newContext({ viewport: { width: 1536, height: 776 }, locale: 'zh-CN' });
  const p = await context.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  const results = [];
  const check = (condition, label) => { if (!condition) throw new Error(label); results.push(label); };
  const settleOverlay = () => p.locator('.overlay').evaluate((e) => Promise.all(e.getAnimations().map((a) => a.finished)));
  const state = () => p.evaluate(async () => {
    const { useStore } = await import('/src/store/index.ts');
    const s = useStore.getState();
    return { active: s.activeSessionId, sessions: s.sessions.map((s) => ({ id: s.id, count: s.messages.length })) };
  });
  try {
    await p.goto('http://127.0.0.1:5173/?demo=1');
    await p.locator('.msg-ai').first().waitFor();
    await p.evaluate(() => document.fonts.ready);
    const initial = await state();
    for (let i = 0; i < 5; i++) await p.locator('.new-chat').click();
    const draft = await state();
    check(draft.sessions.filter((s) => !s.count).length === 1, 'Repeated new-chat clicks reuse one draft');
    check(await p.locator('.session-item').count() === 1, 'Empty drafts stay out of history');
    check(await p.evaluate(() => JSON.parse(localStorage.getItem('dswui.store.v1')).state.sessions.every((s) => s.messages.length)), 'Empty drafts stay out of persistence');
    await p.locator('.composer textarea').fill('未发送草稿');
    await p.locator('.session-item').first().click();
    check((await state()).sessions.length === initial.sessions.length, 'Leaving a draft discards its session');
    await p.locator('.new-chat').click();
    check(await p.locator('.composer textarea').inputValue() === '', 'Discarded draft text does not leak to another session');

    await p.evaluate(async () => {
      const { useStore } = await import('/src/store/index.ts');
      const s = useStore.getState();
      s.updateProvider(s.activeProviderId, { passSearchParam: true });
    });
    for (const label of ['深度思考', '智能搜索']) {
      const button = p.getByRole('button', { name: label, exact: true });
      const frames = await button.evaluate(async (b) => {
        const samples = [];
        b.click();
        for (let i = 0; i < 40; i++) {
          await new Promise(requestAnimationFrame);
          samples.push(b.querySelector('.toggle-icon').innerHTML);
        }
        return new Set(samples).size;
      });
      check(frames > 3, `${label} plays a changing SVG animation`);
      const reverseFrames = await button.evaluate(async (b) => {
        const samples = [];
        b.click();
        for (let i = 0; i < 40; i++) { await new Promise(requestAnimationFrame); samples.push(b.querySelector('.toggle-icon').innerHTML); }
        return new Set(samples).size;
      });
      check(reverseFrames > 3, `${label} animates back when disabled`);
    }
    const attachmentGap = await p.evaluate(() => {
      const a = document.querySelector('.composer-attach').getBoundingClientRect();
      const b = document.querySelector('.send-btn').getBoundingClientRect();
      return b.left - a.right;
    });
    check(Math.abs(attachmentGap - 10) < 0.1, 'Attachment/send gap is 10px');

    await p.route('**/v1/chat/completions', (route) => route.fulfill({
      status: 200, contentType: 'text/event-stream',
      body: 'data: {"choices":[{"delta":{"reasoning_content":"先核对样式。"}}]}\n\ndata: {"choices":[{"delta":{"content":"已核对。"}}]}\n\ndata: [DONE]\n\n',
    }));
    await p.evaluate(async () => {
      const { useStore } = await import('/src/store/index.ts');
      const s = useStore.getState();
      s.updateProvider(s.activeProviderId, { baseUrl: 'http://127.0.0.1:5173/v1', apiKey: 'local-ui-test' });
    });
    await p.locator('.composer textarea').fill('验证首条消息保存');
    await p.locator('.send-btn').click();
    await p.locator('.msg-ai .body').getByText('已核对。', { exact: true }).waitFor();
    check((await state()).sessions.filter((s) => s.count > 0).length === initial.sessions.length + 1, 'First send commits exactly one conversation');
    await p.locator('.new-chat').click();
    await p.locator('.new-chat').click();
    await p.reload();
    check((await state()).sessions.every((s) => s.count > 0), 'Reload removes empty draft and preserves committed conversations');

    await p.locator('.session-item').last().click();
    const toolbar = await p.locator('.assistant-actions').first().evaluate((e) => ({
      gap: getComputedStyle(e).gap,
      buttons: [...e.querySelectorAll('button')].map((b) => {
        const r = b.getBoundingClientRect(), s = b.querySelector('svg').getBoundingClientRect();
        return [r.width, r.height, s.width, s.height];
      }),
    }));
    check(toolbar.gap === '10px' && toolbar.buttons.length === 6 && toolbar.buttons.every((r) => r.join() === '28,28,16,16'), 'All six reply actions match 28px buttons / 16px icons / 10px gap');
    check(await p.locator('.msg-user button[title*="删除"]').count() === 0, 'User messages have no delete action');
    const markdown = await p.locator('.msg-ai .body .md-body').first().evaluate((e) => {
      const style = (selector) => getComputedStyle(e.querySelector(selector));
      return { body: [getComputedStyle(e).fontSize, getComputedStyle(e).lineHeight], heading: [style('h3').fontSize, style('h3').lineHeight, style('h3').fontWeight], code: [style('.code-pre').fontSize, style('.code-pre').lineHeight], table: [style('th').fontSize, style('th').lineHeight, style('th').fontWeight, style('td').borderLeftWidth], math: !!e.querySelector('.katex') };
    });
    check(markdown.body.join() === '16px,28px' && markdown.heading.join() === '20px,30px,700', 'Reply body and headings use official typography');
    check(markdown.code.join() === '13px,22px' && markdown.table.join() === '15px,25px,500,0px' && markdown.math, 'Code, table rules and formulas render with official metrics');
    check(await p.locator('.think-head').first().getAttribute('aria-expanded') === 'true', 'Completed reasoning remains expanded');
    const reasoning = await p.locator('.think-body .md-body').first().evaluate((e) => [getComputedStyle(e).fontSize, getComputedStyle(e).lineHeight]);
    check(reasoning.join() === '14px,24px', 'Reasoning uses 14px / 24px text');
    await p.locator('.think-head').first().click();
    check(await p.locator('.think-body').count() === 0, 'Reasoning folds on demand');
    await p.locator('.think-head').first().click();

    await p.locator('.scroll-area').evaluate((e) => { e.scrollTop = 0; });
    await p.getByRole('button', { name: '回到底部', exact: true }).waitFor();
    const scrollButton = await p.locator('.scroll-bottom').evaluate((e) => {
      const b = e.getBoundingClientRect(), c = document.querySelector('.composer').getBoundingClientRect();
      return [b.width, b.height, c.top - b.bottom, c.right - b.right];
    });
    check(scrollButton.every((v, i) => Math.abs(v - [34, 34, 20, 12][i]) < 0.1), 'Scroll-to-bottom button is 34px, 20px above composer, inset 12px');
    await p.locator('.scroll-bottom').click();
    await p.waitForFunction(() => { const e = document.querySelector('.scroll-area'); return e.scrollHeight - e.clientHeight - e.scrollTop < 3; });
    check(await p.locator('.scroll-bottom').count() === 0, 'Scroll-to-bottom hides after reaching latest message');

    for (const theme of ['light', 'dark']) {
      await p.evaluate(async (theme) => { const { useStore } = await import('/src/store/index.ts'); useStore.getState().setSettings({ theme }); }, theme);
      await p.locator('.session-item').first().hover();
      await p.locator('.session-item button[aria-label="更多"]').first().click();
      const menu = await p.locator('.session-menu').evaluate((e) => ({
        width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height,
        itemHeight: e.querySelector('button').getBoundingClientRect().height, portal: e.parentElement === document.body,
      }));
      check(menu.width === 124 && menu.height === 208 && menu.itemHeight === 40 && menu.portal, `${theme}: session menu matches 124×208 and escapes sidebar clipping`);
      await p.screenshot({ path: `docs/local-probe/review-session-menu-${theme}.png` });
      await p.keyboard.press('Escape');
      await p.locator('.profile-trigger').click();
      const profile = await p.locator('.profile-menu').boundingBox();
      check(Math.abs(profile.width - 136) < 1 && profile.height === 168, `${theme}: account menu matches 136×168`);
      await p.screenshot({ path: `docs/local-probe/review-profile-menu-${theme}.png` });
      await p.getByRole('button', { name: '系统设置', exact: true }).click();
      await settleOverlay();
      const dialog = await p.locator('.settings-dialog').boundingBox();
      const card = await p.locator('.theme-choice').first().boundingBox();
      check(Math.abs(dialog.width - 760) < 0.1 && Math.abs(dialog.height - 500) < 0.1 && Math.abs(card.width - 164) < 0.1 && Math.abs(card.height - 82) < 0.1, `${theme}: settings matches 760×500 and 164×82 theme cards`);
      await p.screenshot({ path: `docs/local-probe/review-settings-${theme}.png` });
      for (const tab of ['服务商与密钥', '数据管理', '服务协议']) await p.locator('.settings-nav').getByRole('button', { name: tab, exact: true }).click();
      await p.keyboard.press('Escape');
    }
    await p.setViewportSize({ width: 390, height: 844 });
    await p.locator('.profile-trigger').click();
    await p.getByRole('button', { name: '系统设置', exact: true }).click();
    await settleOverlay();
    const mobile = await p.locator('.settings-dialog').boundingBox();
    check(mobile.x >= -1 && mobile.x + mobile.width <= 391, 'Settings stays inside narrow viewport');
    await p.screenshot({ path: 'docs/local-probe/review-settings-mobile.png' });
    check(errors.length === 0, 'No browser runtime errors');
    return { passed: results.length, results, errors };
  } finally { await context.close(); }
}
