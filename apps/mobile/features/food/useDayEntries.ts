import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import * as Network from 'expo-network';
import { fetchDay } from '@/lib/foodEntriesApi';
import { writeCachedDay, readCachedDay } from '@/db/localDb';

export const dayQueryKey = (date: string) => ['day', date] as const;

export function useDayEntries(date: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: dayQueryKey(date),
    queryFn: async () => {
      const networkState = await Network.getNetworkStateAsync();
      const isOnline =
        networkState.isConnected === true && networkState.isInternetReachable !== false;

      if (!isOnline) {
        const cached = readCachedDay(date);
        if (cached) return cached;
        // No cache — throw so TanStack shows error state
        throw new Error('No network connection and no cached data for this date.');
      }

      const token = await getToken();
      const response = await fetchDay(date, token ?? '');
      // Cache on success so we have data for offline use
      writeCachedDay(date, response);
      return response;
    },
    staleTime: 30_000,
  });
}
