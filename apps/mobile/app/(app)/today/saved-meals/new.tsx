import React, { useCallback, useState } from 'react';
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
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { useDayEntries } from '@/features/food/useDayEntries';
import { useCreateSavedMeal } from '@/features/food/useCreateSavedMeal';
import { toLocalDate } from '@/lib/dateUtils';
import type { FoodEntry } from '@calorielog/contracts';

export default function NewSavedMealScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();

  const date = toLocalDate();
  const { data: day, isLoading, isError } = useDayEntries(date);
  const { mutate: createMeal, isPending } = useCreateSavedMeal();

  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleEntry = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a name for this meal.');
      return;
    }
    if (selectedIds.size === 0) {
      Alert.alert('No items selected', 'Please select at least one food to include.');
      return;
    }

    createMeal(
      {
        name: trimmed,
        entryIds: Array.from(selectedIds),
      },
      {
        onSuccess: () => router.back(),
        onError: (err) => {
          Alert.alert('Could not save meal', err instanceof Error ? err.message : 'Something went wrong.');
        },
      },
    );
  }, [name, selectedIds, createMeal, router]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'New Saved Meal' }} />
        <LoadingState message="Loading today's entries…" />
      </>
    );
  }

  if (isError || !day) {
    return (
      <>
        <Stack.Screen options={{ title: 'New Saved Meal' }} />
        <ErrorState title="Could not load entries" message="Please try again." />
      </>
    );
  }

  const entries = day.entries;

  return (
    <>
      <Stack.Screen options={{ title: 'New Saved Meal' }} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
          <TextInput
            label="Meal name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Usual breakfast"
            containerStyle={{ marginBottom: spacing.sm }}
          />
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>
            Select foods from today to include ({selectedIds.size} selected)
          </Text>
        </View>

        <FlatList
          data={entries}
          keyExtractor={(item: FoodEntry) => item.id}
          contentContainerStyle={[
            { padding: spacing.md, gap: spacing.sm },
            entries.length === 0 && styles.emptyContainer,
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.base, textAlign: 'center' }}>
                No food entries today.{'\n'}Log some food first, then create a saved meal.
              </Text>
            </View>
          }
          renderItem={({ item }: { item: FoodEntry }) => {
            const selected = selectedIds.has(item.id);
            return (
              <TouchableOpacity
                onPress={() => toggleEntry(item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                activeOpacity={0.7}
                style={[
                  styles.row,
                  {
                    backgroundColor: selected ? colors.primary + '12' : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                    padding: spacing.md,
                  },
                ]}
              >
                <Ionicons
                  name={selected ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={selected ? colors.primary : colors.textTertiary}
                  style={{ marginRight: spacing.sm }}
                />
                <View style={styles.rowContent}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: typography.base,
                      fontWeight: selected ? typography.medium : typography.normal,
                    }}
                    numberOfLines={1}
                  >
                    {item.foodName}
                  </Text>
                  <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }}>
                    {item.mealType} · {item.calories} kcal
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          style={{ flex: 1 }}
        />

        <View style={{ padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
          <Button
            label={`Save meal (${selectedIds.size} items)`}
            onPress={handleSave}
            loading={isPending}
            disabled={selectedIds.size === 0 || !name.trim()}
          />
        </View>
      </View>
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
    borderWidth: 1,
  },
  rowContent: { flex: 1 },
});
