async (page) => {
  const context = await page.context().browser().newContext({ viewport: { width: 1200, height: 820 } });
  const p = await context.newPage();
  const passed = [], errors = [];
  const check = (ok, label) => { if (!ok) throw new Error(label); passed.push(label); };
  p.on('pageerror', e => errors.push(e.message));
  try {
    await p.goto('http://127.0.0.1:5173/');
    const framing = await p.evaluate(async () => {
      const { readSse } = await import('/src/api/sse.ts');
      const encoded = new TextEncoder().encode(': heartbeat\r\ndata: {\r\ndata: "text":"中文🙂"}\r\n\r\ndata: [DONE]\r\n\r\ndata: ignored\r\n\r\n');
      const received = [];
      const done = await readSse(new ReadableStream({ start(c) { for (const byte of encoded) c.enqueue(Uint8Array.of(byte)); c.close(); } }), s => received.push(JSON.parse(s)));
      let cancelled = false;
      const held = await readSse(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('data: [DONE]\n\n')); }, cancel() { cancelled = true; } }), () => {});
      return { done, received, held, cancelled };
    });
    check(framing.done && framing.received.length === 1 && framing.received[0].text === '中文🙂', 'SSE逐字节拆包、UTF-8、CRLF、多行data与心跳正确解析');
    check(framing.held && framing.cancelled, 'DONE立即结束并取消仍保持连接的响应');
    await p.evaluate(async () => {
      const { useStore } = await import('/src/store/index.ts');
      const s = useStore.getState();
      s.updateProvider(s.activeProviderId, { apiKey: 'fixture', baseUrl: 'https://fixture.example/v1', defaultModel: 'fixture' });
      window.reviewStreams = [];
      window.fetch = async (_url, options) => {
        if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        let stream;
        const body = new ReadableStream({ start(c) { stream = c; } });
        const record = { controller: stream, aborted: false };
        window.reviewStreams.push(record);
        options.signal?.addEventListener('abort', () => { record.aborted = true; stream.error(new DOMException('Aborted', 'AbortError')); });
        return new Response(body, { headers: { 'content-type': 'text/event-stream' } });
      };
    });
    const send = text => p.evaluate(async text => { const { sendMessage } = await import('/src/chat/actions.ts'); void sendMessage(text, { thinking: true, search: false }); }, text);
    const push = (index, events, close = false) => p.evaluate(({index, events, close}) => { const c = window.reviewStreams[index].controller; for (const event of events) c.enqueue(new TextEncoder().encode('data: ' + (typeof event === 'string' ? event : JSON.stringify(event)) + '\n\n')); if (close) c.close(); }, {index, events, close});
    const state = () => p.evaluate(async () => { const { useStore } = await import('/src/store/index.ts'); const s = useStore.getState(); return { sessions: s.sessions, active: s.activeSessionId }; });
    await send('会话一');
    await p.getByRole('button', { name: '停止生成', exact: true }).waitFor();
    const first = (await state()).active;
    await send('重复提交');
    check((await state()).sessions[0].messages.length === 2 && await p.evaluate(() => window.reviewStreams.length === 1), '同一会话生成中拒绝重复提交');
    await push(0, [{choices:[{delta:{reasoning_content: '首段思考。'}}]}]);
    await p.locator('.think-body').getByText('首段思考。', { exact: true }).waitFor();
    await push(0, [{choices:[{delta:{reasoning_content: '\n\n' + '继续核对资料。\n\n'.repeat(100)}}]}]);
    await p.waitForFunction(() => { const el = document.querySelector('.scroll-area'); return el.scrollHeight > el.clientHeight + 100 && el.scrollHeight - el.clientHeight - el.scrollTop < 3; });
    check(true, '只有思考内容增长时也持续跟随到底部');
    await p.locator('.scroll-area').evaluate(el => { el.scrollTop = 0; });
    await p.getByRole('button', { name: '回到底部', exact: true }).waitFor();
    await push(0, [{choices:[{delta:{reasoning_content:'用户已向上查看。\n\n'.repeat(20)}}]}]);
    await p.locator('.think-body').getByText('用户已向上查看。', { exact: true }).first().waitFor();
    check(await p.locator('.scroll-area').evaluate(el => el.scrollTop < 5), '用户向上滚动后新增思考不抢夺阅读位置');
    await p.locator('.new-chat').click();
    await send('会话二');
    const second = (await state()).active;
    await p.evaluate(async id => { const {useStore}=await import('/src/store/index.ts');useStore.getState().selectSession(id); }, first);
    check(await p.getByRole('button', { name:'停止生成', exact:true }).isVisible(), '切回仍在生成的会话显示正确的停止按钮');
    await p.getByRole('button', {name:'停止生成',exact:true}).click();
    await p.getByText('已停止',{exact:true}).waitFor();
    check(await p.evaluate(() => window.reviewStreams[0].aborted && !window.reviewStreams[1].aborted), '停止当前会话不取消另一个会话的请求');
    check((await state()).sessions.find(s=>s.id===first).messages.at(-1).status === 'INCOMPLETE', '思考阶段停止归类为已停止且保留内容');
    await push(1, [{choices:[{delta:{content:'第二个会话独立完成。'}}]}, '[DONE]']);
    await p.evaluate(async id => {const {useStore}=await import('/src/store/index.ts');useStore.getState().selectSession(id);},second);
    await p.getByText('第二个会话独立完成。',{exact:true}).waitFor();
    await p.getByRole('button',{name:'发送',exact:true}).waitFor();
    check((await state()).sessions.find(s=>s.id===second).messages.at(-1).status === 'OK', '另一个会话可独立完成并恢复发送状态');
    await send('随后中断');
    check(await p.getByRole('button',{name:'重新生成',exact:true}).first().isDisabled(), '生成中禁止重生成历史回答以免截断正在写入的消息');
    const before = (await state()).sessions.find(s=>s.id===second).messages.length;
    await p.evaluate(async id => {const {regenerate}=await import('/src/chat/actions.ts');const {useStore}=await import('/src/store/index.ts');const s=useStore.getState().sessions.find(s=>s.id===id);await regenerate(id,s.messages[1].id);}, second);
    check((await state()).sessions.find(s=>s.id===second).messages.length === before, '生成动作层同样防止重生成并发截断');
    await push(2,[{choices:[{delta:{content:'已经收到的部分回答。'}}]},{error:{message:'模拟上游中断'}}]);
    await p.locator('.error-card').waitFor();
    check(await p.getByText('已经收到的部分回答。',{exact:true}).isVisible() && (await p.locator('.error-card').innerText()).includes('模拟上游中断'), '上游报错同时保留可见正文与真实错误');
    await send('刷新中的回答');
    await push(3,[{choices:[{delta:{content:'刷新前已收到。'}}]}]);
    await p.getByText('刷新前已收到。',{exact:true}).waitFor();
    await p.reload();
    await p.getByText('刷新前已收到。',{exact:true}).waitFor();
    check(await p.getByRole('button',{name:'停止生成',exact:true}).count() === 0 && (await state()).sessions.every(s=>s.messages.every(m=>m.status!=='WIP')), '刷新恢复中断历史并结束所有过期加载态');
    const protocol = await p.evaluate(async () => {
      const {streamChat}=await import('/src/api/stream.ts');const {activeProvider,useStore}=await import('/src/store/index.ts');
      const outputs=[];
      for (const mode of ['eof','length','content_filter','stop','json-length']) {
        const choice={delta:{content:'部分正文'},finish_reason: mode==='length'||mode==='json-length'?'length':mode==='content_filter'?'content_filter':mode==='stop'?'stop':null};
        window.fetch=async()=> mode==='json-length' ? new Response(JSON.stringify({choices:[{message:{content:'部分正文'},finish_reason:'length'}]}),{headers:{'content-type':'application/json'}}) : new Response('data: '+JSON.stringify({choices:[choice]})+'\n\n',{headers:{'content-type':'text/event-stream'}});
        let text='', error='';
        try {await streamChat({provider:activeProvider(useStore.getState()),model:'fixture',messages:[{role:'user',content:'测试'}],onDelta:s=>text+=s});} catch(e) {error=e.message;}
        outputs.push({mode,text,error});
      }
      return outputs;
    });
    check(protocol[0].error.includes('中断') && protocol[0].text==='部分正文', '无完成信号的EOF被识别为中断');
    check(protocol[1].error.includes('长度上限') && protocol[4].error.includes('长度上限'), '流式和JSON的长度截断均提示原因');
    check(protocol[2].error.includes('过滤') && !protocol[3].error, '识别内容过滤并兼容仅finish_reason的服务端');
    const deletion = await p.evaluate(async () => {
      const {useStore}=await import('/src/store/index.ts');const {sendMessage}=await import('/src/chat/actions.ts');
      let aborted=false;window.fetch=async (_u,opts)=>new Promise((_resolve,reject)=>opts.signal.addEventListener('abort',()=>{aborted=true;reject(new DOMException('Aborted','AbortError'));}));
      const task=sendMessage('删除生成中的对话',{thinking:false,search:false});const id=useStore.getState().activeSessionId;useStore.getState().deleteSession(id);await task;
      return aborted && !useStore.getState().sessions.some(s=>s.id===id);
    });
    check(deletion, '删除会话同步取消请求且晚到回调不会复活历史');
    check(errors.length===0, '新增故障与恢复场景无浏览器运行错误');
    return {passed,errors};
  } finally { await context.close(); }
}
