import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { apiFetch } from '@/lib/api';
import type { MeResponse } from '@calorielog/contracts';

type UseMeResult = {
  data: MeResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useMe(): UseMeResult {
  const { getToken } = useAuth();
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const result = await apiFetch<MeResponse>('/api/v1/me', {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (result.ok) {
        setData(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return { data, loading, error, refetch: fetchMe };
}
