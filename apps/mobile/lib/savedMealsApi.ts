import { apiFetch } from './api';
import type {
  SavedMeal,
  CreateSavedMeal,
  UpdateSavedMeal,
  SavedMealsResponse,
  LogSavedMeal,
  LogSavedMealResponse,
} from '@calorielog/contracts';

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchSavedMeals(token: string): Promise<SavedMeal[]> {
  const result = await apiFetch<SavedMealsResponse>('/api/v1/saved-meals', {
    headers: authHeaders(token),
  });
  if (!result.ok) throw new Error(result.message);
  return result.data.savedMeals;
}

export async function createSavedMeal(
  body: CreateSavedMeal,
  token: string,
): Promise<SavedMeal> {
  const result = await apiFetch<SavedMeal>('/api/v1/saved-meals', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: authHeaders(token),
  });
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function updateSavedMeal(
  id: string,
  body: UpdateSavedMeal,
  token: string,
): Promise<SavedMeal> {
  const result = await apiFetch<SavedMeal>(
    `/api/v1/saved-meals/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: authHeaders(token),
    },
  );
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function deleteSavedMeal(id: string, token: string): Promise<void> {
  const result = await apiFetch<null>(
    `/api/v1/saved-meals/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  );
  if (!result.ok) throw new Error(result.message);
}

export async function logSavedMeal(
  id: string,
  body: LogSavedMeal,
  token: string,
): Promise<LogSavedMealResponse> {
  const result = await apiFetch<LogSavedMealResponse>(
    `/api/v1/saved-meals/${encodeURIComponent(id)}/log`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: authHeaders(token),
    },
  );
  if (!result.ok) throw new Error(result.message);
  return result.data;
}
