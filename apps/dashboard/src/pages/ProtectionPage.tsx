import { useCallback, useEffect, useState } from 'react';

import {
  fetchIncidents,
  fetchRemoteGuard,
  fetchSummary,
  formatTime,
  LEVEL_CLASS,
  respondRemoteAlert,
  type RemoteGuardView,
} from '../api.js';
import type { DashboardIncident } from '@ase/core';

export function ProtectionPage() {
  const [guard, setGuard] = useState<RemoteGuardView | null>(null);
  const [incidents, setIncidents] = useState<DashboardIncident[]>([]);
  const [sandboxAvailable, setSandboxAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [nextGuard, nextIncidents, summary] = await Promise.all([
        fetchRemoteGuard(),
        fetchIncidents(),
        fetchSummary(),
      ]);
      setGuard(nextGuard);
      setIncidents(nextIncidents);
      setSandboxAvailable(summary.windowsSandboxAvailable);
      setError(null);
    } catch {
      setError('Companion not reachable.');
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 3000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function handleRespond(action: 'end' | 'shield' | 'user_started'): Promise<void> {
    if (!guard?.alert) return;
    setBusy(true);
    try {
      await respondRemoteAlert(guard.alert.id, action);
      await refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Protection</h1>
          <p className="lede">Remote-session guard and synced incident log.</p>
        </div>
        <button type="button" className="ghost" onClick={() => void refresh()}>
          Refresh
        </button>
      </header>

      {error && <div className="banner error">{error}</div>}

      <section className="panel">
        <h2>Remote session guard</h2>
        {guard?.alert ? (
          <div className="alert-card">
            <p className="alert-title">{guard.alert.toolLabel} detected</p>
            <p>{guard.alert.message}</p>
            <div className="actions">
              <button type="button" className="primary" disabled={busy} onClick={() => void handleRespond('end')}>
                End session
              </button>
              <button type="button" disabled={busy} onClick={() => void handleRespond('shield')}>
                Continue with shield
              </button>
              <button type="button" disabled={busy} onClick={() => void handleRespond('user_started')}>
                I started this
              </button>
            </div>
          </div>
        ) : (
          <p className="empty">
            No active remote-session prompt.
            {guard?.runningRemoteTools.length ? ` Running: ${guard.runningRemoteTools.join(', ')}` : ''}
          </p>
        )}

        {guard?.activeThread && (
          <div className="thread-card">
            <p>
              Active flagged thread on <strong>{guard.activeThread.platform}</strong>
              {guard.activeThread.senderLabel && ` — ${guard.activeThread.senderLabel}`}
            </p>
            <span className={`pill ${LEVEL_CLASS[guard.activeThread.level]}`}>
              {guard.activeThread.level}
            </span>
          </div>
        )}

        {guard?.sensitiveWarning && (
          <p className="sub">Sensitive app in foreground: {guard.sensitiveWarning.matchedLabel}</p>
        )}
      </section>

      <section className="panel">
        <h2>Environment</h2>
        <ul className="checklist">
          <li>{sandboxAvailable ? 'Windows Sandbox available' : 'Windows Sandbox not available on this PC'}</li>
          <li>{guard?.shieldActive ? 'Sensitive-app shield is on' : 'Sensitive-app shield is off'}</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Incidents (from extension)</h2>
        {incidents.length === 0 ? (
          <p className="empty">No incidents synced yet. High-risk threads are logged in the extension and mirrored here.</p>
        ) : (
          <ul className="feed">
            {incidents.map((item) => (
              <li key={item.id}>
                <div className="feed-top">
                  <strong>{item.summary}</strong>
                  <span className={`pill ${LEVEL_CLASS[item.level]}`}>{item.level}</span>
                </div>
                <p className="meta">
                  <span>{item.platform}</span>
                  <span>{item.ruleIds.join(', ')}</span>
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
