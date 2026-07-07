/**
 * Open Food Facts provider adapter.
 *
 * Data is community-contributed under the Open Database Licence (ODbL).
 * It is NOT clinically verified. All results carry verificationStatus: "community".
 *
 * API reference: https://openfoodfacts.github.io/openfoodfacts-server/api/
 * Terms of use:  https://world.openfoodfacts.org/terms-of-use
 *
 * Rules enforced here:
 *   - User queries and barcodes are never logged.
 *   - All HTTP calls are server-side (never called from the mobile bundle).
 *   - Provider-specific field names are confined to this file.
 *   - Data is not cached in v1 (permitted by ODbL; can be added later).
 */

import type { FoodProvider, FoodSearchOptions } from "./types";
import { FoodProviderError } from "./types";
import type { FoodSearchResult, FoodServingOption } from "@calorielog/contracts";

const OFF_BASE = "https://world.openfoodfacts.org";
// Fields requested from the OFF API — only what the adapter needs.
const OFF_FIELDS =
  "code,product_name,brands,serving_size,serving_quantity,nutriments";
const SOURCE_LABEL = "Open Food Facts";
const PROVIDER_NAME = "open_food_facts" as const;
const TIMEOUT_MS = 10_000;
// OFF requires an identifying User-Agent per their API terms.
const USER_AGENT = "CalorieLog/1.0 (https://github.com/calorielog)";

// ── OFF wire types (provider-specific, isolated here) ─────────────────────────

interface OffNutriments {
  "energy-kcal_100g"?: number;
  energy_100g?: number; // kilojoules — used as fallback for calories
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
}

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;    // text label e.g. "15 g"
  serving_quantity?: number; // grams per serving (numeric)
  nutriments?: OffNutriments;
}

interface OffSearchResponse {
  count?: number;
  page?: number;
  page_size?: number;
  products?: OffProduct[];
}

interface OffProductResponse {
  status: number; // 1 = found, 0 = not found
  product?: OffProduct;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Maps one OFF product to the normalized FoodSearchResult shape.
 * Returns null when the product lacks a code or name (incomplete data).
 */
function mapProduct(p: OffProduct): FoodSearchResult | null {
  const code = p.code?.trim();
  const name = p.product_name?.trim();
  if (!code || !name) return null;

  const n = p.nutriments ?? {};

  // Prefer kcal; fall back to kJ → kcal conversion (1 kcal = 4.184 kJ).
  const cal100 =
    n["energy-kcal_100g"] ??
    (n.energy_100g != null ? round1(n.energy_100g / 4.184) : 0);
  const prot100 = n.proteins_100g ?? 0;
  const carb100 = n.carbohydrates_100g ?? 0;
  const fat100 = n.fat_100g ?? 0;
  const fiber100 = n.fiber_100g ?? null;

  // OFF brands field can be comma-separated; take only the primary brand.
  const brand = p.brands?.split(",")[0]?.trim() || null;

  // Base option: per 100 g (always present — OFF normalises nutrition per 100 g).
  const per100g: FoodServingOption = {
    label: "100 g",
    quantity: 100,
    grams: 100,
    calories: round1(cal100),
    proteinG: round1(prot100),
    carbsG: round1(carb100),
    fatG: round1(fat100),
    fiberG: fiber100 !== null ? round1(fiber100) : null,
  };

  const servingOptions: FoodServingOption[] = [per100g];

  // Per-serving option when OFF provides serving weight in grams.
  if (p.serving_size && p.serving_quantity && p.serving_quantity > 0) {
    const f = p.serving_quantity / 100;
    servingOptions.push({
      label: p.serving_size,
      quantity: 1,
      grams: p.serving_quantity,
      calories: round1(cal100 * f),
      proteinG: round1(prot100 * f),
      carbsG: round1(carb100 * f),
      fatG: round1(fat100 * f),
      fiberG: fiber100 !== null ? round1(fiber100 * f) : null,
    });
  }

  return {
    provider: PROVIDER_NAME,
    providerFoodId: code,
    name,
    brand,
    barcode: code,
    servingOptions,
    // Top-level nutrition mirrors the first (per 100 g) option.
    calories: per100g.calories,
    proteinG: per100g.proteinG,
    carbsG: per100g.carbsG,
    fatG: per100g.fatG,
    fiberG: per100g.fiberG,
    sourceLabel: SOURCE_LABEL,
    verificationStatus: "community",
  };
}

/** Fetch from OFF with timeout and structured error mapping. */
async function offFetch<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (res.status === 429) {
      throw new FoodProviderError(
        "RATE_LIMITED",
        "Food data search is temporarily rate-limited. Please try again in a moment.",
        429,
      );
    }
    if (!res.ok) {
      throw new FoodProviderError(
        "PROVIDER_ERROR",
        "The food data provider returned an error. Please try again.",
        502,
      );
    }
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof FoodProviderError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new FoodProviderError(
        "PROVIDER_ERROR",
        "The food data provider did not respond in time. Please try again.",
        504,
      );
    }
    throw new FoodProviderError(
      "PROVIDER_ERROR",
      "Unable to reach the food data provider.",
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}

// ── Provider implementation ───────────────────────────────────────────────────

export class OpenFoodFactsProvider implements FoodProvider {
  readonly name = PROVIDER_NAME;

  async searchFoods(
    query: string,
    options?: FoodSearchOptions,
  ): Promise<FoodSearchResult[]> {
    const page = options?.page ?? 1;
    const pageSize = Math.min(options?.pageSize ?? 20, 50);

    const params = new URLSearchParams({
      search_terms: query,
      fields: OFF_FIELDS,
      page: String(page),
      page_size: String(pageSize),
    });

    const data = await offFetch<OffSearchResponse>(
      `${OFF_BASE}/api/v2/search?${params.toString()}`,
    );

    return (data.products ?? []).flatMap((p) => {
      const result = mapProduct(p);
      return result ? [result] : [];
    });
  }

  async lookupBarcode(barcode: string): Promise<FoodSearchResult | null> {
    const data = await offFetch<OffProductResponse>(
      `${OFF_BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${OFF_FIELDS}`,
    );
    if (data.status !== 1 || !data.product) return null;
    return mapProduct(data.product);
  }

  /** In OFF, the product ID is the barcode. */
  async getFoodById(providerFoodId: string): Promise<FoodSearchResult | null> {
    return this.lookupBarcode(providerFoodId);
  }
}
