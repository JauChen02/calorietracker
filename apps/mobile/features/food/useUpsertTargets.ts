import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { upsertTargets } from '@/lib/targetsApi';
import type { UpdateNutritionTargets } from '@calorielog/contracts';
import { targetsQueryKey } from './useTargets';

export function useUpsertTargets() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: UpdateNutritionTargets) => {
      const token = await getToken();
      return upsertTargets(body, token ?? '');
    },
    onSuccess: (freshTargets) => {
      // Populate the cache directly with the server response — no refetch needed.
      queryClient.setQueryData(targetsQueryKey, freshTargets);
    },
  });
}
