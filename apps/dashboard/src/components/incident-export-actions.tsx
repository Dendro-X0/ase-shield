import type { IncidentExportFiles } from '@ase/core';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { exportIncidents } from '@/api';
import { Button } from '@/components/ui/button';
import { downloadIncidentExport } from '@/lib/download';

export function IncidentExportActions({
  incidentId,
  label,
  size = 'sm',
  disabled = false,
}: {
  incidentId?: string;
  label?: string;
  size?: 'sm' | 'default';
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const files = await exportIncidents(incidentId);
      if (files.count === 0) {
        setError('No incidents to export.');
        return;
      }
      downloadIncidentExport(files);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant={incidentId ? 'outline' : 'default'}
        size={size}
        disabled={disabled || busy}
        onClick={() => void handleExport()}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        {label ?? (incidentId ? 'Export' : 'Export all incidents')}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export type { IncidentExportFiles };
