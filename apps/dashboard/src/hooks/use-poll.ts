import { useCallback, useEffect, useRef, useState } from 'react';

export interface PollState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

export function usePoll<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  fallbackError = 'Companion not reachable.',
): PollState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasLoaded = useRef(false);

  const refresh = useCallback(async () => {
    const isInitial = !hasLoaded.current;
    if (isInitial) setLoading(true);
    else setRefreshing(true);

    try {
      const next = await fetcher();
      setData(next);
      setError(null);
      setLastUpdated(new Date());
      hasLoaded.current = true;
    } catch {
      setError(fallbackError);
      if (isInitial) setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetcher, fallbackError]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [refresh, intervalMs]);

  return { data, error, loading, refreshing, lastUpdated, refresh };
}
