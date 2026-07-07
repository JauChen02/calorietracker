import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { deleteAccount } from '@/lib/accountApi';
import { track } from '@/lib/analytics';
import { clearLocalDb } from '@/db/localDb';

export function useDeleteAccount() {
  const { getToken, signOut } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      await deleteAccount(token);
    },
    onSuccess: async () => {
      track('account_deleted');
      queryClient.clear();
      // Clear SQLite outbox and cache so stale operations cannot replay
      // against a new account created in the same app session.
      clearLocalDb();
      await signOut();
    },
  });
}
