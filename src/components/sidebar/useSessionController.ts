import { useState } from 'react';
import { useStore } from '../../store';
import { useConfirm } from '../ConfirmDialog';
import type { SessionController } from './types';
import { useEscapeKey } from '../../lib/useEscapeKey';

/**
 * 会话列表的交互状态：重命名、更多菜单、多选、删除确认。
 * 列表 UI 只消费这里暴露的状态与动作。
 */
export function useSessionController(): SessionController {
  const selectSession = useStore((s) => s.selectSession);
  const deleteSession = useStore((s) => s.deleteSession);
  const renameSession = useStore((s) => s.renameSession);
  const togglePinStore = useStore((s) => s.togglePin);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const confirm = useConfirm();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [multi, setMulti] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const startRename = (id: string, title: string) => {
    setMenuId(null);
    setEditingId(id);
    setDraft(title);
  };

  const commitRename = (id: string) => {
    renameSession(id, draft.trim() || '新对话');
    setEditingId(null);
  };

  const enterMulti = (id?: string) => {
    setMenuId(null);
    setMulti(true);
    setSelected(id ? new Set([id]) : new Set());
  };

  const exitMulti = () => {
    setMulti(false);
    setSelected(new Set());
  };

  useEscapeKey(exitMulti, multi);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const requestDelete = (id: string, _title: string) => {
    setMenuId(null);
    void confirm({
      title: '删除后，该对话将不可恢复',
      description: '由该对话生成的分享链接也将失效',
      confirmText: '删除该对话',
      danger: true,
    }).then((ok) => {
      if (ok) deleteSession(id);
    });
  };

  const requestDeleteSelected = () => {
    if (!selected.size) return;
    void confirm({
      title: `删除选择的 ${selected.size} 个对话？`,
      description: '删除后，对话将不可恢复，由该对话生成的分享链接也将失效。',
      confirmText: '删除',
      danger: true,
    }).then((ok) => {
      if (!ok) return;
      selected.forEach((id) => deleteSession(id));
      exitMulti();
    });
  };

  const requestPinSelected = () => {
    if (!selected.size) return;
    const sessions = useStore.getState().sessions.filter((s) => selected.has(s.id));
    const pinned = sessions.every((s) => s.pinned);
    void confirm({
      title: `将选择的 ${selected.size} 个对话${pinned ? '取消置顶' : '置顶'}？`,
      cancelText: pinned ? '保留' : '取消',
      confirmText: pinned ? '取消置顶' : '置顶',
    }).then((ok) => {
      if (!ok) return;
      sessions.forEach((s) => { if (!!s.pinned === pinned) togglePinStore(s.id); });
      exitMulti();
    });
  };

  const select = (id: string) => {
    if (multi) {
      toggleSelected(id);
      return;
    }
    selectSession(id);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  return {
    editingId,
    draft,
    menuId,
    multi,
    selected,
    setDraft,
    startRename,
    commitRename,
    cancelRename: () => setEditingId(null),
    toggleMenu: (id) => setMenuId((v) => (v === id ? null : id)),
    closeMenu: () => setMenuId(null),
    togglePin: (id) => {
      togglePinStore(id);
      setMenuId(null);
    },
    enterMulti,
    exitMulti,
    toggleSelected,
    requestDelete,
    requestDeleteSelected,
    requestPinSelected,
    select,
  };
}
