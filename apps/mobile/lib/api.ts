/**
 * Thin fetch wrapper for the CalorieLog API.
 * Base URL comes exclusively from EXPO_PUBLIC_API_BASE_URL.
 * Never passes database credentials or server secrets.
 */

function getBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!raw) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL is not set.\n' +
        'Add it to apps/mobile/.env.local:\n' +
        '  EXPO_PUBLIC_API_BASE_URL=http://localhost:3000',
    );
  }
  return raw.replace(/\/$/, '');
}

type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const url = `${getBaseUrl()}${path}`;

  // Destructure to prevent options.headers from overwriting the merged headers
  const { headers: extraHeaders, ...restOptions } = options ?? {};

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
      ...restOptions,
    });
  } catch (err) {
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      message: err instanceof Error ? err.message : 'Network request failed',
    };
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return {
      ok: false,
      code: body?.error?.code ?? `HTTP_${response.status}`,
      message: body?.error?.message ?? `HTTP ${response.status}`,
    };
  }

  if (response.status === 204) {
    return { ok: true, data: null as T };
  }

  const data: T = await response.json();
  return { ok: true, data };
}
