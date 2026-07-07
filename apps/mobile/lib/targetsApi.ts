import { apiFetch } from './api';
import type { NutritionTargets, UpdateNutritionTargets } from '@calorielog/contracts';

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchTargets(token: string): Promise<NutritionTargets | null> {
  const result = await apiFetch<{ targets: NutritionTargets | null }>(
    '/api/v1/targets/current',
    { headers: authHeaders(token) },
  );
  if (!result.ok) throw new Error(result.message);
  return result.data.targets;
}

export async function upsertTargets(
  body: UpdateNutritionTargets,
  token: string,
): Promise<NutritionTargets> {
  const result = await apiFetch<{ targets: NutritionTargets }>('/api/v1/targets/current', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: authHeaders(token),
  });
  if (!result.ok) throw new Error(result.message);
  return result.data.targets;
}
