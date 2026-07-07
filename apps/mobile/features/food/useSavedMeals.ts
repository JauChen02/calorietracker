import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { fetchSavedMeals } from '@/lib/savedMealsApi';

export const savedMealsQueryKey = ['saved-meals'] as const;

export function useSavedMeals() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: savedMealsQueryKey,
    queryFn: async () => {
      const token = await getToken();
      return fetchSavedMeals(token ?? '');
    },
    staleTime: 60_000,
  });
}
