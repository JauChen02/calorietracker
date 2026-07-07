import { useState, useCallback, useEffect } from 'react';
import type { HealthResponse } from '@calorielog/contracts';

type UseApiHealthResult = {
  data: HealthResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useApiHealth(): UseApiHealthResult {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (!baseUrl) {
      setError('EXPO_PUBLIC_API_BASE_URL is not set in .env.local');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json: HealthResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return { data, loading, error, refetch: fetchHealth };
}
