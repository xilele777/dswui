import type { Session } from '../../types';

export interface SidebarProps {
  onOpenSettings: () => void;
  onOpenSearch: () => void;
}

export interface SessionGroupView {
  label: string;
  items: Session[];
}

export interface SessionController {
  editingId: string | null;
  draft: string;
  menuId: string | null;
  multi: boolean;
  selected: Set<string>;

  setDraft: (value: string) => void;
  startRename: (id: string, title: string) => void;
  commitRename: (id: string) => void;
  cancelRename: () => void;
  toggleMenu: (id: string) => void;
  closeMenu: () => void;
  togglePin: (id: string) => void;
  enterMulti: (id?: string) => void;
  exitMulti: () => void;
  toggleSelected: (id: string) => void;
  requestDelete: (id: string, title: string) => void;
  requestDeleteSelected: () => void;
  requestPinSelected: () => void;
  select: (id: string) => void;
}
