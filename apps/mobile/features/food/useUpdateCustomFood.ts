import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { updateCustomFood } from '@/lib/customFoodsApi';
import type { UpdateCustomFood } from '@calorielog/contracts';
import { customFoodsQueryKey } from './useCustomFoods';

export function useUpdateCustomFood() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateCustomFood }) => {
      const token = await getToken();
      return updateCustomFood(id, body, token ?? '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFoodsQueryKey });
    },
  });
}
