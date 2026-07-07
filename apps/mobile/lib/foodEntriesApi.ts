import { apiFetch } from './api';
import type {
  DayResponse,
  EntriesResponse,
  FoodEntry,
  CreateFoodEntry,
  PatchFoodEntry,
} from '@calorielog/contracts';

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchDay(date: string, token: string): Promise<DayResponse> {
  const result = await apiFetch<DayResponse>(`/api/v1/day?date=${encodeURIComponent(date)}`, {
    headers: authHeaders(token),
  });
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function createFoodEntry(body: CreateFoodEntry, token: string): Promise<FoodEntry> {
  const result = await apiFetch<FoodEntry>('/api/v1/entries', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: authHeaders(token),
  });
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function updateFoodEntry(
  id: string,
  body: PatchFoodEntry,
  token: string,
): Promise<FoodEntry> {
  const result = await apiFetch<FoodEntry>(`/api/v1/entries/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: authHeaders(token),
  });
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function deleteFoodEntry(id: string, token: string): Promise<void> {
  const result = await apiFetch<null>(`/api/v1/entries/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!result.ok) throw new Error(result.message);
}

export async function fetchEntries(
  from: string,
  to: string,
  token: string,
): Promise<EntriesResponse> {
  const result = await apiFetch<EntriesResponse>(
    `/api/v1/entries?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { headers: authHeaders(token) },
  );
  if (!result.ok) throw new Error(result.message);
  return result.data;
}
