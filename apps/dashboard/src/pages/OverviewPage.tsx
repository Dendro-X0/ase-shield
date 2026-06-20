import { PRACTICE_SCENARIO } from '@ase/core';
import type { DashboardActivity, DashboardSetup, DashboardSummary } from '@ase/core';
import { AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import { fetchActivity, fetchSetup, fetchSummary, STATE_LABELS } from '@/api';
import { ActivityFeed } from '@/components/activity-feed';
import { ConnectionIssueBanner } from '@/components/connection-issue-banner';
import { EmptyState } from '@/components/empty-state';
import { PageHeader, PageSkeleton } from '@/components/layout/page-header';
import { SectionCard } from '@/components/section-card';
import { StatCard } from '@/components/stat-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useCompanionStatus } from '@/context/companion-status';
import { usePoll } from '@/hooks/use-poll';

interface OverviewData {
  summary: DashboardSummary;
  setup: DashboardSetup;
  activity: DashboardActivity[];
}

export function OverviewPage() {
  const fetchOverview = useCallback(async (): Promise<OverviewData> => {
    const [summary, activity, setup] = await Promise.all([
      fetchSummary(),
      fetchActivity(),
      fetchSetup(),
    ]);
    return { summary, setup, activity: activity.slice(0, 8) };
  }, []);

  const poll = usePoll(
    fetchOverview,
    4000,
    'Start the Anti-SE Companion on this PC, then reload this page.',
  );

  const isWelcome = useMemo(
    () => new URLSearchParams(window.location.search).get('welcome') === '1',
    [],
  );

  const summary = poll.data?.summary ?? null;
  const setup = poll.data?.setup ?? null;
  const activity = poll.data?.activity ?? [];
  const { extensionState } = useCompanionStatus();

  return (
    <>
      <PageHeader
        title="Overview"
        description="Live status from your extension and Windows companion."
        onRefresh={() => void poll.refresh()}
        refreshing={poll.refreshing}
        lastUpdated={poll.lastUpdated}
        loading={poll.loading && !poll.data}
      />

      {poll.loading && !poll.data && <PageSkeleton rows={4} />}

      {poll.error || (extensionState != null && extensionState !== 'connected') ? (
        <ConnectionIssueBanner
          companionError={poll.error}
          extensionState={poll.error ? null : extensionState}
          onRetry={() => void poll.refresh()}
        />
      ) : null}

      {!poll.loading || poll.data ? (
        <>
          {isWelcome && (
            <Alert variant="info">
              <AlertCircle className="size-4" />
              <AlertTitle>Welcome to Anti-SE Shield</AlertTitle>
              <AlertDescription>
                Install the browser extension from the store, run practice mode once, and confirm a
                high-risk row appears in Recent activity below.
              </AlertDescription>
            </Alert>
          )}

          {setup && !setup.hasPracticeScan && (
            <SectionCard
              title="See it work in 2 minutes"
              description={setup.practiceScenario || PRACTICE_SCENARIO}
            >
              <ul className="space-y-3">
                <SetupStep
                  done={setup.extensionConnected}
                  title="Extension connected"
                  detail={
                    setup.extensionConnected
                      ? 'Popup shows Connected.'
                      : 'Install the extension from the store, then open the popup → Check now.'
                  }
                />
                <SetupStep
                  done={setup.hasPracticeScan}
                  title="Run practice scan"
                  detail="Extension popup → Practice → Analyze this thread."
                />
                <SetupStep
                  done={setup.hasActivity}
                  title="Proof on this page"
                  detail="A high-risk practice row appears in Recent activity below."
                />
              </ul>
              <p className="mt-4 text-sm">
                <span className="font-medium">Next:</span> {setup.recommendedNext}
              </p>
              {setup.devLabUrl ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Want more scenarios?</span>{' '}
                  <a
                    href={setup.devLabUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Open Dev Lab
                  </a>{' '}
                  — simulated fraud threads and a regression suite, no real scammers required.
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Dev Lab:</span> connect the extension
                  first; a direct link appears here.
                </p>
              )}
            </SectionCard>
          )}

          {setup?.hasPracticeScan && (
            <Alert variant="info">
              <CheckCircle2 className="size-4" />
              <AlertTitle>Practice scan recorded</AlertTitle>
              <AlertDescription>
                The shield flagged remote-access and payment-bypass patterns. On real sites, the same
                analysis runs on your conversations automatically.
              </AlertDescription>
            </Alert>
          )}

          {summary && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            </div>
          )}

          <SectionCard
            title="Recent activity"
            description="Latest events from the extension and companion."
            action={
              summary ? (
                <Badge variant="outline" className="font-normal">
                  v{summary.companionVersion}
                </Badge>
              ) : undefined
            }
          >
            {activity.length === 0 ? (
              <EmptyState
                title="No activity yet"
                description={
                  !setup?.hasPracticeScan
                    ? 'Extension popup → Practice → Analyze (companion must be running).'
                    : undefined
                }
              />
            ) : (
              <ActivityFeed items={activity} />
            )}
          </SectionCard>

          <SectionCard title="How to use this dashboard">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Keep the companion running in the system tray while you work.</li>
              <li>Use the extension badge on conversations for live warnings.</li>
              <li>Review quarantined downloads here before opening files.</li>
              <li>Respond to remote-session alerts from the Protection page.</li>
              {setup?.devLabUrl && (
                <li>
                  Run simulated fraud scenarios in the{' '}
                  <a
                    href={setup.devLabUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Dev Lab
                  </a>{' '}
                  (extension page).
                </li>
              )}
            </ul>
          </SectionCard>
        </>
      ) : null}
    </>
  );
}

function SetupStep({
  done,
  title,
  detail,
}: {
  done: boolean;
  title: string;
  detail: string;
}) {
  const Icon = done ? CheckCircle2 : Circle;

  return (
    <li className="flex gap-3">
      <Icon
        className={
          done
            ? 'mt-0.5 size-5 shrink-0 text-emerald-500'
            : 'mt-0.5 size-5 shrink-0 text-muted-foreground'
        }
        aria-hidden="true"
      />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
    </li>
  );
}
