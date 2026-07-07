import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { fetchCustomFoods } from '@/lib/customFoodsApi';

export const customFoodsQueryKey = ['custom-foods'] as const;

export function useCustomFoods() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: customFoodsQueryKey,
    queryFn: async () => {
      const token = await getToken();
      return fetchCustomFoods(token ?? '');
    },
    staleTime: 60_000,
  });
}
