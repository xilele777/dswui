import type { Message, MessageStatus, Usage } from '../types';

/**
 * 把高频 delta 合并成低频 store patch。
 * 生成逻辑只关心“收到什么”，这里负责节流与最终快照。
 */
export class StreamBuffer {
  private content = '';
  private reasoning = '';
  private reasoningStart = 0;
  private reasoningMs: number | undefined;
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
    if (!this.reasoningStart) this.reasoningStart = Date.now();
    this.reasoning += chunk;
    this.schedule();
  }

  addContent(chunk: string) {
    if (this.reasoningStart && this.reasoningMs === undefined) {
      this.reasoningMs = Date.now() - this.reasoningStart;
    }
    this.content += chunk;
    this.schedule();
  }

  /** 结束一次生成，清掉待触发的节流定时器并写入最终状态。 */
  finish(status: MessageStatus, extra: Partial<Message> = {}) {
    this.clearTimer();
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
      reasoningMs: this.reasoningMs,
      usage: this.usage,
      status,
      model: this.model,
    };
  }
}
