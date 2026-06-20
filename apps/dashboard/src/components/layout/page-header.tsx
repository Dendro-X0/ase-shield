import { Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function formatLastUpdated(value: Date | null): string | null {
  if (!value) return null;
  return value.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

export function PageHeader({
  title,
  description,
  onRefresh,
  refreshing = false,
  lastUpdated = null,
  loading = false,
}: {
  title: string;
  description: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  lastUpdated?: Date | null;
  loading?: boolean;
}) {
  const updatedLabel = formatLastUpdated(lastUpdated);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        {(loading || updatedLabel) && (
          <p className="text-xs text-muted-foreground">
            {loading ? 'Loading…' : updatedLabel ? `Updated ${updatedLabel}` : null}
          </p>
        )}
      </div>
      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          className="shrink-0"
        >
          {refreshing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Refresh
        </Button>
      )}
    </div>
  );
}

export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className={cn('h-24 animate-pulse rounded-xl border bg-muted/40', index === 0 && 'h-32')}
        />
      ))}
    </div>
  );
}
