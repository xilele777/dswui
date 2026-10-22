import { useEffect, useRef, useState } from 'react';

/**
 * 流式输出时节流渲染，避免每个 token 都重新解析 Markdown。
 * 传入 ms<=0 表示立即同步。
 */
export function useThrottled<T>(value: T, ms = 80): T {
  const [v, setV] = useState(value);
  const latest = useRef(value);
  const timer = useRef<number | null>(null);
  latest.current = value;

  useEffect(() => {
    if (ms <= 0) {
      if (timer.current != null) clearTimeout(timer.current);
      timer.current = null;
      setV(latest.current);
      return;
    }
    if (timer.current != null) return;
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setV(latest.current);
    }, ms);
  }, [value, ms]);

  useEffect(
    () => () => {
      if (timer.current != null) clearTimeout(timer.current);
      timer.current = null;
    },
    [],
  );

  return ms <= 0 ? value : v;
}
