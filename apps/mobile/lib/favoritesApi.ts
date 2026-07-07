import { apiFetch } from './api';
import type { Favorite, CreateFavorite, FavoritesResponse } from '@calorielog/contracts';

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchFavorites(token: string): Promise<Favorite[]> {
  const result = await apiFetch<FavoritesResponse>('/api/v1/favorites', {
    headers: authHeaders(token),
  });
  if (!result.ok) throw new Error(result.message);
  return result.data.favorites;
}

export async function createFavorite(
  body: CreateFavorite,
  token: string,
): Promise<Favorite> {
  const result = await apiFetch<Favorite>('/api/v1/favorites', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: authHeaders(token),
  });
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function deleteFavorite(id: string, token: string): Promise<void> {
  const result = await apiFetch<null>(`/api/v1/favorites/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!result.ok) throw new Error(result.message);
}
