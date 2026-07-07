import { apiFetch } from './api';
import type { FoodSearchResult } from '@calorielog/contracts';

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Thrown when the food-search API returns an error.
 * The `code` field mirrors the API error envelope code (e.g. PROVIDER_UNAVAILABLE)
 * so hooks can distinguish soft failures (no provider configured) from hard ones.
 */
export class FoodProviderApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'FoodProviderApiError';
  }
}

export interface FoodSearchApiResponse {
  results: FoodSearchResult[];
  provider: string;
}

export async function searchFoods(
  query: string,
  token: string,
): Promise<FoodSearchApiResponse> {
  const params = new URLSearchParams({ q: query });
  const res = await apiFetch<FoodSearchApiResponse>(
    `/api/v1/food-search?${params.toString()}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) {
    throw new FoodProviderApiError(res.code, res.message);
  }
  return res.data;
}

export async function lookupCatalogFood(
  provider: string,
  providerFoodId: string,
  token: string,
): Promise<FoodSearchResult> {
  const res = await apiFetch<{ result: FoodSearchResult }>(
    `/api/v1/food-lookup/${encodeURIComponent(provider)}/${encodeURIComponent(providerFoodId)}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) {
    throw new FoodProviderApiError(res.code, res.message);
  }
  return res.data.result;
}

export async function lookupBarcode(
  barcode: string,
  token: string,
): Promise<FoodSearchResult> {
  const res = await apiFetch<{ result: FoodSearchResult }>(
    `/api/v1/barcode/${encodeURIComponent(barcode)}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) {
    throw new FoodProviderApiError(res.code, res.message);
  }
  return res.data.result;
}
