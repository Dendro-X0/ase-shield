import type { ConnectionState } from '@ase/core';
import { cn } from '@/lib/utils';

const STATE_LABEL: Record<ConnectionState, string> = {
  connected: 'Extension connected',
  disconnected: 'Extension disconnected',
  unknown: 'Extension status unknown',
};

const STATE_TONE: Record<ConnectionState, string> = {
  connected: 'bg-emerald-500',
  disconnected: 'bg-red-500',
  unknown: 'bg-amber-500',
};

export function ConnectionIndicator({
  state,
  companionOnline,
  version,
}: {
  state: ConnectionState | null;
  companionOnline: boolean;
  version?: string;
}) {
  if (!companionOnline) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-red-500" aria-hidden="true" />
          <span className="text-xs font-medium">Companion offline</span>
        </div>
        <p className="text-xs text-muted-foreground">Start Anti-SE Companion in the system tray.</p>
      </div>
    );
  }

  const extensionState = state ?? 'unknown';

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span
          className={cn('size-2 shrink-0 rounded-full', STATE_TONE[extensionState])}
          aria-hidden="true"
        />
        <span className="text-xs font-medium">{STATE_LABEL[extensionState]}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {version ? `Companion v${version}` : '127.0.0.1 only · No cloud sync'}
      </p>
    </div>
  );
}
