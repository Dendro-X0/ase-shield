import type { DashboardIncident } from '@ase/core';
import { AlertCircle, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import { useCallback, useState } from 'react';

import {
  fetchIncidents,
  fetchRemoteGuard,
  fetchSummary,
  formatTime,
  respondRemoteAlert,
  type RemoteGuardView,
} from '@/api';
import {
  ActionErrorAlert,
  ConnectionIssueBanner,
} from '@/components/connection-issue-banner';
import { IncidentExportActions } from '@/components/incident-export-actions';
import { EmptyState } from '@/components/empty-state';
import { PageHeader, PageSkeleton } from '@/components/layout/page-header';
import { RiskBadge } from '@/components/risk-badge';
import { SectionCard } from '@/components/section-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCompanionStatus } from '@/context/companion-status';
import { usePoll } from '@/hooks/use-poll';

interface ProtectionData {
  guard: RemoteGuardView;
  incidents: DashboardIncident[];
  sandboxAvailable: boolean;
}

export function ProtectionPage() {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchProtection = useCallback(async (): Promise<ProtectionData> => {
    const [guard, incidents, summary] = await Promise.all([
      fetchRemoteGuard(),
      fetchIncidents(),
      fetchSummary(),
    ]);
    return {
      guard,
      incidents,
      sandboxAvailable: summary.windowsSandboxAvailable,
    };
  }, []);

  const poll = usePoll(fetchProtection, 3000);
  const { extensionState } = useCompanionStatus();

  async function handleRespond(action: 'end' | 'shield' | 'user_started'): Promise<void> {
    if (!poll.data?.guard.alert) return;
    setBusy(true);
    setActionError(null);
    try {
      await respondRemoteAlert(poll.data.guard.alert.id, action);
      await poll.refresh();
    } catch (err) {
      setActionError(String(err));
    } finally {
      setBusy(false);
    }
  }

  const guard = poll.data?.guard;
  const incidents = poll.data?.incidents ?? [];
  const sandboxAvailable = poll.data?.sandboxAvailable ?? false;

  return (
    <>
      <PageHeader
        title="Protection"
        description="Remote-session guard and synced incident log."
        onRefresh={() => void poll.refresh()}
        refreshing={poll.refreshing}
        lastUpdated={poll.lastUpdated}
        loading={poll.loading && !poll.data}
      />

      {poll.loading && !poll.data && <PageSkeleton rows={3} />}

      {(poll.error || (extensionState != null && extensionState !== 'connected')) && (
        <ConnectionIssueBanner
          companionError={poll.error}
          extensionState={poll.error ? null : extensionState ?? undefined}
          onRetry={() => void poll.refresh()}
        />
      )}

      {actionError && (
        <ActionErrorAlert error={actionError} onDismiss={() => setActionError(null)} />
      )}

      {(!poll.loading || poll.data) && (
        <>
          <SectionCard
            title="Remote session guard"
            description="Respond when remote-access tools are detected during a flagged conversation."
          >
            {guard?.alert ? (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertTitle>{guard.alert.toolLabel} detected</AlertTitle>
                <AlertDescription className="space-y-4">
                  <p>{guard.alert.message}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={busy} onClick={() => void handleRespond('end')}>
                      End session
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void handleRespond('shield')}
                    >
                      Continue with shield
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void handleRespond('user_started')}
                    >
                      I started this
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <EmptyState
                title="No active remote-session prompt"
                description={
                  guard?.runningRemoteTools.length
                    ? `Running: ${guard.runningRemoteTools.join(', ')}`
                    : 'Remote-access tools will trigger a prompt here when detected.'
                }
              />
            )}

            {guard?.activeThread && (
              <div className="mt-4 rounded-lg border bg-muted/30 p-4">
                <p className="text-sm">
                  Active flagged thread on <strong>{guard.activeThread.platform}</strong>
                  {guard.activeThread.senderLabel && ` — ${guard.activeThread.senderLabel}`}
                </p>
                <div className="mt-2">
                  <RiskBadge level={guard.activeThread.level} />
                </div>
              </div>
            )}

            {guard?.sensitiveWarning && (
              <p className="mt-4 text-sm text-muted-foreground">
                Sensitive app in foreground: {guard.sensitiveWarning.matchedLabel}
              </p>
            )}
          </SectionCard>

          <SectionCard title="Environment">
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm">
                {sandboxAvailable ? (
                  <CheckCircle2 className="size-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="size-4 text-muted-foreground" />
                )}
                {sandboxAvailable
                  ? 'Windows Sandbox available'
                  : 'Windows Sandbox not available on this PC'}
              </li>
              <li className="flex items-center gap-2 text-sm">
                {guard?.shieldActive ? (
                  <Shield className="size-4 text-emerald-500" />
                ) : (
                  <Shield className="size-4 text-muted-foreground" />
                )}
                {guard?.shieldActive ? 'Sensitive-app shield is on' : 'Sensitive-app shield is off'}
              </li>
            </ul>
          </SectionCard>

          <SectionCard
            title="Incidents"
            description="High-risk threads synced from the extension."
            action={
              incidents.length > 0 ? (
                <IncidentExportActions disabled={Boolean(poll.error)} />
              ) : undefined
            }
          >
            {incidents.length === 0 ? (
              <EmptyState
                title="No incidents synced yet"
                description="High-risk threads are logged in the extension and mirrored here."
              />
            ) : (
              <ul className="divide-y">
                {incidents.map((item) => (
                  <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{item.summary}</p>
                          <RiskBadge level={item.level} />
                        </div>
                        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <Badge variant="outline">{item.platform}</Badge>
                          <span>{item.ruleIds.join(', ')}</span>
                          <span>{formatTime(item.recordedAt)}</span>
                        </p>
                      </div>
                      <IncidentExportActions
                        incidentId={item.id}
                        label="Export"
                        disabled={Boolean(poll.error)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </>
      )}
    </>
  );
}
