import type { ConnectionState } from '@ase/core';

import { ConnectionTroubleshootingPanel } from '@/components/connection-troubleshooting';
import { CompanionAlert } from '@/components/companion-alert';

export function ConnectionIssueBanner({
  companionError,
  extensionState,
  onRetry,
}: {
  companionError?: string | null;
  extensionState?: ConnectionState | null;
  onRetry?: () => void;
}) {
  if (companionError) {
    return (
      <ConnectionTroubleshootingPanel
        kind="companion-offline"
        message={companionError}
        onRetry={onRetry}
        showInstallLinks={false}
      />
    );
  }

  if (extensionState && extensionState !== 'connected') {
    return <ConnectionTroubleshootingPanel kind="extension-disconnected" onRetry={onRetry} />;
  }

  return null;
}

export function ActionErrorAlert({
  error,
  title = 'Action failed',
  onDismiss,
}: {
  error: string;
  title?: string;
  onDismiss?: () => void;
}) {
  return <CompanionAlert error={error} title={title} onRetry={onDismiss} />;
}
