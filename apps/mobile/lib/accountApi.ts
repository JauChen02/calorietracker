import { apiFetch } from './api';

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

function getBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
}

/**
 * Permanently deletes the caller's account data from the server and removes
 * the Clerk account. Returns void on success; throws on error.
 */
export async function deleteAccount(token: string): Promise<void> {
  const result = await apiFetch<null>('/api/v1/me', {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!result.ok) throw new Error(result.message);
}

/**
 * Fetches the full data export as a raw JSON string suitable for sharing.
 * Uses raw fetch (not apiFetch) because the response needs to be returned as
 * text, not parsed JSON.
 */
export async function fetchExport(token: string): Promise<string> {
  const url = `${getBaseUrl()}/api/v1/me/export`;
  let response: Response;
  try {
    response = await fetch(url, { headers: authHeaders(token) });
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Network request failed');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Export failed (HTTP ${response.status})`);
  }
  return response.text();
}
