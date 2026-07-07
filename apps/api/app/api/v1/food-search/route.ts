import { NextResponse } from "next/server";
import { z } from "zod";
import { getClerkUserId } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { getConfiguredProvider } from "@/lib/food-providers/registry";
import { FoodProviderError } from "@/lib/food-providers/types";

// Food queries and result counts are never logged to avoid tracking user intent.

const QuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "Search query is required")
    .max(200, "Search query is too long"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export async function GET(request: Request) {
  const clerkUserId = await getClerkUserId();
  if (!clerkUserId) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    q: searchParams.get("q") ?? "",
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.errors.map((e) => e.message).join(", "),
      400,
    );
  }

  const provider = getConfiguredProvider();
  const { q, page, pageSize } = parsed.data;

  try {
    const results = await provider.searchFoods(q, { page, pageSize });
    return NextResponse.json({ results, provider: provider.name });
  } catch (err) {
    if (err instanceof FoodProviderError) {
      return apiError(err.code, err.message, err.httpStatus);
    }
    return apiError(
      "PROVIDER_ERROR",
      "An unexpected error occurred while searching for foods.",
      502,
    );
  }
}
