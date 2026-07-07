import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { dailyProgress } from '@calorielog/contracts';
import type { FoodEntry, MealType } from '@calorielog/contracts';
import { useDayEntries } from '@/features/food/useDayEntries';
import { useDeleteEntry } from '@/features/food/useDeleteEntry';
import { useTargets } from '@/features/food/useTargets';
import { useSyncService } from '@/features/food/useSyncService';
import { MealSection } from '@/components/food/MealSection';
import { DailyProgressCard } from '@/components/food/DailyProgressCard';
import { SyncIndicator } from '@/components/food/SyncIndicator';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { useTheme } from '@/theme';
import { toLocalDate } from '@/lib/dateUtils';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function TodayScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const date = toLocalDate();

  const { data, isLoading, isError, error, refetch, isRefetching } = useDayEntries(date);
  const { mutate: deleteEntry } = useDeleteEntry(date);
  const {
    data: targetsData,
    isLoading: isTargetsLoading,
  } = useTargets();

  const sync = useSyncService();
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const handleDelete = useCallback(
    (id: string) => {
      setDeletingIds((prev) => new Set(prev).add(id));
      deleteEntry(id, {
        onSettled: () => {
          setDeletingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        },
      });
    },
    [deleteEntry],
  );

  const handleEdit = useCallback(
    (entry: FoodEntry) => {
      router.push(`/today/${entry.id}/edit?date=${date}`);
    },
    [router, date],
  );

  const handleAddFood = useCallback(() => {
    router.push('/today/add-food');
  }, [router]);

  const entriesByMeal = (meal: MealType) =>
    data?.entries.filter((e) => e.mealType === meal) ?? [];

  const progress = useMemo(
    () => dailyProgress(data?.entries ?? [], targetsData ?? null),
    [data?.entries, targetsData],
  );

  // Show goals banner when entries have loaded, targets have settled, and no targets are set.
  const showGoalsBanner = !isLoading && !isError && !isTargetsLoading && targetsData === null;

  return (
    <>
      <Stack.Screen options={{ title: todayLabel() }} />

      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {isLoading && <LoadingState message="Loading today's log…" />}

        {!isLoading && isError && (
          <ErrorState
            title="Could not load today's log"
            message={error instanceof Error ? error.message : 'Something went wrong'}
            onRetry={refetch}
          />
        )}

        {!isLoading && !isError && (
          <>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={{ padding: spacing.md }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={refetch}
                  tintColor={colors.primary}
                />
              }
            >
              {/* Sync status — hidden when all clear */}
              <SyncIndicator {...sync} />

              {/* Daily progress summary */}
              <DailyProgressCard progress={progress} />

              {/* Non-blocking goals banner */}
              {showGoalsBanner && (
                <TouchableOpacity
                  onPress={() => router.push('/settings/goals')}
                  accessibilityRole="button"
                  accessibilityLabel="Set up nutrition goals"
                  style={[
                    styles.banner,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      marginTop: spacing.md,
                      padding: spacing.md,
                    },
                  ]}
                  activeOpacity={0.75}
                >
                  <View style={styles.bannerContent}>
                    <Ionicons name="flag-outline" size={20} color={colors.primary} />
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: typography.sm,
                          fontWeight: typography.semibold,
                        }}
                      >
                        Set up nutrition goals
                      </Text>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: typography.xs,
                          marginTop: 2,
                        }}
                      >
                        Add a calorie or macro target to see your progress
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  </View>
                </TouchableOpacity>
              )}

              {/* Meal sections */}
              <View style={{ marginTop: spacing.md }}>
                {MEAL_ORDER.map((meal) => (
                  <MealSection
                    key={meal}
                    mealType={meal}
                    entries={entriesByMeal(meal)}
                    deletingIds={deletingIds}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </View>

              {/* Bottom padding clears the FAB */}
              <View style={{ height: 80 }} />
            </ScrollView>
          </>
        )}

        {/* Floating Add Food button */}
        <TouchableOpacity
          onPress={handleAddFood}
          accessibilityRole="button"
          accessibilityLabel="Add food"
          style={[
            styles.fab,
            {
              backgroundColor: colors.primary,
              bottom: spacing.lg,
              right: spacing.lg,
            },
          ]}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color={colors.primaryText} />
          <Text
            style={{
              color: colors.primaryText,
              fontSize: typography.sm,
              fontWeight: typography.semibold,
              marginLeft: 4,
            }}
          >
            Add Food
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  banner: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
});
