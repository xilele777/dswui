import { SessionGroup } from './SessionGroup';
import { IconEmptyHistory } from '../Icons';
import type { SessionController, SessionGroupView } from './types';

interface Props {
  groups: SessionGroupView[];
  total: number;
  activeSessionId: string | null;
  controller: SessionController;
}

export function SessionList({ groups, total, activeSessionId, controller }: Props) {
  return (
    <div className={`session-list ${controller.multi ? 'multi' : ''} ${!total ? 'empty' : ''}`}>
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
          <IconEmptyHistory />
          <span>暂无历史对话</span>
        </div>
      )}
    </div>
  );
}
