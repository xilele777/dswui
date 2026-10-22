import { useEffect, useRef, useState } from 'react';

type Item = { id: number; msg: string };
let push: ((m: string) => void) | null = null;
let seq = 0;

export function toast(msg: string) {
  if (push) push(msg);
  else console.log('[toast]', msg);
}

export function ToastHost() {
  const [items, setItems] = useState<Item[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    push = (msg: string) => {
      const id = ++seq;
      setItems((prev) => [...prev, { id, msg }]);
      const t = window.setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }, 2600);
      timers.current.push(t);
    };
    return () => {
      push = null;
      timers.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="toast-host">
      {items.map((i) => (
        <div className="toast" key={i.id}>
          {i.msg}
        </div>
      ))}
    </div>
  );
}
