import type { Message } from '../../types';
import { editAndResend, regenerate } from '../../chat';
import { MessageItem } from '../message/MessageItem';

interface Props {
  sessionId: string;
  messages: Message[];
  streaming: boolean;
  showUsage: boolean;
}

export function ChatMessageList({ sessionId, messages, streaming, showUsage }: Props) {
  return (
    <div className="chat-inner">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          streaming={streaming}
          showUsage={showUsage}
          onRegenerate={(id) => void regenerate(sessionId, id)}
          onEdit={(id, text) => void editAndResend(sessionId, id, text)}
        />
      ))}
      <div style={{ height: 8 }} />
    </div>
  );
}
