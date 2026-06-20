import { useCallback } from 'react';

import { fetchActivity } from '@/api';
import { ActivityFeed } from '@/components/activity-feed';
import { ConnectionIssueBanner } from '@/components/connection-issue-banner';
import { EmptyState } from '@/components/empty-state';
import { PageHeader, PageSkeleton } from '@/components/layout/page-header';
import { SectionCard } from '@/components/section-card';
import { useCompanionStatus } from '@/context/companion-status';
import { usePoll } from '@/hooks/use-poll';

export function ActivityPage() {
  const fetchItems = useCallback(() => fetchActivity(), []);
  const poll = usePoll(fetchItems, 5000);
  const { extensionState } = useCompanionStatus();

  return (
    <>
      <PageHeader
        title="Activity"
        description="Flagged threads, quarantined downloads, and remote-session events."
        onRefresh={() => void poll.refresh()}
        refreshing={poll.refreshing}
        lastUpdated={poll.lastUpdated}
        loading={poll.loading && !poll.data}
      />

      {poll.loading && !poll.data && <PageSkeleton rows={2} />}

      {poll.error || (extensionState != null && extensionState !== 'connected') ? (
        <ConnectionIssueBanner
          companionError={poll.error}
          extensionState={poll.error ? null : extensionState ?? undefined}
          onRetry={() => void poll.refresh()}
        />
      ) : null}

      {(!poll.loading || poll.data) && (
        <SectionCard
          title="Event log"
          description="All recorded activity from the extension and companion."
        >
          {!poll.data?.length ? (
            <EmptyState
              title="No recorded activity yet"
              description="Run a practice scan or browse a supported platform to generate events."
            />
          ) : (
            <ActivityFeed items={poll.data} showKind />
          )}
        </SectionCard>
      )}
    </>
  );
}
