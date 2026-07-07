import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { fetchRecentFoods } from '@/lib/recentFoodsApi';

export const recentFoodsQueryKey = ['recent-foods'] as const;

export function useRecentFoods() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: recentFoodsQueryKey,
    queryFn: async () => {
      const token = await getToken();
      return fetchRecentFoods(token ?? '');
    },
    staleTime: 60_000,
  });
}
