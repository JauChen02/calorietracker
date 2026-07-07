import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { lookupBarcode, FoodProviderApiError } from '@/lib/foodSearchApi';
import type { FoodSearchResult } from '@calorielog/contracts';

export const barcodeFoodQueryKey = (barcode: string) =>
  ['barcode-food', barcode] as const;

export function useBarcodeFood(barcode: string | null) {
  const { getToken } = useAuth();

  const { data, isLoading, error } = useQuery<FoodSearchResult>({
    queryKey: ['barcode-food', barcode],
    queryFn: async () => {
      const token = await getToken();
      return lookupBarcode(barcode!, token ?? '');
    },
    enabled: barcode !== null,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const notFound =
    error instanceof FoodProviderApiError &&
    (error.code === 'NOT_FOUND' || error.code === 'VALIDATION_ERROR');
  const providerUnavailable =
    error instanceof FoodProviderApiError && error.code === 'PROVIDER_UNAVAILABLE';
  const hardError = error !== null && !notFound && !providerUnavailable;

  return {
    food: data ?? null,
    isLoading,
    notFound,
    providerUnavailable,
    hardError,
    errorMessage: error instanceof Error ? error.message : 'Unknown error',
  };
}
