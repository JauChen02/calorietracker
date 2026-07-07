import type { FoodProvider, FoodSearchOptions } from "./types";
import { FoodProviderError } from "./types";
import type { FoodSearchResult } from "@calorielog/contracts";

const UNAVAILABLE_MSG =
  "Food data search is not available. " +
  "Set FOOD_DATA_PROVIDER=open_food_facts in server environment variables to enable it.";

/**
 * No-op provider used when FOOD_DATA_PROVIDER is absent or set to "disabled".
 * Every method throws PROVIDER_UNAVAILABLE (503) so callers get a clear,
 * actionable error rather than a cryptic failure.
 *
 * This is the safe default: the app functions fully without food search,
 * and manual entry / custom foods are unaffected.
 */
export class DisabledFoodProvider implements FoodProvider {
  readonly name = "disabled";

  private unavailable(): never {
    throw new FoodProviderError("PROVIDER_UNAVAILABLE", UNAVAILABLE_MSG, 503);
  }

  async searchFoods(
    _query: string,
    _options?: FoodSearchOptions,
  ): Promise<FoodSearchResult[]> {
    this.unavailable();
  }

  async lookupBarcode(_barcode: string): Promise<FoodSearchResult | null> {
    this.unavailable();
  }

  async getFoodById(_providerFoodId: string): Promise<FoodSearchResult | null> {
    this.unavailable();
  }
}
