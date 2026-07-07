import { NextResponse } from "next/server";
import { z } from "zod";
import { getClerkUserId } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { getConfiguredProvider } from "@/lib/food-providers/registry";
import { FoodProviderError } from "@/lib/food-providers/types";

// Barcode values are never logged to avoid tracking user purchasing behaviour.

// EAN-8 (8 digits), UPC-E (6–8 digits), UPC-A (12 digits), EAN-13 (13 digits).
// Accept 4–14 digits to allow for edge-case short barcodes and future formats.
const BarcodeSchema = z
  .string()
  .regex(/^\d{4,14}$/, "Barcode must be 4–14 digits");

type RouteParams = { params: Promise<{ barcode: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { barcode } = await params;

  const clerkUserId = await getClerkUserId();
  if (!clerkUserId) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const parsed = BarcodeSchema.safeParse(barcode);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.errors[0].message,
      400,
    );
  }

  const provider = getConfiguredProvider();

  try {
    const result = await provider.lookupBarcode(parsed.data);
    if (!result) {
      return apiError("NOT_FOUND", "No food found for that barcode", 404);
    }
    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof FoodProviderError) {
      return apiError(err.code, err.message, err.httpStatus);
    }
    return apiError(
      "PROVIDER_ERROR",
      "An unexpected error occurred while looking up the barcode.",
      502,
    );
  }
}
