import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '@/theme';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { LoadingState } from '@/components/states/LoadingState';
import { useWeeklyInsights } from '@/features/food/useWeeklyInsights';
import type { DailyStats, WeeklyInsights } from '@/lib/insightsUtils';

const WINDOW_DAYS = 7;
const EMPTY_THRESHOLD = 3;
const MAX_BAR_HEIGHT = 96;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayAbbrev(dateStr: string): string {
  return DAY_NAMES[new Date(dateStr + 'T12:00:00').getDay()];
}

function formatNum(n: number): string {
  return n.toLocaleString();
}

// ---------------------------------------------------------------------------
// MacroCard
// ---------------------------------------------------------------------------

function MacroCard({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <Card style={styles.macroCard} padding="md">
      <Text
        style={{ color: colors.textSecondary, fontSize: typography.xs, fontWeight: typography.medium }}
        accessibilityRole="text"
      >
        {label.toUpperCase()}
      </Text>
      <Text
        style={{
          color: colors.text,
          fontSize: typography.xxl,
          fontWeight: typography.bold,
          marginTop: spacing.xs,
        }}
        accessibilityLabel={value !== null ? `${label}: ${formatNum(value)} ${unit}` : `${label}: no data`}
      >
        {value !== null ? formatNum(value) : '—'}
      </Text>
      <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }}>
        {unit}
      </Text>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// CalorieTrendChart
// ---------------------------------------------------------------------------

function CalorieTrendChart({
  dailyStats,
  calorieMax,
}: {
  dailyStats: DailyStats[];
  calorieMax: number | null;
}) {
  const { colors, typography } = useTheme();
  // Card has md (16) padding each side; InsightsContent has 16 padding each side → total 64 subtracted
  const screenWidth = Dimensions.get('window').width;
  const barAreaWidth = Math.max(200, screenWidth - 64);
  const barGap = 4;
  const barWidth = Math.floor((barAreaWidth - barGap * (dailyStats.length - 1)) / dailyStats.length);
  const maxCal = calorieMax != null && calorieMax > 0 ? calorieMax : 1;

  return (
    <View style={styles.chart}>
      {dailyStats.map((day) => {
        const barHeight = day.logged
          ? Math.max(4, Math.round((day.calories / maxCal) * MAX_BAR_HEIGHT))
          : 0;

        return (
          <View
            key={day.date}
            style={[styles.barCol, { width: barWidth }]}
            accessibilityLabel={
              day.logged
                ? `${dayAbbrev(day.date)}: ${Math.round(day.calories)} kcal`
                : `${dayAbbrev(day.date)}: no food logged`
            }
            accessibilityRole="text"
          >
            <View style={[styles.barSlot, { height: MAX_BAR_HEIGHT }]}>
              {barHeight > 0 && (
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      width: barWidth - 2,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              )}
            </View>
            <View
              style={[styles.barBaseline, { backgroundColor: colors.border }]}
            />
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: typography.xs,
                textAlign: 'center',
                marginTop: 4,
              }}
            >
              {dayAbbrev(day.date)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// InsightsContent
// ---------------------------------------------------------------------------

function InsightsContent({ insights }: { insights: WeeklyInsights }) {
  const { colors, typography, spacing } = useTheme();

  if (insights.loggedDays < EMPTY_THRESHOLD) {
    return (
      <EmptyState
        icon="stats-chart-outline"
        title="Keep logging to see insights"
        message={`You've logged food on ${insights.loggedDays} of the last ${WINDOW_DAYS} days. Log on at least ${EMPTY_THRESHOLD} days to see your weekly summary.`}
      />
    );
  }

  return (
    <View style={[styles.content, { padding: spacing.md }]}>
      <Text
        style={{
          color: colors.text,
          fontSize: typography.xl,
          fontWeight: typography.bold,
          marginBottom: spacing.lg,
        }}
        accessibilityRole="header"
      >
        Last 7 Days
      </Text>

      {/* Logging frequency */}
      <Card style={{ marginBottom: spacing.md }} padding="md">
        <Text
          style={{
            color: colors.text,
            fontSize: typography.base,
            lineHeight: typography.lineHeightBase,
          }}
        >
          {'You logged food on '}
          <Text style={{ fontWeight: typography.semibold }}>{insights.loggedDays}</Text>
          {` of the last ${WINDOW_DAYS} days.`}
        </Text>
      </Card>

      {/* Macro averages — 2×2 grid */}
      <View style={[styles.macroGrid, { marginBottom: spacing.md }]}>
        <MacroCard label="Avg Calories" value={insights.avgCalories} unit="kcal / day" />
        <MacroCard label="Avg Protein" value={insights.avgProteinG} unit="g / day" />
        <MacroCard label="Avg Carbs" value={insights.avgCarbsG} unit="g / day" />
        <MacroCard label="Avg Fat" value={insights.avgFatG} unit="g / day" />
      </View>

      {/* Calorie range — only meaningful when more than one day is logged */}
      {insights.calorieMin !== null && insights.calorieMax !== null && insights.loggedDays > 1 && (
        <Card style={{ marginBottom: spacing.md }} padding="md">
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.xs,
              fontWeight: typography.medium,
            }}
          >
            CALORIE RANGE
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.base,
              marginTop: spacing.xs,
            }}
          >
            {formatNum(Math.round(insights.calorieMin))}
            {' – '}
            {formatNum(Math.round(insights.calorieMax))}
            {' kcal'}
          </Text>
        </Card>
      )}

      {/* Daily calorie trend */}
      <Card style={{ marginBottom: spacing.md }} padding="md">
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.xs,
            fontWeight: typography.medium,
            marginBottom: spacing.md,
          }}
        >
          DAILY CALORIES
        </Text>
        <CalorieTrendChart dailyStats={insights.dailyStats} calorieMax={insights.calorieMax} />
      </Card>

      <Text
        style={{
          color: colors.textTertiary,
          fontSize: typography.xs,
          textAlign: 'center',
          lineHeight: typography.lineHeightBase,
          marginBottom: spacing.md,
        }}
      >
        Averages are based on days with logged food.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function InsightsScreen() {
  const { isLoading, isError, data, refetch } = useWeeklyInsights();

  if (isLoading) {
    return (
      <Screen scrollable={false}>
        <LoadingState message="Loading insights…" />
      </Screen>
    );
  }

  if (isError || data === undefined) {
    return (
      <Screen scrollable={false}>
        <ErrorState
          title="Could not load insights"
          message="Check your connection and try again."
          onRetry={refetch}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <InsightsContent insights={data} />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  macroCard: {
    flex: 1,
    minWidth: '45%',
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  barCol: {
    alignItems: 'center',
  },
  barSlot: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barBaseline: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
  },
  bar: {
    borderRadius: 3,
  },
});
