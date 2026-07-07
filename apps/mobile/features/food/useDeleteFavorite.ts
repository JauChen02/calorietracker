import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { deleteFavorite } from '@/lib/favoritesApi';
import { favoritesQueryKey } from './useFavorites';

export function useDeleteFavorite() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return deleteFavorite(id, token ?? '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoritesQueryKey });
    },
  });
}
