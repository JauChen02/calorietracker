import { apiFetch } from './api';
import type { CustomFood, CreateCustomFood, UpdateCustomFood } from '@calorielog/contracts';

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchCustomFoods(token: string): Promise<CustomFood[]> {
  const result = await apiFetch<{ customFoods: CustomFood[] }>('/api/v1/custom-foods', {
    headers: authHeaders(token),
  });
  if (!result.ok) throw new Error(result.message);
  return result.data.customFoods;
}

export async function createCustomFood(
  body: CreateCustomFood,
  token: string,
): Promise<CustomFood> {
  const result = await apiFetch<CustomFood>('/api/v1/custom-foods', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: authHeaders(token),
  });
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function updateCustomFood(
  id: string,
  body: UpdateCustomFood,
  token: string,
): Promise<CustomFood> {
  const result = await apiFetch<CustomFood>(`/api/v1/custom-foods/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: authHeaders(token),
  });
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function deleteCustomFood(id: string, token: string): Promise<void> {
  const result = await apiFetch<null>(`/api/v1/custom-foods/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!result.ok) throw new Error(result.message);
}
