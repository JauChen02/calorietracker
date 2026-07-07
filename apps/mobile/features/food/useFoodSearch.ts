import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { searchFoods, FoodProviderApiError } from '@/lib/foodSearchApi';
import type { FoodSearchResult } from '@calorielog/contracts';

export const foodSearchQueryKey = (query: string) => ['food-search', query] as const;

export interface UseFoodSearchResult {
  results: FoodSearchResult[];
  isLoading: boolean;
  providerUnavailable: boolean;
  error: Error | null;
}

export function useFoodSearch(query: string): UseFoodSearchResult {
  const { getToken } = useAuth();
  const trimmed = query.trim();

  const { data, isLoading, error } = useQuery({
    queryKey: foodSearchQueryKey(trimmed),
    queryFn: async () => {
      const token = await getToken();
      const response = await searchFoods(trimmed, token ?? '');
      return response.results;
    },
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
    retry: false,
  });

  const providerUnavailable =
    error instanceof FoodProviderApiError && error.code === 'PROVIDER_UNAVAILABLE';

  return {
    results: data ?? [],
    isLoading,
    providerUnavailable,
    // Suppress PROVIDER_UNAVAILABLE so callers only see hard errors.
    error: providerUnavailable ? null : (error ?? null),
  };
}
