import type { Message, MessageStatus, SearchStatus, ThinkingStep, Usage, WebSource } from '../types';

/**
 * 把高频 delta 合并成低频 store patch。
 * 生成逻辑只关心“收到什么”，这里负责节流与最终快照。
 */
export class StreamBuffer {
  private content = '';
  private reasoning = '';
  private thinkingSteps: ThinkingStep[] = [];
  private sources: WebSource[] = [];
  private searchStatus: SearchStatus | undefined;
  private reasoningStart = 0;
  private reasoningMs: number | undefined;
  private generationPhase: Message['generationPhase'];
  private usage: Usage | undefined;
  private model: string;
  private timer: number | null = null;

  constructor(
    model: string,
    private readonly emit: (patch: Partial<Message>) => void,
    private readonly interval = 60,
  ) {
    this.model = model;
  }

  get hasContent(): boolean {
    return this.content.trim().length > 0;
  }

  setModel(model: string) {
    this.model = model;
  }

  setUsage(usage: Usage) {
    this.usage = usage;
  }

  addReasoning(chunk: string) {
    if (!chunk) return;
    if (!this.reasoningStart) this.reasoningStart = Date.now();
    this.generationPhase = 'thinking';
    this.reasoning += chunk;
    // 服务端插件的初始等待状态不代表已执行搜索，正文先到时不虚构搜索顺序。
    const pending = this.thinkingSteps[this.thinkingSteps.length - 1];
    if (pending?.type === 'search' && pending.status === 'searching' && !pending.sources.length) this.thinkingSteps.pop();
    const last = this.thinkingSteps[this.thinkingSteps.length - 1];
    if (last?.type === 'reasoning') last.text += chunk;
    else this.thinkingSteps.push({ type: 'reasoning', text: chunk });
    this.schedule();
  }

  setSearchStatus(status: SearchStatus) {
    this.searchStatus = status;
    const last = this.thinkingSteps[this.thinkingSteps.length - 1];
    if (last?.type === 'search') last.status = status;
    else if (status !== 'complete') this.thinkingSteps.push({ type: 'search', sources: [], status });
    this.schedule();
  }

  addSources(sources: WebSource[]) {
    const known = new Set(this.sources.map((s) => s.url));
    const added = sources.filter((s) => { if (known.has(s.url)) return false; known.add(s.url); return true; });
    if (!added.length) return;
    this.sources.push(...added);
    const last = this.thinkingSteps[this.thinkingSteps.length - 1];
    if (last?.type === 'search') { last.sources.push(...added); last.status = 'complete'; }
    else this.thinkingSteps.push({ type: 'search', sources: [...added], status: 'complete' });
    this.searchStatus = 'complete';
    this.schedule();
  }

  addContent(chunk: string) {
    this.generationPhase = 'answering';
    if (this.reasoningStart && this.reasoningMs === undefined) {
      this.reasoningMs = Date.now() - this.reasoningStart;
    }
    this.content += chunk;
    this.schedule();
  }

  /** 结束一次生成，清掉待触发的节流定时器并写入最终状态。 */
  finish(status: MessageStatus, extra: Partial<Message> = {}) {
    this.clearTimer();
    if (this.reasoningStart && this.reasoningMs === undefined) this.reasoningMs = Date.now() - this.reasoningStart;
    this.emit({ ...this.snapshot(status), ...extra });
  }

  private schedule() {
    if (this.timer != null) return;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.emit(this.snapshot('WIP'));
    }, this.interval);
  }

  private clearTimer() {
    if (this.timer == null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  private snapshot(status: MessageStatus): Partial<Message> {
    return {
      content: this.content,
      reasoning: this.reasoning,
      thinkingSteps: this.thinkingSteps.map((step) => step.type === 'search' ? { ...step, sources: [...step.sources] } : { ...step }),
      sources: [...this.sources],
      searchStatus: this.searchStatus,
      reasoningMs: this.reasoningMs,
      generationPhase: this.generationPhase,
      usage: this.usage,
      status,
      model: this.model,
    };
  }
}
