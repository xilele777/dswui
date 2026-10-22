import { useCallback, useEffect, useState } from 'react';
import { activeProvider, activeSession, useStore } from './store';
import { stopGeneration, sendMessage } from './chat';
import { Sidebar } from './components/sidebar/Sidebar';
import { Composer } from './components/composer/Composer';
import { SettingsDialog } from './components/settings/SettingsDialog';
import { ConversationSearchDialog } from './components/dialogs/ConversationSearchDialog';
import { ToastHost, toast } from './components/Toast';
import { Welcome } from './components/chat/Welcome';
import { ConversationHeader } from './components/chat/ConversationHeader';
import { ChatMessageList } from './components/chat/ChatMessageList';
import { ScrollNav } from './components/chat/ScrollNav';
import { useTheme } from './app/hooks/useTheme';
import { useGlobalShortcuts } from './app/hooks/useGlobalShortcuts';
import { useConversationScroll } from './app/hooks/useConversationScroll';
import { useTitleEditor } from './app/hooks/useTitleEditor';
import { useInitialSetup } from './app/hooks/useInitialSetup';
import { resolveSearchMode, resolveThinkingMode } from './api/capabilities';
import type { SettingsTab } from './components/settings/types';

export default function App() {
  const settings = useStore((s) => s.settings);
  const session = useStore(activeSession);
  const provider = useStore(activeProvider);
  const streamingKey = useStore((s) => s.streamingKey);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('general');
  const [thinking, setThinking] = useState(false);
  const [search, setSearch] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const messages = session?.messages ?? [];
  const streaming = !!streamingKey && streamingKey.startsWith(`${session?.id}:`);
  const scroll = useConversationScroll(messages, session?.id);
  const title = useTitleEditor(session?.id, session?.title);

  useTheme(settings.theme);
  useInitialSetup(setSidebarOpen);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  useGlobalShortcuts(openSearch, closeSearch);
  useEffect(() => { setThinking(false); setSearch(false); }, [provider.id]);

  const configureProvider = () => { setSettingsTab('provider'); setSettingsOpen(true); };

  const toggleThinking = () => {
    if (!thinking && resolveThinkingMode(provider) === 'model' && !provider.thinkingModel) {
      toast('请先配置推理模型，或选择模型支持的思考协议');
      configureProvider();
      return;
    }
    setThinking((v) => !v);
  };

  const composer = (
    <Composer
      key={session?.id ?? 'new-chat'}
      onSend={(text) => void sendMessage(text, { thinking, search })}
      onStop={stopGeneration}
      streaming={streaming}
      thinking={thinking}
      search={search}
      toggleThinking={toggleThinking}
      toggleSearch={() => setSearch((v) => !v)}
      enterToSend={settings.enterToSend}
      searchAvailable={resolveSearchMode(provider) !== 'none'}
      onConfigureSearch={configureProvider}
      thinkingHint={
        provider?.thinkingModel
          ? `开启后使用 ${provider.thinkingModel}`
          : '按服务商的思考协议发送参数，可在设置中调整'
      }
      onScrollToBottom={!scroll.atBottom && messages.length > 0 ? () => scroll.scrollToBottom(true) : undefined}
    />
  );

  const empty = messages.length === 0;

  return (
    <div className="app">
      <Sidebar onOpenSettings={() => { setSettingsTab('general'); setSettingsOpen(true); }} onOpenSearch={openSearch} />

      <main className="main">
        {!empty && (
          <ConversationHeader
            title={session?.title}
            sidebarOpen={sidebarOpen}
            editing={title.editing}
            draft={title.draft}
            setDraft={title.setDraft}
            inputRef={title.inputRef}
            begin={title.begin}
            commit={title.commit}
            cancel={title.cancel}
          />
        )}

        {empty ? (
          <Welcome composer={composer} />
        ) : (
          <>
            <div className="scroll-area" ref={scroll.scrollRef} onScroll={scroll.handleScroll}>
              <ChatMessageList
                sessionId={session!.id}
                messages={messages}
                streaming={streaming}
                showUsage={settings.showTokenUsage}
              />
            </div>
            <ScrollNav items={scroll.navItems} active={scroll.navActive} onJump={scroll.jumpTo} />
            {composer}
          </>
        )}
      </main>

      {settingsOpen && <SettingsDialog initialTab={settingsTab} onClose={() => setSettingsOpen(false)} />}
      {searchOpen && <ConversationSearchDialog onClose={closeSearch} />}
      <ToastHost />
    </div>
  );
}
