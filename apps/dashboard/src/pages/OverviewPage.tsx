import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchActivity, fetchSetup, fetchSummary, formatTime, LEVEL_CLASS, STATE_LABELS } from '../api.js';
import type { DashboardActivity, DashboardSetup, DashboardSummary } from '@ase/core';
import {
  CHROME_WEB_STORE_LISTING_URL,
  COMPANION_DOWNLOAD_URL,
  CONNECTION_TROUBLESHOOTING,
  PRACTICE_SCENARIO,
} from '@ase/core';

export function OverviewPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [setup, setSetup] = useState<DashboardSetup | null>(null);
  const [activity, setActivity] = useState<DashboardActivity[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isWelcome = useMemo(
    () => new URLSearchParams(window.location.search).get('welcome') === '1',
    [],
  );

  const refresh = useCallback(async () => {
    try {
      const [nextSummary, nextActivity, nextSetup] = await Promise.all([
        fetchSummary(),
        fetchActivity(),
        fetchSetup(),
      ]);
      setSummary(nextSummary);
      setSetup(nextSetup);
      setActivity(nextActivity.slice(0, 8));
      setError(null);
    } catch {
      setError('Start the Anti-SE Companion on this PC, then reload this page.');
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 4000);
    return () => clearInterval(timer);
  }, [refresh]);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Overview</h1>
          <p className="lede">Live status from your extension and Windows companion.</p>
        </div>
        <button type="button" className="ghost" onClick={() => void refresh()}>
          Refresh
        </button>
      </header>

      {error && <div className="banner error">{error}</div>}

      {isWelcome && (
        <div className="banner info">
          <strong>Welcome to Anti-SE Shield.</strong> Install the browser extension from the store, run
          practice mode once, and confirm a high-risk row appears in Recent activity below.
        </div>
      )}

      {summary && summary.extensionState !== 'connected' && (
        <section className="panel troubleshoot-panel">
          <h2>Extension not connected</h2>
          <ol className="troubleshoot-steps">
            {CONNECTION_TROUBLESHOOTING.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <p className="setup-lab">
            <a href={CHROME_WEB_STORE_LISTING_URL} target="_blank" rel="noreferrer">
              Chrome Web Store
            </a>
            {' · '}
            <a href={COMPANION_DOWNLOAD_URL} target="_blank" rel="noreferrer">
              Companion installer
            </a>
          </p>
        </section>
      )}

      {setup && !setup.hasPracticeScan && (
        <section className="panel setup-panel">
          <h2>See it work in 2 minutes</h2>
          <p className="lede">{setup.practiceScenario || PRACTICE_SCENARIO}</p>
          <ol className="setup-steps">
            <li className={setup.extensionConnected ? 'done' : 'pending'}>
              <strong>Extension connected</strong>
              <span>
                {setup.extensionConnected
                  ? 'Popup shows Connected.'
                  : 'Install the extension from the store, then open the popup → Check now.'}
              </span>
            </li>
            <li className={setup.hasPracticeScan ? 'done' : 'pending'}>
              <strong>Run practice scan</strong>
              <span>Extension popup → Practice → Analyze this thread.</span>
            </li>
            <li className={setup.hasActivity ? 'done' : 'pending'}>
              <strong>Proof on this page</strong>
              <span>A high-risk practice row appears in Recent activity below.</span>
            </li>
          </ol>
          <p className="setup-next">
            <strong>Next:</strong> {setup.recommendedNext}
          </p>
          {setup.devLabUrl ? (
            <p className="setup-lab">
              <strong>Want more scenarios?</strong>{' '}
              <a href={setup.devLabUrl} target="_blank" rel="noreferrer">
                Open Dev Lab
              </a>{' '}
              — simulated fraud threads and a regression suite, no real scammers required.
            </p>
          ) : (
            <p className="setup-lab muted">
              <strong>Dev Lab:</strong> connect the extension first; a direct link appears here.
            </p>
          )}
        </section>
      )}

      {setup?.hasPracticeScan && (
        <div className="banner info">
          Practice scan recorded — the shield flagged remote-access and payment-bypass patterns. On real
          sites, the same analysis runs on your conversations automatically.
        </div>
      )}

      {summary && (
        <section className="stat-grid">
          <StatCard
            label="Extension"
            value={STATE_LABELS[summary.extensionState]}
            tone={summary.extensionState === 'connected' ? 'good' : 'warn'}
          />
          <StatCard label="Quarantine" value={String(summary.quarantineCount)} tone="neutral" />
          <StatCard label="Incidents" value={String(summary.incidentCount)} tone="neutral" />
          <StatCard
            label="Remote shield"
            value={summary.remoteShieldActive ? 'Active' : 'Off'}
            tone={summary.remoteShieldActive ? 'good' : 'neutral'}
          />
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <h2>Recent activity</h2>
          <span className="muted">{summary ? `v${summary.companionVersion}` : ''}</span>
        </div>

        {activity.length === 0 ? (
          <div className="empty-block">
            <p className="empty">No activity yet.</p>
            {!setup?.hasPracticeScan && (
              <p className="empty-hint">
                Fastest proof: extension popup → <strong>Practice</strong> → Analyze (companion must be
                running).
              </p>
            )}
          </div>
        ) : (
          <ul className="feed">
            {activity.map((item) => (
              <li key={item.id}>
                <div className="feed-top">
                  <strong>{item.title}</strong>
                  {item.level && <span className={`pill ${LEVEL_CLASS[item.level]}`}>{item.level}</span>}
                </div>
                {item.detail && <p>{item.detail}</p>}
                <p className="meta">
                  {item.platform && <span>{item.platform}</span>}
                  <span>{formatTime(item.recordedAt)}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel hint-panel">
        <h2>How to use this dashboard</h2>
        <ul>
          <li>Keep the companion running in the system tray while you work.</li>
          <li>Use the extension badge on conversations for live warnings.</li>
          <li>Review quarantined downloads here before opening files.</li>
          <li>Respond to remote-session alerts from the Protection page.</li>
          {setup?.devLabUrl && (
            <li>
              Run simulated fraud scenarios in the{' '}
              <a href={setup.devLabUrl} target="_blank" rel="noreferrer">
                Dev Lab
              </a>{' '}
              (extension page).
            </li>
          )}
        </ul>
      </section>
    </>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'good' | 'warn' | 'neutral';
}) {
  return (
    <article className={`stat stat-${tone}`}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
    </article>
  );
}
