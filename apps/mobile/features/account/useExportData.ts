import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { Share } from 'react-native';
import { fetchExport } from '@/lib/accountApi';
import { track } from '@/lib/analytics';

export function useExportData() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const jsonStr = await fetchExport(token);
      await Share.share({
        title: 'CalorieLog data export',
        message: jsonStr,
      });
      track('data_exported');
    },
  });
}
