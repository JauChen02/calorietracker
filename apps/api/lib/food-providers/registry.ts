/**
 * Provider registry — maps provider names to adapter instances.
 *
 * Switching providers requires:
 *   1. Adding a new adapter implementing FoodProvider.
 *   2. Registering it here.
 *   3. Adding its name to FOOD_DATA_PROVIDER env var docs.
 *   No route handler code changes are needed.
 */

import type { FoodProvider } from "./types";
import { DisabledFoodProvider } from "./disabled";
import { OpenFoodFactsProvider } from "./open-food-facts";

// Strongly-typed registry — all adapters are concrete subtypes of FoodProvider.
const REGISTRY = {
  disabled: new DisabledFoodProvider(),
  open_food_facts: new OpenFoodFactsProvider(),
} satisfies Record<string, FoodProvider>;

type RegistryKey = keyof typeof REGISTRY;

function isRegistryKey(name: string): name is RegistryKey {
  return Object.prototype.hasOwnProperty.call(REGISTRY, name);
}

/** Provider names that are valid targets for food-lookup/:provider endpoints. */
export const KNOWN_PROVIDER_NAMES = ["open_food_facts"] as const;
export type KnownProviderName = (typeof KNOWN_PROVIDER_NAMES)[number];

/**
 * Returns the provider configured via the FOOD_DATA_PROVIDER environment variable.
 * Falls back to DisabledFoodProvider when the variable is absent or unrecognised.
 */
export function getConfiguredProvider(): FoodProvider {
  const name = process.env.FOOD_DATA_PROVIDER ?? "disabled";
  return isRegistryKey(name) ? REGISTRY[name] : REGISTRY.disabled;
}

/**
 * Returns a specific provider by name, or null if the name is not registered.
 * Used by food-lookup endpoints so callers can request a specific provider
 * regardless of which provider is currently configured as the default.
 */
export function getProviderByName(name: string): FoodProvider | null {
  return isRegistryKey(name) ? REGISTRY[name] : null;
}
