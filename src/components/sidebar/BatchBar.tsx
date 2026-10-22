import { IconPin, IconTrash } from '../Icons';

interface Props {
  selectedCount: number;
  allPinned: boolean;
  onPin: () => void;
  onDelete: () => void;
}

export function BatchBar({ selectedCount, allPinned, onPin, onDelete }: Props) {
  return (
    <div className="session-batch-actions">
      <button onClick={onPin} disabled={!selectedCount}><IconPin width={16} height={16} />{allPinned ? '取消置顶' : '置顶'}</button>
      <span className="batch-divider" />
      <button className="danger" onClick={onDelete} disabled={!selectedCount}>
        <IconTrash width={16} height={16} />删除
      </button>
    </div>
  );
}
