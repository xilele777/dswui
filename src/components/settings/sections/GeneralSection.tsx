import { useStore } from '../../../store';
import { IconMonitor, IconMoon, IconSun } from '../../Icons';
import { SettingRow } from '../controls';

const THEMES = [
  ['light', '浅色', <IconSun key="l" />],
  ['dark', '深色', <IconMoon key="d" />],
  ['system', '跟随系统', <IconMonitor key="s" />],
] as const;

export function GeneralSection() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);

  return (
    <>
      <div className="theme-setting">
        <div className="txt">主题</div>
        <div className="theme-choices" role="group" aria-label="主题">
          {THEMES.map(([value, label, icon]) => (
            <button
              key={value}
              className={`theme-choice ${settings.theme === value ? 'on' : ''}`}
              aria-pressed={settings.theme === value}
              onClick={() => setSettings({ theme: value })}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      <SettingRow title="发送方式">
        <div className="seg" role="group" aria-label="发送方式">
          <button
            className={settings.enterToSend ? 'on' : ''}
            onClick={() => setSettings({ enterToSend: true })}
          >
            Enter 发送
          </button>
          <button
            className={!settings.enterToSend ? 'on' : ''}
            onClick={() => setSettings({ enterToSend: false })}
          >
            Ctrl + Enter 发送
          </button>
        </div>
      </SettingRow>

      <SettingRow title="显示 token 用量" sub="服务端返回 usage 时在回答下方展示">
        <button
          className={`switch ${settings.showTokenUsage ? 'on' : ''}`}
          onClick={() => setSettings({ showTokenUsage: !settings.showTokenUsage })}
          aria-label="显示 token 用量"
        />
      </SettingRow>
    </>
  );
}
