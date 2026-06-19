import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DASHBOARD_URL } from '@ase/core';
import { listen } from '@tauri-apps/api/event';
import {
  dismissSensitiveWarning,
  fetchRemoteGuardState,
  RemoteGuardPanel,
  respondRemoteAlert,
  type RemoteGuardState,
} from './RemoteGuard.js';
import { RecoveryWizard } from './RecoveryWizard.js';
import {
  COMPANION_CONNECTION_TIMEOUT_MS,
  connectionStateFromLastPong,
  type ConnectionState,
} from '@ase/core';

interface CompanionStatus {
  extensionLastPingAt: number | null;
  ipcPort: number;
  version: string;
  quarantineCount: number;
  quarantineDir: string;
  windowsSandboxAvailable: boolean;
}

interface QuarantineItem {
  id: string;
  downloadId?: number;
  filename: string;
  quarantinePath: string;
  sourceUrl?: string;
  threadId?: string;
  sha256?: string;
  status: 'scanning' | 'ready' | 'deferred' | 'error';
  level: 'safe' | 'caution' | 'high-risk';
  findings: string[];
  receivedAt: string;
}

interface OpenSafelyResult {
  sessionId: string;
  tier: string;
  tierLabel: string;
  status: string;
  message: string;
  usedFallback: boolean;
  networkPolicy: string;
}

type SessionPreview =
  | { kind: 'text'; content: string }
  | { kind: 'image'; mimeType: string; dataBase64: string }
  | { kind: 'pdf'; dataBase64: string }
  | { kind: 'archiveListing'; entries: string[] }
  | { kind: 'documentBlocked'; reason: string }
  | { kind: 'externalVm'; note: string }
  | { kind: 'unsupported'; note: string };

interface SandboxSessionView {
  id: string;
  quarantineId: string;
  filename: string;
  tier: string;
  tierLabel: string;
  startedAt: string;
  message: string;
  usedFallback: boolean;
  networkPolicy: string;
  preview: SessionPreview;
}

interface SessionEndSummary {
  sessionId: string;
  summary: string;
  exportedFiles: string[];
}

export default function App() {
  const [status, setStatus] = useState<CompanionStatus | null>(null);
  const [items, setItems] = useState<QuarantineItem[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [session, setSession] = useState<SandboxSessionView | null>(null);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);
  const [advancedOpenId, setAdvancedOpenId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [remoteGuard, setRemoteGuard] = useState<RemoteGuardState | null>(null);
  const [remoteBusy, setRemoteBusy] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const next = await invoke<CompanionStatus>('get_companion_status');
      setStatus(next);
    } catch {
      setStatus(null);
    }
  }, []);

  const refreshItems = useCallback(async () => {
    try {
      const next = await invoke<QuarantineItem[]>('list_quarantine_items');
      setItems(next);
    } catch {
      setItems([]);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const active = await invoke<SandboxSessionView | null>('get_active_sandbox_session');
      setSession(active);
    } catch {
      setSession(null);
    }
  }, []);

  const refreshRemoteGuard = useCallback(async () => {
    try {
      const next = await fetchRemoteGuardState();
      setRemoteGuard(next);
    } catch {
      setRemoteGuard(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      if (!active) return;
      await refreshStatus();
      await refreshItems();
      await refreshSession();
      await refreshRemoteGuard();
    };

    void refresh();
    const timer = setInterval(() => {
      void refreshStatus();
      void refreshRemoteGuard();
    }, 2000);

    const listeners = Promise.all([
      listen('quarantine-updated', () => {
        void refreshItems();
        void refreshStatus();
      }),
      listen<SandboxSessionView>('sandbox-session-started', (event) => {
        setSession(event.payload);
        setSessionSummary(null);
      }),
      listen<SessionEndSummary>('sandbox-session-ended', (event) => {
        setSession(null);
        setSessionSummary(event.payload.summary);
      }),
      listen('remote-session-alert', () => {
        void refreshRemoteGuard();
      }),
      listen('sensitive-app-warning', () => {
        void refreshRemoteGuard();
      }),
      listen('remote-guard-updated', () => {
        void refreshRemoteGuard();
      }),
    ]);

    return () => {
      active = false;
      clearInterval(timer);
      void listeners.then((unsubs) => unsubs.forEach((unsub) => unsub()));
    };
  }, [refreshItems, refreshRemoteGuard, refreshSession, refreshStatus]);

  const extensionState: ConnectionState = connectionStateFromLastPong(
    status?.extensionLastPingAt ?? null,
  );

  const visibleItems = items.filter((item) => item.status !== 'deferred');

  async function handleDefer(id: string): Promise<void> {
    setBusyId(id);
    setActionMessage(null);
    try {
      await invoke('defer_quarantine_item', { id });
      await refreshItems();
      await refreshStatus();
    } catch (error) {
      setActionMessage(String(error));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string): Promise<void> {
    setBusyId(id);
    setActionMessage(null);
    try {
      await invoke('delete_quarantine_item', { id });
      await refreshItems();
      await refreshStatus();
    } catch (error) {
      setActionMessage(String(error));
    } finally {
      setBusyId(null);
    }
  }

  async function handleOpenSafely(id: string): Promise<void> {
    setBusyId(id);
    setActionMessage(null);
    setSessionSummary(null);
    try {
      const result = await invoke<OpenSafelyResult>('request_open_safely', { id });
      setActionMessage(result.message);
      await refreshSession();
    } catch (error) {
      setActionMessage(String(error));
    } finally {
      setBusyId(null);
    }
  }

  async function handleEndSession(): Promise<void> {
    if (!session) return;
    setBusyId(session.id);
    try {
      const summary = await invoke<SessionEndSummary>('end_sandbox_session', {
        sessionId: session.id,
      });
      setSessionSummary(summary.summary);
      setSession(null);
    } catch (error) {
      setActionMessage(String(error));
    } finally {
      setBusyId(null);
    }
  }

  async function handleOpenNormally(id: string): Promise<void> {
    setBusyId(id);
    setActionMessage(null);
    try {
      await invoke('open_normally_with_confirm', { id, confirmation: confirmText });
      setActionMessage('File opened on your PC using the default app.');
      setAdvancedOpenId(null);
      setConfirmText('');
    } catch (error) {
      setActionMessage(String(error));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemoteRespond(
    alertId: string,
    action: 'end' | 'shield' | 'user_started',
  ): Promise<void> {
    setRemoteBusy(true);
    setActionMessage(null);
    try {
      const next = await respondRemoteAlert(alertId, action);
      setRemoteGuard(next);
      if (action === 'end') {
        setActionMessage('Remote session ended and remote tool processes were closed.');
      }
    } catch (error) {
      setActionMessage(String(error));
    } finally {
      setRemoteBusy(false);
    }
  }

  async function handleDismissSensitive(): Promise<void> {
    setRemoteBusy(true);
    try {
      const next = await dismissSensitiveWarning();
      setRemoteGuard(next);
    } finally {
      setRemoteBusy(false);
    }
  }

  return (
    <div className={`app ${session ? 'safe-workspace-active' : ''}`}>
      <RemoteGuardPanel
        guard={remoteGuard}
        busy={remoteBusy}
        onRespond={handleRemoteRespond}
        onDismissSensitive={handleDismissSensitive}
      />
      <RecoveryWizard open={recoveryOpen} onClose={() => setRecoveryOpen(false)} />
      {session && (
        <SafeWorkspaceOverlay
          session={session}
          busy={busyId === session.id}
          onEnd={() => void handleEndSession()}
        />
      )}

      <header>
        <h1>Anti-SE Companion</h1>
        <p className="subtitle">Quarantine inbox — open job files in a locked room</p>
        <button type="button" className="dashboard-link" onClick={() => void invoke('open_dashboard')}>
          Open web dashboard
        </button>
      </header>

      <section className="card">
        <h2>Browser extension</h2>
        <StatusRow state={extensionState} />
        <p className="hint">
          {extensionState === 'connected'
            ? 'Extension is communicating with this companion.'
            : 'Load the Anti-SE Shield extension in Chrome or Edge.'}
        </p>
      </section>

      <section className="card">
        <div className="card-heading">
          <h2>Quarantine inbox</h2>
          <span className="badge">{status?.quarantineCount ?? visibleItems.length}</span>
        </div>

        {!status?.windowsSandboxAvailable && (
          <p className="hint sandbox-hint">
            Windows Sandbox is not available on this PC. Executables use limited protection instead of a disposable VM.
          </p>
        )}

        {sessionSummary && <p className="action-message success">{sessionSummary}</p>}
        {actionMessage && !session && <p className="action-message">{actionMessage}</p>}

        {visibleItems.length === 0 ? (
          <p className="hint">No flagged downloads in quarantine. Risky browser downloads appear here automatically.</p>
        ) : (
          <ul className="quarantine-list">
            {visibleItems.map((item) => (
              <li key={item.id} className="quarantine-item">
                <div className="item-header">
                  <strong className="filename">{item.filename}</strong>
                  <LevelBadge level={item.level} />
                </div>

                <ul className="findings">
                  {item.findings.slice(0, 4).map((finding) => (
                    <li key={finding}>{finding}</li>
                  ))}
                </ul>

                {item.sha256 && (
                  <p className="hash mono" title={item.sha256}>
                    SHA-256: {item.sha256.slice(0, 16)}…
                  </p>
                )}

                <div className="actions">
                  <button
                    type="button"
                    className="primary"
                    disabled={busyId === item.id || session !== null}
                    onClick={() => void handleOpenSafely(item.id)}
                  >
                    Open safely
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void handleDefer(item.id)}
                  >
                    Not now
                  </button>
                  <button
                    type="button"
                    className="danger"
                    disabled={busyId === item.id}
                    onClick={() => void handleDelete(item.id)}
                  >
                    Delete
                  </button>
                </div>

                {item.level === 'high-risk' && (
                  <details
                    className="advanced-open"
                    open={advancedOpenId === item.id}
                    onToggle={(event) => {
                      const open = (event.target as HTMLDetailsElement).open;
                      setAdvancedOpenId(open ? item.id : null);
                      if (!open) setConfirmText('');
                    }}
                  >
                    <summary>Advanced — open normally anyway</summary>
                    <p className="hint">
                      Bypasses sandbox protection. Only use if you fully trust this file.
                    </p>
                    <label className="confirm-label">
                      Type OPEN ANYWAY
                      <input
                        type="text"
                        value={advancedOpenId === item.id ? confirmText : ''}
                        onChange={(event) => setConfirmText(event.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </label>
                    <button
                      type="button"
                      className="danger"
                      disabled={busyId === item.id || confirmText.trim() !== 'OPEN ANYWAY'}
                      onClick={() => void handleOpenNormally(item.id)}
                    >
                      Open on my PC
                    </button>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}

        {status?.quarantineDir && (
          <p className="hint path-hint">Storage: {status.quarantineDir}</p>
        )}
      </section>

      <section className="card">
        <h2>Recovery kit</h2>
        <p className="hint">
          Step-by-step help after a near-miss: secure accounts, scan startup changes, undo suspicious
          entries, and export a support report.
        </p>
        <button type="button" className="primary" onClick={() => setRecoveryOpen(true)}>
          Open recovery wizard
        </button>
      </section>

      <section className="card compact">
        <h2>IPC server</h2>
        <p className="mono">127.0.0.1:{status?.ipcPort ?? 47123}</p>
        <p className="hint">Localhost only — no external network calls.</p>
      </section>

      <footer>
        <span>Public beta</span>
        <a href={DASHBOARD_URL} target="_blank" rel="noreferrer">
          Dashboard
        </a>
        <span>v{status?.version ?? '0.0.0'}</span>
      </footer>
    </div>
  );
}

function SafeWorkspaceOverlay({
  session,
  busy,
  onEnd,
}: {
  session: SandboxSessionView;
  busy: boolean;
  onEnd: () => void;
}) {
  return (
    <div className="safe-workspace" role="dialog" aria-label="Safe Workspace">
      <div className="safe-workspace-inner">
        <div className="safe-workspace-header">
          <span className="safe-badge">Safe Workspace</span>
          <span className="tier-label">{session.tierLabel}</span>
        </div>

        <h2 className="safe-filename">{session.filename}</h2>
        <p className="safe-message">{session.message}</p>

        {session.usedFallback && (
          <p className="fallback-note">
            Full isolation needs Windows Sandbox (Pro). You are viewing with limited protection.
          </p>
        )}

        {session.networkPolicy === 'host-preview' && (
          <p className="network-note">
            Outbound network is not blocked for this preview on your PC. Executable files should use Windows Sandbox when available.
          </p>
        )}

        <SessionPreviewView preview={session.preview} />

        <div className="safe-actions">
          <button type="button" className="primary" disabled={busy} onClick={onEnd}>
            End session
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionPreviewView({ preview }: { preview: SessionPreview }) {
  switch (preview.kind) {
    case 'text':
      return <pre className="preview-text">{preview.content}</pre>;
    case 'image':
      return (
        <img
          className="preview-image"
          src={`data:${preview.mimeType};base64,${preview.dataBase64}`}
          alt="Safe preview"
        />
      );
    case 'pdf':
      return (
        <iframe
          className="preview-pdf"
          title="PDF preview"
          src={`data:application/pdf;base64,${preview.dataBase64}`}
        />
      );
    case 'archiveListing':
      return (
        <ul className="preview-list">
          {preview.entries.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      );
    case 'documentBlocked':
      return <p className="preview-note">{preview.reason}</p>;
    case 'externalVm':
    case 'unsupported':
      return <p className="preview-note">{preview.note}</p>;
    default:
      return null;
  }
}

function StatusRow({ state }: { state: ConnectionState }) {
  const labels: Record<ConnectionState, string> = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    unknown: 'Waiting…',
  };

  return (
    <div className={`status ${state}`} role="status">
      <span className="dot" aria-hidden="true" />
      <strong>{labels[state]}</strong>
      <span className="timeout">({COMPANION_CONNECTION_TIMEOUT_MS / 1000}s window)</span>
    </div>
  );
}

function LevelBadge({ level }: { level: QuarantineItem['level'] }) {
  const labels: Record<QuarantineItem['level'], string> = {
    safe: 'Safe',
    caution: 'Caution',
    'high-risk': 'High risk',
  };

  return <span className={`level level-${level}`}>{labels[level]}</span>;
}
