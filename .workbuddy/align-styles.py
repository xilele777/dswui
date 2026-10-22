from pathlib import Path

def update(name, replacements):
    path = Path('src/styles') / name
    text = path.read_text(encoding='utf-8')
    for before, after in replacements:
        if before not in text:
            raise ValueError(f'{name}: missing {before[:60]}')
        text = text.replace(before, after)
    path.write_text(text, encoding='utf-8')

update('shell.css', [
    ('  transition: width var(--dur) var(--ease), flex-basis var(--dur) var(--ease), max-width var(--dur) var(--ease), transform var(--dur) var(--ease);', '  min-width: 0;\n  z-index: 8;\n  transition: margin-left var(--dur) var(--ease), transform var(--dur) var(--ease), visibility 0s;'),
    ('  width: 0;\n  max-width: 0;\n  flex-basis: 0;\n  margin-left: 0;\n  border-right: none;', '  margin-left: calc(-1 * var(--sider-width));\n  visibility: hidden;\n  pointer-events: none;\n  transition: margin-left var(--dur) var(--ease), transform var(--dur) var(--ease), visibility 0s var(--dur);'),
    ('  flex-direction: column;\n}', '  flex-direction: column;\n  flex: none;\n}'),
    ('  padding: 13px 2px 9px 4px;', '  padding: 15px 0 10px 4px;'),
    ('  gap: 14px;', '  gap: 18px;\n  flex: none;'),
    ('  width: 34px;\n  height: 34px;\n  color: var(--label-tertiary);', '  position: relative;\n  width: 16px;\n  height: 16px;\n  border-radius: 50%;\n  color: var(--label-tertiary);'),
    ('  width: 20px;\n  height: 20px;\n  stroke-width: 1.7;', '  width: 16px;\n  height: 16px;'),
])
with Path('src/styles/shell.css').open('a', encoding='utf-8') as f:
    f.write('''
.brand { flex: none; }
.brand img { display: block; width: 143px; height: 23px; }
.brand-actions .icon-btn::before { content: ''; position: absolute; inset: -9px; border-radius: 50%; }
.brand-actions .icon-btn:hover { background: none; }
.brand-actions .icon-btn:hover::before { background: var(--hover); }
.collapsed-nav { z-index: 12; position: fixed; top: 12px; left: 16px; display: flex; align-items: center; }
.collapsed-brand { width: 27px; height: 24px; }
.collapsed-brand img { display: block; width: 100%; height: 100%; object-fit: contain; }
.collapsed-actions { display: flex; align-items: center; gap: 2px; height: 40px; margin-left: 16px; padding: 0 3px; border: 1px solid var(--border-l2); border-radius: 100px; background: var(--bg-layer-1); box-shadow: 0 4px 12px rgba(0,0,0,.04); }
.collapsed-actions .icon-btn { width: 34px; height: 34px; border-radius: 50%; color: var(--label-primary); }
.collapsed-actions svg { width: 16px; height: 16px; }
''')

update('sidebar.css', [
    ('  margin-top: 24px;', '  margin: 24px 12px 0;'),
    ('  height: 34px;\n  pointer-events: none;', '  height: 72px;\n  pointer-events: none;\n  backdrop-filter: blur(2px);\n  mask-image: linear-gradient(to bottom, transparent, #000 80.65%);'),
    (' 88%);', ' 80.65%);'),
    ('  padding: 4px 2px 20px;', '  padding: 4px 2px 52px;\n  margin: 0 -2px;\n  scrollbar-width: none;'),
    ('.session-list.multi {\n  padding-top: 54px;\n}', '.session-list::-webkit-scrollbar { display: none; }\n.session-list > div + div { margin-top: 16px; }'),
    ('  height: 34px;', '  height: 22px;'),
    ('  line-height: 20px;', '  line-height: 18px;'),
    ('  gap: 8px;', '  gap: 10px;'),
    ('  padding: 8px 6px 8px 10px;', '  padding: 9px 6px 9px 10px;'),
    ('.session-item:hover .row-actions,', '.session-item.active .row-actions,\n.session-item:hover .row-actions,'),
    ('  border-radius: 50%;\n  color: transparent;\n  background: var(--bg-base);', '  border-radius: 6px;\n  border-width: 1.5px;\n  color: transparent;\n  background: transparent;'),
])
path = Path('src/styles/sidebar.css'); s = path.read_text(encoding='utf-8')
start = s.index('.session-batch-bar {'); end = s.index('.session-batch-entry {')
s = s[:start] + '''.session-batch-bar { height: 40px; padding: 0 0 0 10px; display: flex; align-items: center; gap: 6px; font-size: 16px; font-weight: 500; }
.session-batch-bar .count { flex: 1; color: var(--label-primary); }
.session-batch-bar button { width: 28px; height: 28px; display: grid; place-items: center; border: 1px solid var(--border-l2); background: var(--bg-base); border-radius: 50%; color: var(--label-secondary); font-size: 20px; }
.session-batch-bar button:hover { background: var(--hover); }
.session-batch-actions { display: flex; align-items: center; height: 64px; flex: none; margin: 0 12px; border-top: 1px solid var(--border-l1); }
.session-batch-actions button { display: flex; align-items: center; justify-content: center; gap: 8px; height: 100%; flex: 1; font-size: 14px; font-weight: 500; }
.session-batch-actions .danger { color: #ec1313; }
.session-batch-actions button:disabled { color: var(--label-tertiary); cursor: default; }
.batch-divider { height: 24px; width: 1px; background: var(--border-l1); }
.session-batch-entry svg { width: 12px; height: 12px; }
''' + s[end:]
path.write_text(s,encoding='utf-8')

update('composer.css', [
    ('  max-width: 864px;', '  max-width: 776px;'),
    ('  background: var(--bg-base);\n  box-shadow: none;', '  background: var(--composer-fill);\n  box-shadow: 0 4px 10px rgba(0,0,0,.02), 0 2px 4px rgba(0,0,0,.04);'),
    ('  min-height: 52px;\n  padding: 13px 16px 0;\n  max-height: 202px;', '  min-height: 60px;\n  margin-top: 4px;\n  padding: 12px 12px 0 16px;\n  max-height: 336px;\n  overflow-y: auto;\n  scrollbar-width: thin;'),
    ('  min-height: 34px;\n  margin: 4px 10px 10px;\n  padding: 0;', '  min-height: 58px;\n  margin: 0;\n  padding: 12px;'),
    ('  width: 32px;\n  height: 32px;\n  display: grid;', '  width: 34px;\n  height: 34px;\n  display: grid;'),
    ('  height: 30px;\n  padding: 4px 14px;', '  height: 34px;\n  padding: 0 12px;'),
    ('  font-size: 14px;\n  line-height: 22px;\n  color: var(--label-secondary);\n  border: none;', '  font-size: 13px;\n  font-weight: 500;\n  line-height: 22px;\n  color: var(--label-primary);\n  border: 1px solid var(--border-l2);'),
    ('  background: var(--brand-weak);', '  background: var(--brand-weak);\n  border-color: var(--brand-border);'),
    ('  width: 32px;\n  height: 32px;\n  border-radius: 50%;', '  width: 34px;\n  height: 34px;\n  border-radius: 50%;'),
    ('  background: var(--bg-layer-3);\n  color: var(--label-dimmed);', '  background: var(--send-disabled);\n  color: #fff;'),
])
with Path('src/styles/composer.css').open('a', encoding='utf-8') as f:
    f.write('''
.pill svg { width: 14px; height: 14px; flex: none; }
.composer-attach svg { width: 20px; height: 20px; }
.send-btn svg { width: 20px; height: 20px; }
.welcome-composer .composer, .welcome-composer .composer.focused { box-shadow: 0 4px 12px rgba(0,0,0,.02), 0 2px 2px rgba(72,104,178,.01), 0 30px 60px rgba(72,104,178,.03); }
html[data-theme="dark"] .composer { border-color: rgba(255,255,255,.06); }
html[data-theme="dark"] .welcome-composer .composer { box-shadow: none; }
@media (max-width: 439px) { .composer textarea { min-height: 42px; } .composer-bar { gap: 4px; } .pill { padding: 0 10px; } }
''')

update('tokens.css', [
    ('  --border-l2: rgba(0, 0, 0, 0.08);', '  --border-l2: rgba(0, 0, 0, 0.1);'),
    ('  --bg-base: #ffffff;', '  --bg-base: #ffffff;\n  --composer-fill: #ffffff;\n  --send-disabled: #c6d2ff;'),
    ('  --bg-base: #151517;', '  --bg-base: #151517;\n  --composer-fill: #232324;\n  --send-disabled: #394568;'),
    ('  --border-l2: rgba(255, 255, 255, 0.1);', '  --border-l2: rgba(255, 255, 255, 0.12);'),
])

update('account.css', [
    ('  border-top: 1px solid var(--border-l1);\n  min-height: 44px;\n  padding: 6px 6px;\n  display: flex;\n  align-items: center;\n  gap: 8px;', '  height: 64px;\n  margin: 0 12px;\n  display: flex;\n  align-items: center;\n  flex: none;'),
    ('  left: 8px;\n  bottom: 52px;', '  left: 0;\n  bottom: 60px;'),
    ('  width: 28px;\n  height: 28px;', '  width: 32px;\n  height: 32px;'),
])
with Path('src/styles/account.css').open('a', encoding='utf-8') as f:
    f.write('''
.profile-trigger { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 2px 6px 6px; border-radius: 12px; text-align: left; }
.profile-trigger:hover, .profile-trigger:focus-visible { background: var(--session-hover); }
.profile-more { margin: 0 8px 0 auto; flex: none; color: var(--label-tertiary); }
''')

update('main.css', [
    ('  height: 56px;', '  height: 60px;'),
    ('  padding: 0 18px;', '  padding: 0 16px;'),
    ('  max-width: min(70vw, 640px);\n  padding: 4px 8px;\n  margin-left: -4px;\n  border: none;\n  border-radius: 8px;', '  max-width: 100%;\n  height: 40px;\n  padding: 8px 12px;\n  margin-left: -11px;\n  position: relative;\n  top: -3px;\n  border: 1px solid transparent;\n  border-radius: 22px;'),
    ('  font-size: 16px;\n  font-weight: 500;', '  font-size: 14px;\n  font-weight: 500;'),
    ('  line-height: 24px;\n  text-overflow:', '  line-height: 22px;\n  text-overflow:'),
    ('.conversation-title:hover {\n  background: var(--hover);\n}', '.conversation-title:hover {\n  border-color: var(--border-l2);\n  box-shadow: 0 2px 4px rgba(0,0,0,.04);\n}'),
    ('  width: min(480px, 60vw);\n  height: 32px;\n  margin-left: -8px;\n  padding: 0 8px;', '  width: 100%;\n  height: 40px;\n  margin: 0;\n  padding: 0 12px;'),
    ('  border-radius: 8px;\n  background: var(--bg-base);', '  border-radius: 22px;\n  background: var(--bg-base);'),
    ('  border-color: var(--border-l2);\n  box-shadow: var(--focus-shadow, none);', '  border-color: var(--brand);\n  box-shadow: none;'),
])
with Path('src/styles/main.css').open('a', encoding='utf-8') as f:
    f.write('''
.conversation-title-wrap { max-width: min(100%, 480px); transition: margin-left var(--dur) var(--ease); }
.sidebar-is-collapsed .conversation-title-wrap { margin-left: 174px; max-width: min(480px, calc(100% - 174px)); }
.conversation-title-editor { display: grid; max-width: 100%; margin-left: -11px; position: relative; top: -3px; }
.conversation-title-editor::after { content: attr(data-value); visibility: hidden; white-space: pre; padding: 0 13px; font-size: 14px; font-weight: 500; }
.conversation-title-editor::after, .conversation-title-input { grid-area: 1 / 1; min-width: 0; }
@media (max-width: 767px) { .conversation-title-wrap { max-width: 60vw; } .sidebar-is-collapsed .conversation-title-wrap { max-width: calc(100% - 174px); } }
''')

update('confirm.css', [
    ('  max-width: 360px;\n  padding: 24px 24px 20px;\n  border: 1px solid var(--border-l1);\n  border-radius: 16px;', '  max-width: 380px;\n  padding: 22px 24px;\n  border-radius: 24px;'),
    ('  font-size: 17px;', '  font-size: 16px;'),
    ('  margin: 10px 0 0;', '  margin: 12px 0 0;'),
    ('  margin-top: 24px;', '  margin-top: 20px;'),
    ('  height: 36px;\n  padding: 0 17px;\n  border-radius: 10px;', '  height: 34px;\n  padding: 0 14px;\n  border-radius: 17px;'),
])

update('scroll-nav.css', [
    ('  width: 34px;\n  height: 300px;', '  width: 34px;\n  max-width: calc(100vw - 32px);\n  height: min(300px, calc(100vh - 260px));'),
    ('  padding: 8px 0;', '  padding: 10px 8px;'),
    ('  width: calc(100% - 6px);', '  width: 100%;'),
    ('  margin-right: 8px;\n  padding: 0;', '  margin: 0;\n  padding: 0 4px 0 8px;\n  border-radius: 6px;'),
    ('  pointer-events: none;', '  pointer-events: auto;'),
    ('.scroll-nav-item:hover {\n  color: var(--label-primary);', '.scroll-nav-item:hover {\n  background: var(--hover);\n  color: var(--label-primary);'),
    ('  bottom: 150px;', '  bottom: 182px;'),
])

update('responsive.css', [
    ('    margin-left: 0;\n    transform: translateX(-100%);', '    margin-left: 0;\n    transform: translateX(-100%);'),
])

path=Path('src/styles/messages.css'); s=path.read_text(encoding='utf-8')
start=s.index('/* 思维链 */'); end=s.index('.dots {',start)
s=s[:start]+'''/* Published collapsible title: 34px, 16/28 text, atom icon and shimmer. */
.think { margin: 4px 0 12px; }
.think-head { display: flex; align-items: center; gap: 6px; height: 34px; margin-bottom: 2px; color: var(--label-secondary); font-size: 16px; line-height: 28px; user-select: none; }
.think-head:hover { color: var(--label-primary); }
.think-icon { width: 16px; height: 16px; flex: none; color: var(--brand); }
.think-head .caret { display: inline-flex; transition: transform .2s var(--ease); }
.think.open .think-head .caret { transform: rotate(90deg); }
.think-label { position: relative; display: inline-flex; overflow: hidden; }
.thinking .think-label::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,.7) 54.51%, transparent); animation: think-shimmer 2s ease-out infinite; }
html[data-theme="dark"] .thinking .think-label::after { background: linear-gradient(90deg, transparent, rgba(21,21,23,.5) 54.51%, transparent); }
.think-body { position: relative; padding: 5px 0 0 22px; color: var(--label-secondary); overflow-wrap: anywhere; }
.think-body::before { content: ''; position: absolute; left: 7.5px; top: 31px; bottom: 1px; border-left: 1px solid var(--label-dimmed); }
.think-progress { position: absolute; top: 9px; left: 0; width: 16px; height: 16px; display: grid; place-items: center; }
.think-progress i { width: 5px; height: 5px; background: var(--brand); border-radius: 50%; animation: think-breathe 1.5s linear infinite; }
.think-progress.inactive i { background: var(--label-tertiary); animation: none; }
.think-body .md-body { font-size: 16px; line-height: 28px; color: var(--label-secondary); }
.think-body .md-body > :first-child { margin-top: 0; }
.think-body .md-body > :last-child { margin-bottom: 0; }
@keyframes think-breathe { 0% { animation-timing-function: ease-out; transform: scale(1); } 40% { animation-timing-function: linear; transform: scale(1.3); } 60% { animation-timing-function: ease-out; transform: scale(1.3); } 100% { transform: scale(1); } }
@keyframes think-shimmer { 0% { transform: translateX(-100%); } 90%,100% { transform: translateX(100%); } }

'''+s[end:]
path.write_text(s,encoding='utf-8')
