import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { fetchEntries } from '@/lib/foodEntriesApi';
import { buildWindowDates, computeWeeklyInsights } from '@/lib/insightsUtils';
import { toLocalDate } from '@/lib/dateUtils';

export const weeklyInsightsQueryKey = ['weekly-insights'] as const;

const WINDOW_DAYS = 7;

export function useWeeklyInsights() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: weeklyInsightsQueryKey,
    queryFn: async () => {
      const today = toLocalDate();
      const windowDates = buildWindowDates(today, WINDOW_DAYS);
      const from = windowDates[0];
      const to = windowDates[WINDOW_DAYS - 1];

      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetchEntries(from, to, token);
      return computeWeeklyInsights(response.entries, windowDates);
    },
    staleTime: 60_000,
  });
}
