import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRecentFoods } from '@/features/food/useRecentFoods';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { EmptyState } from '@/components/states/EmptyState';
import { useTheme } from '@/theme';
import type { RecentFood } from '@calorielog/contracts';

export default function RecentFoodsScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useRecentFoods();

  const handleSelect = (food: RecentFood) => {
    router.push(`/today/quick-add?source=recent&id=${food.foodEntryId}`);
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Recent Foods' }} />
        <LoadingState message="Loading recent foods…" />
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Stack.Screen options={{ title: 'Recent Foods' }} />
        <ErrorState
          title="Could not load recent foods"
          message="Something went wrong. Pull down to retry."
          onRetry={refetch}
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Recent Foods' }} />
      <FlatList
        style={{ flex: 1, backgroundColor: colors.background }}
        data={data ?? []}
        keyExtractor={(item) => item.foodEntryId}
        contentContainerStyle={
          (data ?? []).length === 0
            ? { flex: 1 }
            : { paddingVertical: spacing.xs }
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="time-outline"
            title="No recent foods"
            message="Foods you log will appear here for quick re-logging."
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleSelect(item)}
            accessibilityRole="button"
            accessibilityLabel={`Add ${item.foodName}`}
            activeOpacity={0.7}
            style={[
              styles.row,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.border,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm + 2,
              },
            ]}
          >
            <View style={styles.info}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: typography.base,
                  fontWeight: typography.medium,
                }}
                numberOfLines={1}
              >
                {item.foodName}
              </Text>
              {item.brand && (
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.xs,
                    marginTop: 1,
                  }}
                  numberOfLines={1}
                >
                  {item.brand}
                </Text>
              )}
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: typography.xs,
                  marginTop: 2,
                }}
              >
                {Math.round(item.calories)} kcal · {item.quantity}
                {item.servingLabel ? ` ${item.servingLabel}` : ' serving'}
              </Text>
            </View>
            <View style={styles.addBtn}>
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
            </View>
          </TouchableOpacity>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  info: { flex: 1, marginRight: 8 },
  addBtn: { paddingLeft: 4 },
});
