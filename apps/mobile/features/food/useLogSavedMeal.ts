import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { logSavedMeal } from '@/lib/savedMealsApi';
import type { LogSavedMeal } from '@calorielog/contracts';
import { dayQueryKey } from './useDayEntries';

export function useLogSavedMeal(date: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: LogSavedMeal }) => {
      const token = await getToken();
      return logSavedMeal(id, body, token ?? '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dayQueryKey(date) });
    },
  });
}
