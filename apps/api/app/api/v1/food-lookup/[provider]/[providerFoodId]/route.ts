import { NextResponse } from "next/server";
import { getClerkUserId } from "@/lib/auth";
import { apiError } from "@/lib/api";
import {
  getProviderByName,
  KNOWN_PROVIDER_NAMES,
} from "@/lib/food-providers/registry";
import { FoodProviderError } from "@/lib/food-providers/types";

// providerFoodId values are never logged to avoid tracking user food history.

type RouteParams = {
  params: Promise<{ provider: string; providerFoodId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { provider: providerName, providerFoodId } = await params;

  const clerkUserId = await getClerkUserId();
  if (!clerkUserId) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  if (!providerFoodId.trim()) {
    return apiError("VALIDATION_ERROR", "providerFoodId must not be empty", 400);
  }

  // Validate provider name against the known list.
  // getProviderByName alone isn't sufficient because "disabled" is in the
  // registry but is not a valid lookup target.
  if (!(KNOWN_PROVIDER_NAMES as readonly string[]).includes(providerName)) {
    return apiError(
      "NOT_FOUND",
      `Unknown food provider: "${providerName}". Valid providers: ${KNOWN_PROVIDER_NAMES.join(", ")}`,
      404,
    );
  }

  // Non-null asserted: providerName is confirmed in KNOWN_PROVIDER_NAMES above.
  const provider = getProviderByName(providerName)!;

  try {
    const result = await provider.getFoodById(providerFoodId);
    if (!result) {
      return apiError("NOT_FOUND", "Food item not found", 404);
    }
    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof FoodProviderError) {
      return apiError(err.code, err.message, err.httpStatus);
    }
    return apiError(
      "PROVIDER_ERROR",
      "An unexpected error occurred while looking up the food item.",
      502,
    );
  }
}
