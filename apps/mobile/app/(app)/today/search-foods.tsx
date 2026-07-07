import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/theme';
import { useRecentFoods } from '@/features/food/useRecentFoods';
import { useCustomFoods } from '@/features/food/useCustomFoods';
import { useFoodSearch } from '@/features/food/useFoodSearch';
import { catalogFoodQueryKey } from '@/features/food/useCatalogFood';
import type { FoodSearchResult, RecentFood, CustomFood } from '@calorielog/contracts';

const SECTION_ITEM_LIMIT = 5;

export default function SearchFoodsScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(inputValue.trim());
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue]);

  const { data: recentFoods } = useRecentFoods();
  const { data: customFoods } = useCustomFoods();
  const { results: catalogResults, isLoading: catalogLoading, providerUnavailable, error: catalogError } =
    useFoodSearch(debouncedQuery);

  const localQuery = inputValue.toLowerCase();

  const filteredRecent = useMemo<RecentFood[]>(() => {
    const all = recentFoods ?? [];
    if (!localQuery) return all.slice(0, SECTION_ITEM_LIMIT);
    return all
      .filter(
        (f) =>
          f.foodName.toLowerCase().includes(localQuery) ||
          (f.brand?.toLowerCase() ?? '').includes(localQuery),
      )
      .slice(0, SECTION_ITEM_LIMIT);
  }, [recentFoods, localQuery]);

  const filteredMyFoods = useMemo<CustomFood[]>(() => {
    const all = customFoods ?? [];
    if (!localQuery) return all.slice(0, SECTION_ITEM_LIMIT);
    return all
      .filter(
        (f) =>
          f.name.toLowerCase().includes(localQuery) ||
          (f.brand?.toLowerCase() ?? '').includes(localQuery),
      )
      .slice(0, SECTION_ITEM_LIMIT);
  }, [customFoods, localQuery]);

  const showCatalog = debouncedQuery.length >= 2;
  const hasAnyResult =
    filteredRecent.length > 0 ||
    filteredMyFoods.length > 0 ||
    catalogResults.length > 0;

  const handleRecentPress = useCallback(
    (food: RecentFood) => {
      router.push(`/today/quick-add?source=recent&id=${food.foodEntryId}`);
    },
    [router],
  );

  const handleMyFoodPress = useCallback(
    (food: CustomFood) => {
      router.push(`/today/quick-add?source=custom&id=${food.id}`);
    },
    [router],
  );

  const handleCatalogPress = useCallback(
    (result: FoodSearchResult) => {
      queryClient.setQueryData(
        catalogFoodQueryKey(result.provider, result.providerFoodId),
        result,
      );
      router.push(
        `/today/food-review?provider=${encodeURIComponent(result.provider)}&providerFoodId=${encodeURIComponent(result.providerFoodId)}`,
      );
    },
    [router, queryClient],
  );

  const s = styles;

  return (
    <>
      <Stack.Screen options={{ title: 'Search Foods' }} />

      {/* Search bar */}
      <View
        style={[
          s.searchBar,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          },
        ]}
      >
        <View
          style={[
            s.searchInput,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingHorizontal: spacing.sm,
            },
          ]}
        >
          <Ionicons name="search" size={16} color={colors.textTertiary} style={{ marginRight: 6 }} />
          <TextInput
            style={{
              flex: 1,
              color: colors.text,
              fontSize: typography.base,
              paddingVertical: spacing.sm,
            }}
            placeholder="Search foods…"
            placeholderTextColor={colors.textTertiary}
            value={inputValue}
            onChangeText={setInputValue}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Provider unavailable banner */}
        {providerUnavailable && showCatalog && (
          <View
            style={[
              s.banner,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                margin: spacing.md,
                padding: spacing.sm,
              },
            ]}
          >
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.sm,
                flex: 1,
                marginLeft: spacing.xs,
              }}
            >
              Food catalog is unavailable. Showing your saved foods only.
            </Text>
          </View>
        )}

        {/* Recent Foods section */}
        {filteredRecent.length > 0 && (
          <Section title="Recent Foods">
            {filteredRecent.map((food) => (
              <FoodRow
                key={food.foodEntryId}
                name={food.foodName}
                brand={food.brand ?? null}
                detail={`${Math.round(food.calories)} kcal · ${food.quantity}${food.servingLabel ? ` ${food.servingLabel}` : ' serving'}`}
                onPress={() => handleRecentPress(food)}
              />
            ))}
          </Section>
        )}

        {/* My Foods section */}
        {filteredMyFoods.length > 0 && (
          <Section title="My Foods">
            {filteredMyFoods.map((food) => (
              <FoodRow
                key={food.id}
                name={food.name}
                brand={food.brand ?? null}
                detail={`${Math.round(food.calories)} kcal · ${food.defaultQuantity}${food.servingLabel ? ` ${food.servingLabel}` : ' serving'}`}
                onPress={() => handleMyFoodPress(food)}
              />
            ))}
          </Section>
        )}

        {/* Catalog Results section — hidden when provider unavailable (banner explains why) */}
        {showCatalog && !providerUnavailable && (
          <Section title="Catalog">
            {catalogLoading ? (
              <View style={[s.centred, { paddingVertical: spacing.lg }]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : catalogError ? (
              <View style={[s.centred, { paddingVertical: spacing.md }]}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>
                  Could not load catalog results.
                </Text>
              </View>
            ) : catalogResults.length === 0 && !providerUnavailable ? (
              <View style={[s.centred, { paddingVertical: spacing.md }]}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>
                  No catalog results for "{debouncedQuery}"
                </Text>
              </View>
            ) : (
              catalogResults.map((result) => (
                <FoodRow
                  key={`${result.provider}:${result.providerFoodId}`}
                  name={result.name}
                  brand={result.brand ?? null}
                  detail={`${Math.round(result.calories)} kcal per 100g · ${result.sourceLabel}`}
                  onPress={() => handleCatalogPress(result)}
                  accessory="chevron-forward"
                />
              ))
            )}
          </Section>
        )}

        {/* Zero-result state with manual entry CTA */}
        {!hasAnyResult && !catalogLoading && (
          <View style={[s.emptyState, { padding: spacing.xl }]}>
            <Ionicons name="search-outline" size={40} color={colors.textTertiary} />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.base,
                fontWeight: '500',
                marginTop: spacing.md,
                marginBottom: spacing.xs,
                textAlign: 'center',
              }}
            >
              {inputValue.trim() ? `No results for "${inputValue.trim()}"` : 'Search for a food'}
            </Text>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: typography.sm,
                textAlign: 'center',
                marginBottom: spacing.lg,
              }}
            >
              Or enter nutrition details yourself
            </Text>
            <TouchableOpacity
              onPress={() => router.replace('/today/manual-entry')}
              accessibilityRole="button"
              accessibilityLabel="Enter manually"
              style={[
                s.manualEntryBtn,
                {
                  borderColor: colors.primary,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                },
              ]}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
              <Text
                style={{
                  color: colors.primary,
                  fontSize: typography.base,
                  fontWeight: '500',
                  marginLeft: 6,
                }}
              >
                Enter manually
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Manual entry footer (always visible when there are some results) */}
        {hasAnyResult && (
          <TouchableOpacity
            onPress={() => router.replace('/today/manual-entry')}
            accessibilityRole="button"
            accessibilityLabel="Enter manually"
            style={[
              s.footer,
              {
                borderTopColor: colors.border,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.md,
              },
            ]}
          >
            <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.sm,
                marginLeft: 6,
              }}
            >
              Can't find it? Enter manually
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: typography.xs,
          fontWeight: '600',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: spacing.xs,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function FoodRow({
  name,
  brand,
  detail,
  onPress,
  accessory,
}: {
  name: string;
  brand: string | null;
  detail: string;
  onPress: () => void;
  accessory?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  const { colors, typography, spacing } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Select ${name}`}
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
      <View style={styles.rowInfo}>
        <Text
          style={{
            color: colors.text,
            fontSize: typography.base,
            fontWeight: '500',
          }}
          numberOfLines={1}
        >
          {name}
        </Text>
        {brand && (
          <Text
            style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 1 }}
            numberOfLines={1}
          >
            {brand}
          </Text>
        )}
        <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }}>
          {detail}
        </Text>
      </View>
      <Ionicons
        name={accessory ?? 'add-circle-outline'}
        size={accessory ? 18 : 24}
        color={colors.primary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowInfo: { flex: 1, marginRight: 8 },
  centred: { alignItems: 'center' },
  emptyState: { alignItems: 'center', flex: 1, marginTop: 40 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 16,
  },
  manualEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
  },
});
