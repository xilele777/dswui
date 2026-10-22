import { useEffect } from 'react';
import { useStore } from '../../store';
import { loadDemoSession } from '../../demo';

/** 首屏一次性动作：?demo / ?theme 参数、移动端默认收起侧栏。 */
export function useInitialSetup(setSidebarOpen: (open: boolean) => void) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('demo') === '1' && useStore.getState().sessions.length === 0) {
      loadDemoSession();
    }

    const theme = params.get('theme');
    if (theme === 'dark' || theme === 'light') {
      useStore.getState().setSettings({ theme });
    }

    if (window.innerWidth < 768) setSidebarOpen(false);
  }, [setSidebarOpen]);
}
