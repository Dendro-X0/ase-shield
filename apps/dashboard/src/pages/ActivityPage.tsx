import { useCallback, useEffect, useState } from 'react';

import { fetchActivity, formatTime, LEVEL_CLASS } from '../api.js';
import type { DashboardActivity } from '@ase/core';

const KIND_LABELS: Record<DashboardActivity['kind'], string> = {
  thread_flagged: 'Thread',
  download_quarantined: 'Download',
  remote_session: 'Remote access',
  incident: 'Incident',
  practice: 'Practice demo',
  lab_scenario: 'Dev lab',
};

export function ActivityPage() {
  const [items, setItems] = useState<DashboardActivity[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setItems(await fetchActivity());
      setError(null);
    } catch {
      setError('Companion not reachable.');
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Activity</h1>
          <p className="lede">Flagged threads, quarantined downloads, and remote-session events.</p>
        </div>
        <button type="button" className="ghost" onClick={() => void refresh()}>
          Refresh
        </button>
      </header>

      {error && <div className="banner error">{error}</div>}

      <section className="panel">
        {items.length === 0 ? (
          <p className="empty">No recorded activity yet.</p>
        ) : (
          <ul className="feed feed-full">
            {items.map((item) => (
              <li key={item.id}>
                <div className="feed-top">
                  <span className="kind">{KIND_LABELS[item.kind]}</span>
                  <strong>{item.title}</strong>
                  {item.level && <span className={`pill ${LEVEL_CLASS[item.level]}`}>{item.level}</span>}
                </div>
                {item.detail && <p>{item.detail}</p>}
                <p className="meta">
                  {item.platform && <span>{item.platform}</span>}
                  {item.threadId && <span className="mono">{item.threadId}</span>}
                  <span>{formatTime(item.recordedAt)}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
