import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { deleteCustomFood } from '@/lib/customFoodsApi';
import { customFoodsQueryKey } from './useCustomFoods';

export function useDeleteCustomFood() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return deleteCustomFood(id, token ?? '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFoodsQueryKey });
    },
  });
}
