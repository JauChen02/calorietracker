import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { createCustomFood } from '@/lib/customFoodsApi';
import type { CreateCustomFood } from '@calorielog/contracts';
import { customFoodsQueryKey } from './useCustomFoods';

export function useCreateCustomFood() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateCustomFood) => {
      const token = await getToken();
      return createCustomFood(body, token ?? '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFoodsQueryKey });
    },
  });
}
