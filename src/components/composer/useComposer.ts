import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

interface Options {
  onSend: (text: string) => void;
  streaming: boolean;
  enterToSend: boolean;
}

/** 输入卡的状态：自动高度、IME 保护、Enter 发送、`/` 聚焦。 */
export function useComposer({ onSend, streaming, enterToSend }: Options) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 336)}px`;
  };

  useEffect(resize, [value]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'INPUT'
      ) {
        e.preventDefault();
        taRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = () => {
    const text = value.trim();
    if (!text || streaming) return;
    onSend(text);
    setValue('');
    requestAnimationFrame(resize);
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter') return;
    if (e.nativeEvent.isComposing) return;
    if (enterToSend) {
      // 官网：Enter 发送；Shift/Ctrl/Cmd+Enter 均作为换行
      if (e.shiftKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      submit();
    } else if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      submit();
    }
  };

  return {
    value,
    setValue,
    focused,
    setFocused,
    taRef,
    submit,
    handleKeyDown,
    canSend: !!value.trim() && !streaming,
  };
}
