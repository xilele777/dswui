import { useState } from 'react';
import { useEscapeKey } from '../../lib/useEscapeKey';
import { Overlay } from '../ui/Overlay';
import { IconClose } from '../Icons';
import { SettingsNav } from './SettingsNav';
import { GeneralSection } from './sections/GeneralSection';
import { ProviderSection } from './sections/ProviderSection';
import { DataSection } from './sections/DataSection';
import { AboutSection } from './sections/AboutSection';
import type { SettingsTab } from './types';

interface Props {
  onClose: () => void;
  initialTab?: SettingsTab;
}

export function SettingsDialog({ onClose, initialTab = 'general' }: Props) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  useEscapeKey(onClose);

  return (
    <Overlay className="overlay" onClose={onClose}>
      <div className="dialog settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="dialog-head">
          <h2 id="settings-title">系统设置</h2>
          <button className="icon-btn" onClick={onClose} title="关闭设置" aria-label="关闭设置">
            <IconClose />
          </button>
        </div>

        <div className="dialog-body">
          <div className="settings-layout">
            <SettingsNav tab={tab} onChange={setTab} />

            <div className="settings-content">
              {tab === 'general' && <GeneralSection />}
              {tab === 'provider' && <ProviderSection />}
              {tab === 'data' && <DataSection onClose={onClose} />}
              {tab === 'about' && <AboutSection />}
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
