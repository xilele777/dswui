import { IconChevronDown } from '../Icons';

export function ScrollToBottomButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="scroll-bottom" onClick={onClick} title="回到底部" aria-label="回到底部">
      <IconChevronDown width={14} height={14} />
    </button>
  );
}
