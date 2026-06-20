import { AlertCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function CompanionAlert({
  error,
  onRetry,
  title = 'Companion unreachable',
}: {
  error: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>{error}</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0 bg-background">
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
