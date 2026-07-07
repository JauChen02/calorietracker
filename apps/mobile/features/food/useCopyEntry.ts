import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { createFoodEntry } from '@/lib/foodEntriesApi';
import { buildCopyPayload } from '@/lib/copyEntry';
import type { FoodEntry } from '@calorielog/contracts';
import { dayQueryKey } from './useDayEntries';
import { toLocalDate, localTimezone } from '@/lib/dateUtils';

/**
 * Copies an existing entry to today's log.
 * Assigns a fresh clientMutationId, current loggedAt, and today's localDate
 * so the server treats this as a distinct new record.
 */
export function useCopyEntry() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: FoodEntry) => {
      const token = await getToken();
      const payload = buildCopyPayload(entry, new Date(), localTimezone());
      return createFoodEntry(payload, token ?? '');
    },
    onSuccess: () => {
      // Invalidate today's cache so the copied entry appears immediately.
      queryClient.invalidateQueries({ queryKey: dayQueryKey(toLocalDate()) });
    },
  });
}
