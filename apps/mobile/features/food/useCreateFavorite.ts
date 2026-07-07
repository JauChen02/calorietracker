import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { createFavorite } from '@/lib/favoritesApi';
import type { CreateFavorite } from '@calorielog/contracts';
import { favoritesQueryKey } from './useFavorites';

export function useCreateFavorite() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateFavorite) => {
      const token = await getToken();
      return createFavorite(body, token ?? '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoritesQueryKey });
    },
  });
}
