/**
 * Sync service — feature-level module that flushes the outbox to the server.
 *
 * Rules:
 *  - Uses relative imports (not @/ alias) so pure-Node vitest tests can run it.
 *  - No React, no hooks — called from useSyncService and from tests.
 *  - Handles three operation types: create, update, delete.
 *  - Delete-wins: if a delete and an update are both pending for the same entry,
 *    the update is discarded and only the delete is sent.
 *  - Create+delete short-circuit: if a create and delete exist for the same
 *    clientMutationId (never reached the server), both are cancelled locally.
 *  - VERSION_CONFLICT on PATCH → item is marked 'conflict', not 'failed'.
 *    The user must explicitly discard or force-apply the conflicting edit.
 *  - 404 on DELETE is treated as success (entry already gone on server).
 *  - Idempotent creates: 409 on POST means the server already has it → remove.
 */

import type { FoodEntry } from '@calorielog/contracts';
import { apiFetch } from '../../lib/api';
import {
  getOutboxItems,
  removeFromOutbox,
  markOutboxFailed,
  markOutboxConflict,
  resetOutboxItem,
  removeCachedEntry,
  type OutboxItem,
} from '../../db/localDb';

export interface SyncResult {
  synced: number;
  failed: number;
  conflict: number;
  /** Unique localDate values from successfully synced items — for cache invalidation. */
  syncedDates: string[];
}

/**
 * Attempt to sync all pending outbox items.  Resolves after every item has been
 * tried (success, failure, or conflict) — never throws.
 */
export async function syncPending(
  getToken: () => Promise<string | null>,
): Promise<SyncResult> {
  const items = getOutboxItems('pending');

  // Pre-compute which entry IDs have a pending delete (delete-wins logic).
  const pendingDeleteEntryIds = new Set(
    items.filter((i) => i.opType === 'delete').map((i) => i.entryId),
  );
  // Pre-compute which outbox IDs are pending creates (for create+delete short-circuit).
  const pendingCreateIds = new Set(
    items.filter((i) => i.opType === 'create').map((i) => i.id),
  );

  let synced = 0;
  let failed = 0;
  let conflict = 0;
  const syncedDates: string[] = [];
  // Outbox IDs we've already disposed of during preprocessing (e.g. the delete
  // in a create+delete pair that we cancelled before processing it in the loop).
  const disposedIds = new Set<string>();

  for (const item of items) {
    if (disposedIds.has(item.id)) continue;

    if (item.opType === 'create') {
      if (pendingDeleteEntryIds.has(item.id)) {
        // This create was never synced AND has a pending delete — cancel both.
        removeFromOutbox(item.id);
        const del = items.find((i) => i.opType === 'delete' && i.entryId === item.id);
        if (del) {
          removeFromOutbox(del.id);
          disposedIds.add(del.id);
        }
        continue;
      }
      const ok = await syncCreate(item, getToken);
      if (ok) {
        synced++;
        recordDate(item.localDate, syncedDates);
      } else {
        failed++;
      }
      continue;
    }

    if (item.opType === 'update') {
      if (pendingDeleteEntryIds.has(item.entryId)) {
        // A later delete supersedes this update — discard it silently.
        removeFromOutbox(item.id);
        continue;
      }
      const res = await syncUpdate(item, getToken);
      if (res.conflict) {
        conflict++;
      } else if (res.ok) {
        synced++;
        recordDate(item.localDate, syncedDates);
      } else {
        failed++;
      }
      continue;
    }

    if (item.opType === 'delete') {
      if (pendingCreateIds.has(item.entryId)) {
        // Handled as part of the create+delete short-circuit above.
        continue;
      }
      const ok = await syncDelete(item, getToken);
      if (ok) {
        synced++;
        recordDate(item.localDate, syncedDates);
      } else {
        failed++;
      }
    }
  }

  return { synced, failed, conflict, syncedDates };
}

/**
 * Retry a single failed item by id.  Returns true if the sync succeeded.
 */
export async function retryItem(
  id: string,
  getToken: () => Promise<string | null>,
): Promise<boolean> {
  const items = getOutboxItems('failed');
  const item = items.find((i) => i.id === id);
  if (!item) return false;

  resetOutboxItem(id);
  const pending = { ...item, status: 'pending' as const };

  if (item.opType === 'update') {
    const res = await syncUpdate(pending, getToken);
    return res.ok;
  }
  if (item.opType === 'delete') {
    return syncDelete(pending, getToken);
  }
  return syncCreate(pending, getToken);
}

/**
 * Force-apply a conflicted update by re-sending it without the baseVersion
 * constraint (overwrites whatever the server currently has).
 */
export async function forceApplyConflict(
  id: string,
  getToken: () => Promise<string | null>,
): Promise<boolean> {
  const items = getOutboxItems('conflict');
  const item = items.find((i) => i.id === id);
  if (!item) return false;

  resetOutboxItem(id);
  // Null baseVersion = send update unconditionally (no version check).
  const res = await syncUpdate({ ...item, status: 'pending' as const, baseVersion: null }, getToken);
  return res.ok;
}

/**
 * Discard a conflicted item — removes it from the outbox without sending to server.
 */
export function discardConflict(id: string): void {
  removeFromOutbox(id);
}

// ---------------------------------------------------------------------------
// Private per-operation sync functions
// ---------------------------------------------------------------------------

async function syncCreate(
  item: OutboxItem,
  getToken: () => Promise<string | null>,
): Promise<boolean> {
  const token = await acquireToken(item.id, getToken);
  if (token === null) return false;

  const result = await apiFetch<FoodEntry>('/api/v1/entries', {
    method: 'POST',
    body: JSON.stringify(item.payload),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  if (result.ok) {
    removeFromOutbox(item.id);
    return true;
  }

  // 409 = already synced (duplicate clientMutationId) = idempotent success.
  if (result.code === 'HTTP_409') {
    removeFromOutbox(item.id);
    return true;
  }

  markOutboxFailed(item.id, result.message);
  return false;
}

async function syncUpdate(
  item: OutboxItem,
  getToken: () => Promise<string | null>,
): Promise<{ ok: boolean; conflict: boolean }> {
  const token = await acquireToken(item.id, getToken);
  if (token === null) return { ok: false, conflict: false };

  const body =
    item.baseVersion != null
      ? { ...item.payload, baseVersion: item.baseVersion }
      : item.payload;

  const result = await apiFetch<FoodEntry>(
    `/api/v1/entries/${encodeURIComponent(item.entryId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    },
  );

  if (result.ok) {
    removeFromOutbox(item.id);
    return { ok: true, conflict: false };
  }

  if (result.code === 'VERSION_CONFLICT') {
    markOutboxConflict(item.id);
    return { ok: false, conflict: true };
  }

  markOutboxFailed(item.id, result.message);
  return { ok: false, conflict: false };
}

async function syncDelete(
  item: OutboxItem,
  getToken: () => Promise<string | null>,
): Promise<boolean> {
  const token = await acquireToken(item.id, getToken);
  if (token === null) return false;

  const result = await apiFetch<null>(
    `/api/v1/entries/${encodeURIComponent(item.entryId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    },
  );

  if (result.ok) {
    removeCachedEntry(item.entryId);
    removeFromOutbox(item.id);
    return true;
  }

  // 404 = entry already deleted on server — idempotent success.
  if (result.code === 'NOT_FOUND') {
    removeCachedEntry(item.entryId);
    removeFromOutbox(item.id);
    return true;
  }

  markOutboxFailed(item.id, result.message);
  return false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function acquireToken(
  outboxId: string,
  getToken: () => Promise<string | null>,
): Promise<string | null> {
  try {
    return await getToken();
  } catch {
    markOutboxFailed(outboxId, 'Authentication failed');
    return null;
  }
}

function recordDate(date: string, arr: string[]): void {
  if (!arr.includes(date)) arr.push(date);
}
