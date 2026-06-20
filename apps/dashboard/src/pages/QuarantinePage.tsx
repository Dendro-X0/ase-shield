import { CheckCircle2 } from 'lucide-react';
import { useCallback, useState } from 'react';

import {
  deleteQuarantine,
  deferQuarantine,
  fetchQuarantine,
  formatTime,
  openSafely,
  type QuarantineRow,
} from '@/api';
import { ConnectionIssueBanner } from '@/components/connection-issue-banner';
import { EmptyState } from '@/components/empty-state';
import { PageHeader, PageSkeleton } from '@/components/layout/page-header';
import { RiskBadge } from '@/components/risk-badge';
import { SectionCard } from '@/components/section-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { usePoll } from '@/hooks/use-poll';
import { useCompanionStatus } from '@/context/companion-status';

export function QuarantinePage() {
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchItems = useCallback(async (): Promise<QuarantineRow[]> => {
    const rows = await fetchQuarantine();
    return rows.filter((row) => row.status !== 'deferred');
  }, []);

  const poll = usePoll(fetchItems, 4000);
  const { extensionState } = useCompanionStatus();

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
      await poll.refresh();
    } catch (err) {
      setMessage(String(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Quarantine"
        description="Risky downloads held until you choose how to open them."
        onRefresh={() => void poll.refresh()}
        refreshing={poll.refreshing}
        lastUpdated={poll.lastUpdated}
        loading={poll.loading && !poll.data}
      />

      {poll.loading && !poll.data && <PageSkeleton rows={2} />}

      {(poll.error || (extensionState != null && extensionState !== 'connected')) && (
        <ConnectionIssueBanner
          companionError={poll.error}
          extensionState={poll.error ? null : extensionState ?? undefined}
          onRetry={() => void poll.refresh()}
        />
      )}

      {message && (
        <Alert variant="info">
          <CheckCircle2 className="size-4" />
          <AlertTitle>Action complete</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {(!poll.loading || poll.data) && (
        <SectionCard
          title="Held downloads"
          description="Flagged files from the browser extension. Open safely in an isolated workspace or remove them."
        >
          {!poll.data?.length ? (
            <EmptyState
              title="Quarantine is empty"
              description="Flagged downloads from the browser appear here when the extension blocks a risky file."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">File</th>
                    <th className="px-4 py-3 font-medium">Level</th>
                    <th className="px-4 py-3 font-medium">Received</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {poll.data.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium">{item.filename}</p>
                        {item.findings[0] && (
                          <p className="mt-1 text-xs text-muted-foreground">{item.findings[0]}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <RiskBadge level={item.level} />
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {formatTime(item.receivedAt)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            disabled={busyId === item.id}
                            onClick={() => void runAction(item.id, 'open')}
                          >
                            Open safely
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === item.id}
                            onClick={() => void runAction(item.id, 'defer')}
                          >
                            Not now
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={busyId === item.id}
                            onClick={() => void runAction(item.id, 'delete')}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}
    </>
  );
}
