import type { Message } from '../../types';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';

interface Props {
  message: Message;
  streaming: boolean;
  showUsage: boolean;
  onRegenerate: (messageId: string) => void;
  onEdit: (messageId: string, text: string) => void;
}

export function MessageItem(props: Props) {
  if (props.message.role === 'user') {
    return (
      <UserMessage
        message={props.message}
        streaming={props.streaming}
        onEdit={props.onEdit}
      />
    );
  }

  return (
    <AssistantMessage
      message={props.message}
      streaming={props.streaming}
      showUsage={props.showUsage}
      onRegenerate={props.onRegenerate}
    />
  );
}
