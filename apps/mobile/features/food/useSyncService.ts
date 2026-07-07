import { useCallback, useEffect, useRef, useState } from 'react';
import * as Network from 'expo-network';
import { useAuth } from '@clerk/clerk-expo';
import { useQueryClient } from '@tanstack/react-query';
import { initLocalDb, getOutboxItems, type OutboxItem } from '@/db/localDb';
import { syncPending, retryItem, forceApplyConflict, discardConflict } from './syncService';
import { dayQueryKey } from './useDayEntries';
import { toLocalDate } from '@/lib/dateUtils';

export interface SyncState {
  pending: number;
  failed: number;
  conflict: number;
  isSyncing: boolean;
  outboxItems: OutboxItem[];
  retry: (id: string) => Promise<void>;
  discard: (id: string) => void;
  forceApply: (id: string) => Promise<void>;
}

let dbReady = false;

function ensureDb(): void {
  if (!dbReady) {
    initLocalDb();
    dbReady = true;
  }
}

export function useSyncService(): SyncState {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const isSyncingRef = useRef(false);

  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [conflict, setConflict] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);

  const refreshCounts = useCallback(() => {
    const items = getOutboxItems();
    setOutboxItems(items);
    setPending(items.filter((i) => i.status === 'pending').length);
    setFailed(items.filter((i) => i.status === 'failed').length);
    setConflict(items.filter((i) => i.status === 'conflict').length);
  }, []);

  const runSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      const result = await syncPending(getToken);
      refreshCounts();
      // Invalidate the affected dates so the UI reflects the synced state.
      for (const date of result.syncedDates) {
        queryClient.invalidateQueries({ queryKey: dayQueryKey(date) });
      }
      // Always invalidate today's cache in case a same-day sync was missed.
      if (result.synced > 0) {
        queryClient.invalidateQueries({ queryKey: dayQueryKey(toLocalDate()) });
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [getToken, queryClient, refreshCounts]);

  useEffect(() => {
    ensureDb();
    refreshCounts();

    const sub = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        runSync();
      }
    });

    // Also attempt sync immediately in case we're already online
    Network.getNetworkStateAsync().then((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        runSync();
      }
    });

    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const retry = useCallback(
    async (id: string) => {
      const ok = await retryItem(id, getToken);
      refreshCounts();
      if (ok) {
        queryClient.invalidateQueries({ queryKey: dayQueryKey(toLocalDate()) });
      }
    },
    [getToken, queryClient, refreshCounts],
  );

  const discard = useCallback(
    (id: string) => {
      discardConflict(id);
      refreshCounts();
      queryClient.invalidateQueries({ queryKey: dayQueryKey(toLocalDate()) });
    },
    [queryClient, refreshCounts],
  );

  const forceApply = useCallback(
    async (id: string) => {
      const ok = await forceApplyConflict(id, getToken);
      refreshCounts();
      if (ok) {
        queryClient.invalidateQueries({ queryKey: dayQueryKey(toLocalDate()) });
      }
    },
    [getToken, queryClient, refreshCounts],
  );

  return { pending, failed, conflict, isSyncing, outboxItems, retry, discard, forceApply };
}
