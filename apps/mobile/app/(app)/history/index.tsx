import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { FoodEntry, MealType } from '@calorielog/contracts';
import { useDayEntries } from '@/features/food/useDayEntries';
import { useDeleteEntry } from '@/features/food/useDeleteEntry';
import { useCopyEntry } from '@/features/food/useCopyEntry';
import { MealSection } from '@/components/food/MealSection';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { EmptyState } from '@/components/states/EmptyState';
import { useTheme } from '@/theme';
import { toLocalDate } from '@/lib/dateUtils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// Single-letter labels for the week strip header row
const DOW_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sun=0 … Sat=6

// ---------------------------------------------------------------------------
// Date helpers — self-contained to avoid modifying dateUtils.ts
// ---------------------------------------------------------------------------

/** Returns a new Date set to midnight local time on the ISO Monday of the given date's week. */
function isoWeekMonday(dateStr: string): Date {
  const d = new Date(dateStr + 'T12:00:00'); // noon avoids DST day-boundary edge cases
  const dow = d.getDay(); // 0=Sun … 6=Sat
  const offset = dow === 0 ? -6 : 1 - dow; // days to Monday
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns the 7 YYYY-MM-DD strings for Mon→Sun of the week containing dateStr. */
function weekDates(dateStr: string): string[] {
  const monday = isoWeekMonday(dateStr);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getTime());
    d.setDate(monday.getDate() + i);
    return toLocalDate(d);
  });
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return toLocalDate(d);
}

function formatMonthYear(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function dayNumber(dateStr: string): string {
  return String(new Date(dateStr + 'T12:00:00').getDate());
}

function dowLetter(dateStr: string): string {
  return DOW_LETTERS[new Date(dateStr + 'T12:00:00').getDay()];
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function HistoryScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const today = toLocalDate();

  // The currently viewed date; defaults to yesterday so history is immediately useful.
  const [selectedDate, setSelectedDate] = useState(() => addDaysToDateStr(today, -1));

  // ── Week strip ────────────────────────────────────────────────────────────
  const week = useMemo(() => weekDates(selectedDate), [selectedDate]);

  const canGoNextWeek = useMemo(() => {
    return addDaysToDateStr(selectedDate, 7) < today;
  }, [selectedDate, today]);

  const handlePrevWeek = useCallback(() => {
    setSelectedDate((d) => addDaysToDateStr(d, -7));
  }, []);

  const handleNextWeek = useCallback(() => {
    if (!canGoNextWeek) return;
    setSelectedDate((d) => addDaysToDateStr(d, 7));
  }, [canGoNextWeek]);

  const handleSelectDay = useCallback(
    (date: string) => {
      if (date <= today) setSelectedDate(date);
    },
    [today],
  );

  // ── Data queries ──────────────────────────────────────────────────────────
  const { data, isLoading, isError, error, refetch, isRefetching } = useDayEntries(selectedDate);
  const { mutate: deleteEntry } = useDeleteEntry(selectedDate);
  const { mutate: copyEntry } = useCopyEntry();

  // ── Local UI state ────────────────────────────────────────────────────────
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [copyingId, setCopyingId] = useState<string | null>(null);

  // ── Event handlers ────────────────────────────────────────────────────────
  const handleEdit = useCallback(
    (entry: FoodEntry) => {
      router.push(`/history/${entry.id}/edit?date=${selectedDate}`);
    },
    [router, selectedDate],
  );

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

  const handleCopy = useCallback(
    (entry: FoodEntry) => {
      Alert.alert(
        'Copy to today',
        `Add "${entry.foodName}" to today's log?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Copy',
            onPress: () => {
              setCopyingId(entry.id);
              copyEntry(entry, {
                onSuccess: () => {
                  Alert.alert('Added', `"${entry.foodName}" has been added to today.`);
                },
                onSettled: () => setCopyingId(null),
              });
            },
          },
        ],
      );
    },
    [copyEntry],
  );

  const entriesByMeal = useCallback(
    (meal: MealType) => data?.entries.filter((e) => e.mealType === meal) ?? [],
    [data],
  );

  const totals = data?.totals;
  const showCopy = selectedDate < today; // only show copy for past days, not today

  return (
    <>
      <Stack.Screen options={{ title: 'History', headerShown: true }} />

      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* ── Week strip ──────────────────────────────────────────────────── */}
        <View
          style={[
            styles.weekStrip,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
              paddingHorizontal: spacing.sm,
              paddingTop: spacing.sm,
              paddingBottom: spacing.xs,
            },
          ]}
        >
          {/* Month / year header with week navigation */}
          <View style={styles.weekNav}>
            <TouchableOpacity
              onPress={handlePrevWeek}
              accessibilityRole="button"
              accessibilityLabel="Previous week"
              style={styles.weekNavBtn}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>

            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.sm,
                fontWeight: typography.semibold,
              }}
            >
              {formatMonthYear(selectedDate)}
            </Text>

            <TouchableOpacity
              onPress={handleNextWeek}
              disabled={!canGoNextWeek}
              accessibilityRole="button"
              accessibilityLabel="Next week"
              style={styles.weekNavBtn}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={canGoNextWeek ? colors.text : colors.border}
              />
            </TouchableOpacity>
          </View>

          {/* Day cells */}
          <View style={styles.weekDays}>
            {week.map((date) => {
              const isSelected = date === selectedDate;
              const isToday = date === today;
              const isFuture = date > today;
              return (
                <TouchableOpacity
                  key={date}
                  onPress={() => handleSelectDay(date)}
                  disabled={isFuture}
                  accessibilityRole="button"
                  accessibilityLabel={formatDayLabel(date)}
                  accessibilityState={{ selected: isSelected, disabled: isFuture }}
                  style={[
                    styles.dayCell,
                    isSelected && {
                      backgroundColor: colors.primary,
                      borderRadius: 10,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isFuture
                        ? colors.border
                        : isSelected
                          ? colors.primaryText
                          : colors.textSecondary,
                      fontSize: typography.xs,
                      fontWeight: typography.medium,
                    }}
                  >
                    {dowLetter(date)}
                  </Text>
                  <Text
                    style={{
                      color: isFuture
                        ? colors.border
                        : isSelected
                          ? colors.primaryText
                          : colors.text,
                      fontSize: typography.sm,
                      fontWeight: isSelected ? typography.bold : typography.normal,
                    }}
                  >
                    {dayNumber(date)}
                  </Text>
                  {/* Today indicator dot */}
                  {isToday && !isSelected && (
                    <View
                      style={[styles.todayDot, { backgroundColor: colors.primary }]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        {isLoading && <LoadingState message="Loading entries…" />}

        {!isLoading && isError && (
          <ErrorState
            title="Could not load entries"
            message={error instanceof Error ? error.message : 'Something went wrong'}
            onRetry={refetch}
          />
        )}

        {!isLoading && !isError && (
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
            {/* Day heading + calorie summary */}
            <View style={[styles.dayHeader, { marginBottom: spacing.md }]}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: typography.base,
                  fontWeight: typography.semibold,
                }}
              >
                {formatDayLabel(selectedDate)}
              </Text>
              {totals !== undefined && data.entries.length > 0 && (
                <View style={[styles.summaryRow, { marginTop: spacing.xs }]}>
                  <SummaryChip value={Math.round(totals.calories)} unit="kcal" prominent />
                  <SummaryChip value={totals.proteinG} unit="P" />
                  <SummaryChip value={totals.carbsG} unit="C" />
                  <SummaryChip value={totals.fatG} unit="F" />
                </View>
              )}
            </View>

            {/* Empty state */}
            {data?.entries.length === 0 && (
              <EmptyState
                icon="restaurant-outline"
                title="Nothing logged"
                message="No meals were logged for this day."
              />
            )}

            {/* Meal sections */}
            {data && data.entries.length > 0 && (
              <View>
                {MEAL_ORDER.map((meal) => (
                  <MealSection
                    key={meal}
                    mealType={meal}
                    entries={entriesByMeal(meal)}
                    deletingIds={deletingIds}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onCopy={showCopy ? handleCopy : undefined}
                    copyingId={copyingId}
                  />
                ))}
              </View>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        )}
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// SummaryChip — compact macro display in the day header
// ---------------------------------------------------------------------------

function SummaryChip({
  value,
  unit,
  prominent = false,
}: {
  value: number;
  unit: string;
  prominent?: boolean;
}) {
  const { colors, typography } = useTheme();
  const displayed = value % 1 === 0 ? String(Math.round(value)) : value.toFixed(1);
  return (
    <View style={styles.summaryChip}>
      <Text
        style={{
          color: prominent ? colors.text : colors.textSecondary,
          fontSize: prominent ? typography.lg : typography.sm,
          fontWeight: prominent ? typography.bold : typography.normal,
        }}
      >
        {displayed}
      </Text>
      <Text
        style={{
          color: colors.textTertiary,
          fontSize: typography.xs,
          marginLeft: 2,
        }}
      >
        {unit}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  weekStrip: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekNavBtn: { padding: 4 },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayCell: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    minWidth: 36,
    position: 'relative',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  scroll: { flex: 1 },
  dayHeader: {},
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
});
