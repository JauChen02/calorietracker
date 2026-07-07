/**
 * Thin helpers for producing consistent API responses.
 * Import NextResponse directly for success cases; use apiError() for failures.
 */
import { NextResponse } from "next/server";

/**
 * Returns a structured JSON error response matching the standard error shape:
 * { "error": { "code": "STRING_CODE", "message": "Human-readable message" } }
 */
export function apiError(
  code: string,
  message: string,
  status: number = 500,
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}
