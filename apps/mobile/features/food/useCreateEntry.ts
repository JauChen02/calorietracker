import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import * as Network from 'expo-network';
import { createFoodEntry } from '@/lib/foodEntriesApi';
import { sumEntries } from '@calorielog/contracts';
import type { DayResponse, FoodEntry, CreateFoodEntry } from '@calorielog/contracts';
import { addToOutbox } from '@/db/localDb';
import { dayQueryKey } from './useDayEntries';

function buildOptimisticEntry(body: CreateFoodEntry): FoodEntry {
  const now = new Date().toISOString();
  return {
    id: body.clientMutationId,
    userId: '',
    clientMutationId: body.clientMutationId,
    mealType: body.mealType,
    foodName: body.foodName,
    brand: body.brand ?? null,
    servingLabel: body.servingLabel ?? null,
    quantity: body.quantity,
    grams: body.grams ?? null,
    calories: body.calories,
    proteinG: body.proteinG,
    carbsG: body.carbsG,
    fatG: body.fatG,
    fiberG: body.fiberG ?? null,
    source: body.source,
    loggedAt: body.loggedAt,
    localDate: body.localDate,
    timezone: body.timezone,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function useCreateEntry(date: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = dayQueryKey(date);

  return useMutation({
    mutationFn: async (body: CreateFoodEntry): Promise<FoodEntry> => {
      const networkState = await Network.getNetworkStateAsync();
      const isOnline =
        networkState.isConnected === true && networkState.isInternetReachable !== false;

      if (!isOnline) {
        // Queue for later; mutationFn returns an optimistic entry so onSuccess fires
        // and the TanStack cache stays updated.  The outbox will sync when network
        // returns (via useSyncService).
        addToOutbox(body);
        return buildOptimisticEntry(body);
      }

      const token = await getToken();
      return createFoodEntry(body, token ?? '');
    },

    onMutate: async (body: CreateFoodEntry) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<DayResponse>(queryKey);

      const optimisticEntry = buildOptimisticEntry(body);

      if (previous) {
        const newEntries = [...previous.entries, optimisticEntry];
        queryClient.setQueryData<DayResponse>(queryKey, {
          ...previous,
          entries: newEntries,
          totals: sumEntries(newEntries),
        });
      }

      return { previous };
    },

    onError: (_err, _body, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(queryKey, ctx.previous);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
