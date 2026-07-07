import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { updateSavedMeal } from '@/lib/savedMealsApi';
import type { UpdateSavedMeal } from '@calorielog/contracts';
import { savedMealsQueryKey } from './useSavedMeals';

export function useUpdateSavedMeal() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateSavedMeal }) => {
      const token = await getToken();
      return updateSavedMeal(id, body, token ?? '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedMealsQueryKey });
    },
  });
}
