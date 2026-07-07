import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { useFavorites } from '@/features/food/useFavorites';
import { useDeleteFavorite } from '@/features/food/useDeleteFavorite';
import type { Favorite } from '@calorielog/contracts';

export default function FavoritesScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { data: favorites, isLoading, isError } = useFavorites();
  const { mutate: deleteFavorite } = useDeleteFavorite();

  const handleDelete = useCallback(
    (fav: Favorite) => {
      Alert.alert(
        'Remove favorite?',
        `Remove "${fav.name}" from your favorites?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => deleteFavorite(fav.id),
          },
        ],
      );
    },
    [deleteFavorite],
  );

  const handleSelect = useCallback(
    (fav: Favorite) => {
      router.replace(`/today/quick-add?source=favorite&id=${encodeURIComponent(fav.id)}`);
    },
    [router],
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Favorites' }} />
        <LoadingState message="Loading favorites…" />
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Stack.Screen options={{ title: 'Favorites' }} />
        <ErrorState title="Could not load favorites" message="Please try again." />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Favorites' }} />
      <FlatList
        data={favorites ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          { padding: spacing.md, gap: spacing.sm },
          (favorites ?? []).length === 0 && styles.emptyContainer,
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={48} color={colors.textTertiary} />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.base,
                marginTop: spacing.sm,
                textAlign: 'center',
              }}
            >
              No favorites yet.{'\n'}Tap the heart on any food to save it here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleSelect(item)}
            accessibilityRole="button"
            activeOpacity={0.7}
            style={[
              styles.row,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                padding: spacing.md,
              },
            ]}
          >
            <View style={styles.rowContent}>
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
                  style={{ color: colors.textSecondary, fontSize: typography.sm }}
                  numberOfLines={1}
                >
                  {item.brand}
                </Text>
              )}
              <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }}>
                {item.calories} kcal · P {item.proteinG}g · C {item.carbsG}g · F {item.fatG}g
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={`Remove ${item.name} from favorites`}
            >
              <Ionicons name="trash-outline" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        style={{ flex: 1, backgroundColor: colors.background }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowContent: { flex: 1 },
});
