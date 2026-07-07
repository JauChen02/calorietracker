import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { fetchTargets } from '@/lib/targetsApi';

export const targetsQueryKey = ['targets'] as const;

export function useTargets() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: targetsQueryKey,
    queryFn: async () => {
      const token = await getToken();
      return fetchTargets(token ?? '');
    },
    // Targets change infrequently; keep cached for 5 minutes.
    staleTime: 5 * 60_000,
  });
}
