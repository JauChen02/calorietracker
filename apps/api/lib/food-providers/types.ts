/**
 * Core interface and error types for the food-data provider layer.
 * Importing this file from mobile is prohibited — all provider calls are server-side.
 */

import type { FoodSearchResult } from "@calorielog/contracts";

// Re-export for convenience so route handlers only need one import.
export type { FoodSearchResult };

export interface FoodSearchOptions {
  /** 1-indexed page number. Defaults to 1. */
  page?: number;
  /** Number of results per page. Defaults to 20, max 50. */
  pageSize?: number;
}

/**
 * Every food-data provider adapter must implement this interface.
 * Switching providers requires changing only the adapter file and registry.
 */
export interface FoodProvider {
  /** Machine-readable provider identifier (e.g. "open_food_facts"). */
  readonly name: string;

  /**
   * Search the provider's food database by text query.
   * Returns an empty array — not an error — when no results are found.
   */
  searchFoods(
    query: string,
    options?: FoodSearchOptions,
  ): Promise<FoodSearchResult[]>;

  /**
   * Fetch a single product by barcode (EAN/UPC).
   * Returns null when the barcode is not in the provider's database.
   */
  lookupBarcode(barcode: string): Promise<FoodSearchResult | null>;

  /**
   * Fetch a single product by the provider's own food identifier.
   * For Open Food Facts, providerFoodId is the barcode.
   * Returns null when the id is not found.
   */
  getFoodById(providerFoodId: string): Promise<FoodSearchResult | null>;
}

// ── Error handling ────────────────────────────────────────────────────────────

export type FoodProviderErrorCode =
  | "PROVIDER_UNAVAILABLE" // no provider configured; FOOD_DATA_PROVIDER=disabled
  | "PROVIDER_ERROR"       // upstream 5xx or network failure
  | "RATE_LIMITED"         // upstream 429
  | "NOT_FOUND"            // item not in provider's database
  | "INVALID_INPUT";       // bad query or id format

/**
 * Thrown by provider adapters for known failure modes.
 * Route handlers catch this class and map it to the standard error envelope.
 */
export class FoodProviderError extends Error {
  constructor(
    public readonly code: FoodProviderErrorCode,
    message: string,
    /** Suggested HTTP status for the API response. */
    public readonly httpStatus: number = 500,
  ) {
    super(message);
    this.name = "FoodProviderError";
  }
}
