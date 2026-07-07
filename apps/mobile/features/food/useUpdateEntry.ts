import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import * as Network from 'expo-network';
import { updateFoodEntry } from '@/lib/foodEntriesApi';
import { addUpdateToOutbox } from '@/db/localDb';
import { sumEntries } from '@calorielog/contracts';
import type { DayResponse, FoodEntry, PatchFoodEntry } from '@calorielog/contracts';
import { dayQueryKey } from './useDayEntries';

type UpdateArgs = {
  id: string;
  body: PatchFoodEntry;
  /** Version of the entry when the user opened the edit screen. Used for optimistic
   *  concurrency both online (sent as baseVersion) and offline (stored in outbox). */
  currentVersion?: number;
};

function applyPatchOptimistic(entry: FoodEntry, body: PatchFoodEntry): FoodEntry {
  return {
    ...entry,
    ...(body.mealType !== undefined && { mealType: body.mealType }),
    ...(body.foodName !== undefined && { foodName: body.foodName }),
    ...('brand' in body && { brand: body.brand ?? null }),
    ...('servingLabel' in body && { servingLabel: body.servingLabel ?? null }),
    ...(body.quantity !== undefined && { quantity: body.quantity }),
    ...('grams' in body && { grams: body.grams ?? null }),
    ...(body.calories !== undefined && { calories: body.calories }),
    ...(body.proteinG !== undefined && { proteinG: body.proteinG }),
    ...(body.carbsG !== undefined && { carbsG: body.carbsG }),
    ...(body.fatG !== undefined && { fatG: body.fatG }),
    ...('fiberG' in body && { fiberG: body.fiberG ?? null }),
    ...(body.source !== undefined && { source: body.source }),
    ...(body.loggedAt !== undefined && { loggedAt: body.loggedAt }),
    ...(body.localDate !== undefined && { localDate: body.localDate }),
    ...(body.timezone !== undefined && { timezone: body.timezone }),
    version: entry.version + 1,
    updatedAt: new Date().toISOString(),
  };
}

export function useUpdateEntry(date: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = dayQueryKey(date);

  return useMutation({
    mutationFn: async ({ id, body, currentVersion }: UpdateArgs): Promise<FoodEntry> => {
      const networkState = await Network.getNetworkStateAsync();
      const isOnline =
        networkState.isConnected === true && networkState.isInternetReachable !== false;

      if (!isOnline) {
        // Build the offline-updated entry from the TanStack cache so mutationFn
        // can return a FoodEntry and onSuccess fires correctly.
        const cached = queryClient.getQueryData<DayResponse>(queryKey);
        const currentEntry = cached?.entries.find((e) => e.id === id);
        if (!currentEntry) {
          throw new Error('Cannot update entry offline: entry not found in cache.');
        }
        const foodName = body.foodName ?? currentEntry.foodName;
        const version = currentVersion ?? currentEntry.version;
        addUpdateToOutbox(id, date, foodName, body, version);
        return applyPatchOptimistic(currentEntry, body);
      }

      const token = await getToken();
      return updateFoodEntry(
        id,
        currentVersion !== undefined ? { ...body, baseVersion: currentVersion } : body,
        token ?? '',
      );
    },

    onMutate: async ({ id, body }: UpdateArgs) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<DayResponse>(queryKey);

      if (previous) {
        const newEntries = previous.entries.map((e) => {
          if (e.id !== id) return e;
          return applyPatchOptimistic(e, body);
        });
        queryClient.setQueryData<DayResponse>(queryKey, {
          ...previous,
          entries: newEntries,
          totals: sumEntries(newEntries),
        });
      }

      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(queryKey, ctx.previous);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
