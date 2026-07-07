import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { fetchFavorites } from '@/lib/favoritesApi';

export const favoritesQueryKey = ['favorites'] as const;

export function useFavorites() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: favoritesQueryKey,
    queryFn: async () => {
      const token = await getToken();
      return fetchFavorites(token ?? '');
    },
    staleTime: 60_000,
  });
}
