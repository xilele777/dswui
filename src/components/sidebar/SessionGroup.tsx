import { IconMultiSelect } from '../Icons';
import { SessionItem } from './SessionItem';
import type { SessionController, SessionGroupView } from './types';

interface Props {
  group: SessionGroupView;
  showBatchEntry: boolean;
  activeSessionId: string | null;
  controller: SessionController;
}

export function SessionGroup({ group, showBatchEntry, activeSessionId, controller }: Props) {
  return (
    <div>
      <div className="session-group-title">
        <span className="label">{group.label}</span>
        {showBatchEntry && (
          <button
            className="session-batch-entry"
            onClick={() => controller.enterMulti()}
            title="多选"
            aria-label="多选"
          >
            <IconMultiSelect width={14} height={14} />
          </button>
        )}
      </div>
      {group.items.map((session) => (
        <SessionItem
          key={session.id}
          session={session}
          active={session.id === activeSessionId}
          controller={controller}
        />
      ))}
    </div>
  );
}
