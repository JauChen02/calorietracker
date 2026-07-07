import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { createSavedMeal } from '@/lib/savedMealsApi';
import type { CreateSavedMeal } from '@calorielog/contracts';
import { savedMealsQueryKey } from './useSavedMeals';

export function useCreateSavedMeal() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateSavedMeal) => {
      const token = await getToken();
      return createSavedMeal(body, token ?? '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedMealsQueryKey });
    },
  });
}
