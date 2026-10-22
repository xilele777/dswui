import { SessionGroup } from './SessionGroup';
import type { SessionController, SessionGroupView } from './types';

interface Props {
  groups: SessionGroupView[];
  total: number;
  activeSessionId: string | null;
  controller: SessionController;
}

export function SessionList({ groups, total, activeSessionId, controller }: Props) {
  return (
    <div className={`session-list ${controller.multi ? 'multi' : ''}`}>
      {groups.map((group, index) => (
        <SessionGroup
          key={group.label}
          group={group}
          showBatchEntry={index === 0 && !controller.multi && total > 0}
          activeSessionId={activeSessionId}
          controller={controller}
        />
      ))}
      {!total && (
        <div className="session-empty">
          <span>暂无历史对话</span>
        </div>
      )}
    </div>
  );
}
