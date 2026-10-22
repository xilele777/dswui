import type { Session } from '../types';

export interface SessionGroup {
  label: string;
  items: Session[];
}

export function groupSessions(sessions: Session[]): SessionGroup[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();
  const day = 86400000;

  const buckets: Record<string, Session[]> = {
    置顶: [],
    今天: [],
    昨天: [],
    '7 天内': [],
    '30 天内': [],
    更早: [],
  };
  for (const s of sessions) {
    if (s.pinned) buckets['置顶'].push(s);
    else if (s.updatedAt >= today) buckets['今天'].push(s);
    else if (s.updatedAt >= today - day) buckets['昨天'].push(s);
    else if (s.updatedAt >= today - 7 * day) buckets['7 天内'].push(s);
    else if (s.updatedAt >= today - 30 * day) buckets['30 天内'].push(s);
    else buckets['更早'].push(s);
  }
  return Object.entries(buckets)
    .filter(([, items]) => items.length)
    .map(([label, items]) => ({
      label,
      items: items.sort((a, b) => b.updatedAt - a.updatedAt),
    }));
}
