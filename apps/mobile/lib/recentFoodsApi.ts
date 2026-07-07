import { apiFetch } from './api';
import type { RecentFood } from '@calorielog/contracts';

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchRecentFoods(token: string): Promise<RecentFood[]> {
  const result = await apiFetch<{ recentFoods: RecentFood[] }>('/api/v1/recent-foods', {
    headers: authHeaders(token),
  });
  if (!result.ok) throw new Error(result.message);
  return result.data.recentFoods;
}
