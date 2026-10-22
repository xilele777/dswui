import type { RefObject } from 'react';
import { IconMultiSelect, IconPencil, IconPin, IconTrash, IconShare } from '../Icons';
import { AnchoredMenu } from '../ui/AnchoredMenu';

interface Props {
  anchor: RefObject<HTMLButtonElement>;
  pinned?: boolean;
  onRename: () => void;
  onTogglePin: () => void;
  onMultiSelect: () => void;
  onDelete: () => void;
  onShare: () => void;
  onClose: () => void;
}

export function SessionMenu({ anchor, pinned, onRename, onTogglePin, onMultiSelect, onDelete, onShare, onClose }: Props) {
  return (
    <AnchoredMenu anchor={anchor} className="session-menu" onClose={onClose}>
        <button onClick={onRename}>
          <IconPencil />
          重命名
        </button>
        <button onClick={onTogglePin}>
          <IconPin />
          {pinned ? '取消置顶' : '置顶'}
        </button>
        <button onClick={onShare}><IconShare />分享</button>
        <button onClick={onMultiSelect}>
          <IconMultiSelect />
          多选
        </button>
        <button className="danger" onClick={onDelete}>
          <IconTrash />
          删除
        </button>
    </AnchoredMenu>
  );
}
