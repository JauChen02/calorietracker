import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import type { SyncState } from '@/features/food/useSyncService';

type Props = Pick<
  SyncState,
  'pending' | 'failed' | 'conflict' | 'isSyncing' | 'outboxItems' | 'retry' | 'discard' | 'forceApply'
>;

export function SyncIndicator({
  pending,
  failed,
  conflict,
  isSyncing,
  outboxItems,
  retry,
  discard,
  forceApply,
}: Props) {
  const { colors, typography, spacing } = useTheme();

  if (!isSyncing && pending === 0 && failed === 0 && conflict === 0) return null;

  const hasWarning = failed > 0 || conflict > 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: hasWarning ? colors.warning : colors.border,
          marginBottom: spacing.sm,
        },
      ]}
    >
      {/* Syncing / pending row */}
      {(isSyncing || pending > 0) && (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
            {isSyncing ? 'Syncing…' : `${pending} item${pending === 1 ? '' : 's'} waiting to sync`}
          </Text>
        </View>
      )}

      {/* Failed items */}
      {failed > 0 && (
        <View style={[styles.column, { marginTop: isSyncing || pending > 0 ? 8 : 0 }]}>
          <View style={styles.row}>
            <Ionicons
              name="warning-outline"
              size={14}
              color={colors.warning}
              style={{ marginRight: 4 }}
            />
            <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
              {failed} item{failed === 1 ? '' : 's'} failed to sync
            </Text>
          </View>

          {outboxItems
            .filter((i) => i.status === 'failed')
            .map((item) => (
              <View key={item.id} style={[styles.actionRow, { marginTop: 4 }]}>
                <Text
                  style={{ color: colors.text, fontSize: typography.xs, flex: 1 }}
                  numberOfLines={1}
                >
                  {item.foodName}
                </Text>
                <TouchableOpacity
                  onPress={() => retry(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Retry syncing ${item.foodName}`}
                  style={{ marginLeft: spacing.sm }}
                >
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: typography.xs,
                      fontWeight: typography.semibold,
                    }}
                  >
                    Retry
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
        </View>
      )}

      {/* Conflict items */}
      {conflict > 0 && (
        <View
          style={[
            styles.column,
            { marginTop: isSyncing || pending > 0 || failed > 0 ? 8 : 0 },
          ]}
        >
          <View style={styles.row}>
            <Ionicons
              name="git-merge-outline"
              size={14}
              color={colors.warning}
              style={{ marginRight: 4 }}
            />
            <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
              {conflict} edit{conflict === 1 ? '' : 's'} conflict with the server
            </Text>
          </View>

          {outboxItems
            .filter((i) => i.status === 'conflict')
            .map((item) => (
              <View key={item.id} style={[styles.conflictItem, { marginTop: 6 }]}>
                <Text
                  style={{ color: colors.text, fontSize: typography.xs, flex: 1 }}
                  numberOfLines={1}
                >
                  {item.foodName}
                </Text>
                <View style={styles.conflictButtons}>
                  <TouchableOpacity
                    onPress={() => discard(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Discard your edit to ${item.foodName}`}
                    style={{ marginLeft: spacing.sm }}
                  >
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: typography.xs,
                        fontWeight: typography.semibold,
                      }}
                    >
                      Discard
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => forceApply(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Apply your edit to ${item.foodName} anyway`}
                    style={{ marginLeft: spacing.sm }}
                  >
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: typography.xs,
                        fontWeight: typography.semibold,
                      }}
                    >
                      Apply anyway
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  column: {
    flexDirection: 'column',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conflictItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conflictButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
