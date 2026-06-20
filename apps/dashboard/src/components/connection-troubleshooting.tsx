import {
  CHROME_WEB_STORE_LISTING_URL,
  COMPANION_DOWNLOAD_URL,
  connectionTroubleshootingSteps,
  type ConnectionIssueKind,
} from '@ase/core';
import { AlertCircle, ExternalLink } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const TITLES: Record<ConnectionIssueKind, string> = {
  'companion-offline': 'Companion not reachable',
  'extension-disconnected': 'Extension not connected',
};

const DESCRIPTIONS: Record<ConnectionIssueKind, string> = {
  'companion-offline': 'The dashboard cannot reach Anti-SE Companion on this PC.',
  'extension-disconnected': 'The extension has not linked to the companion recently.',
};

export function ConnectionTroubleshootingPanel({
  kind,
  message,
  onRetry,
  showInstallLinks = kind === 'extension-disconnected',
}: {
  kind: ConnectionIssueKind;
  message?: string;
  onRetry?: () => void;
  showInstallLinks?: boolean;
}) {
  const steps = connectionTroubleshootingSteps(kind);

  return (
    <Alert variant={kind === 'companion-offline' ? 'destructive' : 'default'}>
      <AlertCircle className="size-4" />
      <AlertTitle>{TITLES[kind]}</AlertTitle>
      <AlertDescription className="space-y-4">
        {message && <p>{message}</p>}
        <p className="text-sm text-muted-foreground">{DESCRIPTIONS[kind]}</p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          {steps.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="bg-background">
              Retry
            </Button>
          )}
          {showInstallLinks && (
            <>
              <Button variant="outline" size="sm" asChild>
                <a href={CHROME_WEB_STORE_LISTING_URL} target="_blank" rel="noreferrer">
                  Chrome Web Store
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={COMPANION_DOWNLOAD_URL} target="_blank" rel="noreferrer">
                  Companion installer
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            </>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
