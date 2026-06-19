import { invoke } from '@tauri-apps/api/core';

interface ActiveThreadContext {
  platform: string;
  threadId?: string;
  senderLabel?: string;
  level: 'safe' | 'caution' | 'high-risk';
  ruleIds: string[];
  summary?: string;
  updatedAt: number;
}

export interface RemoteSessionAlert {
  id: string;
  toolLabel: string;
  processMarkers: string[];
  detectedAt: string;
  correlated: boolean;
  status: 'pending' | 'shield_active' | 'dismissed' | 'ended';
  threadContext?: ActiveThreadContext;
  message: string;
}

export interface SensitiveAppWarning {
  windowTitle: string;
  matchedLabel: string;
  warnedAt: string;
}

export interface RemoteGuardState {
  activeThread?: ActiveThreadContext;
  alert?: RemoteSessionAlert;
  shieldActive: boolean;
  sensitiveWarning?: SensitiveAppWarning;
  runningRemoteTools: string[];
}

interface RemoteGuardPanelProps {
  guard: RemoteGuardState | null;
  busy: boolean;
  onRespond: (alertId: string, action: 'end' | 'shield' | 'user_started') => Promise<void>;
  onDismissSensitive: () => Promise<void>;
}

export function RemoteGuardPanel({
  guard,
  busy,
  onRespond,
  onDismissSensitive,
}: RemoteGuardPanelProps) {
  if (!guard) return null;

  const pendingAlert =
    guard.alert?.status === 'pending' ? guard.alert : undefined;

  return (
    <>
      {pendingAlert && (
        <div className="remote-session-dialog" role="alertdialog" aria-labelledby="remote-alert-title">
          <div className="remote-session-inner">
            <span className="remote-badge">Remote session detected</span>
            <h2 id="remote-alert-title">{pendingAlert.toolLabel}</h2>
            <p className="remote-message">{pendingAlert.message}</p>

            {pendingAlert.threadContext && (
              <p className="remote-context">
                Flagged thread: {pendingAlert.threadContext.platform}
                {pendingAlert.threadContext.summary
                  ? ` — ${pendingAlert.threadContext.summary}`
                  : ''}
              </p>
            )}

            <div className="remote-actions">
              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={() => void onRespond(pendingAlert.id, 'end')}
              >
                End session
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onRespond(pendingAlert.id, 'shield')}
              >
                Continue with shield
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onRespond(pendingAlert.id, 'user_started')}
              >
                I started this
              </button>
            </div>
          </div>
        </div>
      )}

      {(guard.shieldActive || guard.alert?.status === 'shield_active') && (
        <div className="shield-banner" role="status">
          <strong>Sensitive-app shield active</strong>
          <span>
            {guard.runningRemoteTools.length > 0
              ? `Watching while ${guard.runningRemoteTools.join(', ')} is running.`
              : 'Watching foreground apps during your remote session.'}
          </span>
        </div>
      )}

      {guard.sensitiveWarning && (
        <div className="sensitive-warning" role="alert">
          <strong>{guard.sensitiveWarning.matchedLabel} in foreground</strong>
          <p>
            A password or banking app is visible while remote access is active:{' '}
            <span className="mono">{guard.sensitiveWarning.windowTitle}</span>
          </p>
          <button type="button" disabled={busy} onClick={() => void onDismissSensitive()}>
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}

export async function fetchRemoteGuardState(): Promise<RemoteGuardState> {
  return invoke<RemoteGuardState>('get_remote_guard_state');
}

export async function respondRemoteAlert(
  alertId: string,
  action: 'end' | 'shield' | 'user_started',
): Promise<RemoteGuardState> {
  return invoke<RemoteGuardState>('respond_remote_session_alert', { alertId, action });
}

export async function dismissSensitiveWarning(): Promise<RemoteGuardState> {
  return invoke<RemoteGuardState>('dismiss_sensitive_warning');
}
