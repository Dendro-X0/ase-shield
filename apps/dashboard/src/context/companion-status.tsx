import type { ConnectionState, DashboardSummary } from '@ase/core';
import { createContext, useContext, type ReactNode } from 'react';

import { fetchSummary } from '@/api';
import { usePoll } from '@/hooks/use-poll';

interface CompanionStatusValue {
  summary: DashboardSummary | null;
  extensionState: ConnectionState | null;
  quarantineCount: number;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const CompanionStatusContext = createContext<CompanionStatusValue | null>(null);

export function CompanionStatusProvider({ children }: { children: ReactNode }) {
  const poll = usePoll(fetchSummary, 8000, 'Companion offline');

  const summary = poll.data;

  return (
    <CompanionStatusContext.Provider
      value={{
        summary,
        extensionState: summary?.extensionState ?? null,
        quarantineCount: summary?.quarantineCount ?? 0,
        error: poll.error,
        loading: poll.loading,
        refresh: poll.refresh,
      }}
    >
      {children}
    </CompanionStatusContext.Provider>
  );
}

export function useCompanionStatus(): CompanionStatusValue {
  const value = useContext(CompanionStatusContext);
  if (!value) {
    throw new Error('useCompanionStatus must be used within CompanionStatusProvider');
  }
  return value;
}
