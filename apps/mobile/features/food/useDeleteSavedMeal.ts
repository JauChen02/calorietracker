import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { deleteSavedMeal } from '@/lib/savedMealsApi';
import { savedMealsQueryKey } from './useSavedMeals';

export function useDeleteSavedMeal() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return deleteSavedMeal(id, token ?? '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedMealsQueryKey });
    },
  });
}
