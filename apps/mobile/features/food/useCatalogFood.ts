import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { lookupCatalogFood } from '@/lib/foodSearchApi';
import type { FoodSearchResult } from '@calorielog/contracts';

export const catalogFoodQueryKey = (provider: string, providerFoodId: string) =>
  ['catalog-food', provider, providerFoodId] as const;

/**
 * Fetches a single catalog food by provider + ID.
 * The search screen pre-populates the cache via queryClient.setQueryData before
 * navigating here, so in the common path this resolves instantly.
 */
export function useCatalogFood(provider: string, providerFoodId: string) {
  const { getToken } = useAuth();

  return useQuery<FoodSearchResult>({
    queryKey: catalogFoodQueryKey(provider, providerFoodId),
    queryFn: async () => {
      const token = await getToken();
      return lookupCatalogFood(provider, providerFoodId, token ?? '');
    },
    staleTime: Infinity,
    retry: false,
  });
}
