import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import * as Network from 'expo-network';
import { deleteFoodEntry } from '@/lib/foodEntriesApi';
import { addDeleteToOutbox } from '@/db/localDb';
import { sumEntries } from '@calorielog/contracts';
import type { DayResponse } from '@calorielog/contracts';
import { dayQueryKey } from './useDayEntries';

export function useDeleteEntry(date: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = dayQueryKey(date);

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const networkState = await Network.getNetworkStateAsync();
      const isOnline =
        networkState.isConnected === true && networkState.isInternetReachable !== false;

      if (!isOnline) {
        // Look up the food name from the TanStack cache for display in SyncIndicator.
        const cached = queryClient.getQueryData<DayResponse>(queryKey);
        const entry = cached?.entries.find((e) => e.id === id);
        const foodName = entry?.foodName ?? 'Deleted food';
        addDeleteToOutbox(id, date, foodName);
        return;
      }

      const token = await getToken();
      return deleteFoodEntry(id, token ?? '');
    },

    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<DayResponse>(queryKey);

      if (previous) {
        const newEntries = previous.entries.filter((e) => e.id !== id);
        queryClient.setQueryData<DayResponse>(queryKey, {
          ...previous,
          entries: newEntries,
          totals: sumEntries(newEntries),
        });
      }

      return { previous };
    },

    onError: (_err, _id, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(queryKey, ctx.previous);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
