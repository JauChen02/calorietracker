import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCustomFoods } from '@/features/food/useCustomFoods';
import { useDeleteCustomFood } from '@/features/food/useDeleteCustomFood';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { EmptyState } from '@/components/states/EmptyState';
import { useTheme } from '@/theme';
import type { CustomFood } from '@calorielog/contracts';

export default function MyFoodsScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useCustomFoods();
  const { mutate: deleteFood } = useDeleteCustomFood();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSelect = (food: CustomFood) => {
    router.push(`/today/quick-add?source=custom&id=${food.id}`);
  };

  const handleEdit = (food: CustomFood) => {
    router.push(`/today/my-foods/${food.id}/edit`);
  };

  const handleDelete = (food: CustomFood) => {
    Alert.alert(
      'Delete food',
      `Remove "${food.name}" from My Foods? This does not affect previous logs.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setDeletingId(food.id);
            deleteFood(food.id, {
              onSettled: () => setDeletingId(null),
            });
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'My Foods' }} />
        <LoadingState message="Loading My Foods…" />
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Stack.Screen options={{ title: 'My Foods' }} />
        <ErrorState
          title="Could not load My Foods"
          message="Something went wrong. Pull down to retry."
          onRetry={refetch}
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Foods',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/today/my-foods/new')}
              accessibilityRole="button"
              accessibilityLabel="Create new food"
              style={{ paddingHorizontal: 4 }}
            >
              <Ionicons name="add" size={26} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <FlatList
        style={{ flex: 1, backgroundColor: colors.background }}
        data={data ?? []}
        keyExtractor={(item) => item.id}
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
            icon="bookmark-outline"
            title="No saved foods yet"
            message='Tap the + button or use "Save to My Foods" when logging manually.'
          />
        }
        renderItem={({ item }) => {
          const isDeleting = deletingId === item.id;
          return (
            <View
              style={[
                styles.row,
                {
                  backgroundColor: colors.surface,
                  borderBottomColor: colors.border,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm + 2,
                  opacity: isDeleting ? 0.4 : 1,
                },
              ]}
            >
              {/* Tap area → quick add */}
              <TouchableOpacity
                onPress={() => handleSelect(item)}
                disabled={isDeleting}
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.name}`}
                activeOpacity={0.7}
                style={styles.info}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: typography.base,
                    fontWeight: typography.medium,
                  }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {item.brand && (
                  <Text
                    style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 1 }}
                    numberOfLines={1}
                  >
                    {item.brand}
                  </Text>
                )}
                <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }}>
                  {Math.round(item.calories)} kcal · {item.defaultQuantity}
                  {item.servingLabel ? ` ${item.servingLabel}` : ' serving'}
                </Text>
              </TouchableOpacity>

              {/* Action buttons */}
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() => handleEdit(item)}
                  disabled={isDeleting}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${item.name}`}
                  style={styles.iconBtn}
                >
                  <Ionicons name="pencil-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  disabled={isDeleting}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${item.name}`}
                  style={styles.iconBtn}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
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
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 6 },
});
