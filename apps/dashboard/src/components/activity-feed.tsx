import type { DashboardActivity } from '@ase/core';

import { formatTime } from '@/api';
import { RiskBadge } from '@/components/risk-badge';
import { Badge } from '@/components/ui/badge';

const KIND_LABELS: Record<DashboardActivity['kind'], string> = {
  thread_flagged: 'Thread',
  download_quarantined: 'Download',
  remote_session: 'Remote access',
  incident: 'Incident',
  practice: 'Practice demo',
  lab_scenario: 'Dev lab',
};

export function ActivityFeed({
  items,
  showKind = false,
}: {
  items: DashboardActivity[];
  showKind?: boolean;
}) {
  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.id} className="py-4 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-2">
            {showKind && <Badge variant="secondary">{KIND_LABELS[item.kind]}</Badge>}
            <p className="font-medium">{item.title}</p>
            {item.level && <RiskBadge level={item.level} />}
          </div>
          {item.detail && <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>}
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {item.platform && <span>{item.platform}</span>}
            {item.threadId && <span className="font-mono">{item.threadId}</span>}
            <span>{formatTime(item.recordedAt)}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

export { KIND_LABELS };
