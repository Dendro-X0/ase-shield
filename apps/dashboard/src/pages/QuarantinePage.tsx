import { useCallback, useEffect, useState } from 'react';

import {
  deleteQuarantine,
  deferQuarantine,
  fetchQuarantine,
  formatTime,
  LEVEL_CLASS,
  openSafely,
  type QuarantineRow,
} from '../api.js';

export function QuarantinePage() {
  const [items, setItems] = useState<QuarantineRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const rows = await fetchQuarantine();
      setItems(rows.filter((row) => row.status !== 'deferred'));
      setError(null);
    } catch {
      setError('Companion not reachable.');
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 4000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function runAction(id: string, action: 'defer' | 'delete' | 'open'): Promise<void> {
    setBusyId(id);
    setMessage(null);
    try {
      if (action === 'defer') await deferQuarantine(id);
      if (action === 'delete') await deleteQuarantine(id);
      if (action === 'open') {
        await openSafely(id);
        setMessage('Safe Workspace started in the companion app.');
      }
      await refresh();
    } catch (err) {
      setMessage(String(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Quarantine</h1>
          <p className="lede">Risky downloads held until you choose how to open them.</p>
        </div>
        <button type="button" className="ghost" onClick={() => void refresh()}>
          Refresh
        </button>
      </header>

      {error && <div className="banner error">{error}</div>}
      {message && <div className="banner info">{message}</div>}

      <section className="panel">
        {items.length === 0 ? (
          <p className="empty">Quarantine is empty. Flagged downloads from the browser appear here.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Level</th>
                  <th>Received</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.filename}</strong>
                      {item.findings[0] && <p className="sub">{item.findings[0]}</p>}
                    </td>
                    <td>
                      <span className={`pill ${LEVEL_CLASS[item.level]}`}>{item.level}</span>
                    </td>
                    <td>{formatTime(item.receivedAt)}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="primary"
                        disabled={busyId === item.id}
                        onClick={() => void runAction(item.id, 'open')}
                      >
                        Open safely
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void runAction(item.id, 'defer')}
                      >
                        Not now
                      </button>
                      <button
                        type="button"
                        className="danger"
                        disabled={busyId === item.id}
                        onClick={() => void runAction(item.id, 'delete')}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
