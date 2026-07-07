/**
 * Local SQLite persistence for offline support.
 *
 * Two tables:
 *   cached_entries  — mirror of server-side food_entries for a given date, written
 *                     on every successful fetchDay so offline reads have fresh data.
 *   outbox          — pending operations written when the device is offline.
 *                     Entries are removed after a successful API sync.
 *
 * Outbox columns (v2 — added via ALTER TABLE migration):
 *   op_type      'create' | 'update' | 'delete'   (DEFAULT 'create' for old rows)
 *   entry_id     server UUID for update/delete; clientMutationId for create
 *   base_version version the client held when queueing an update (optimistic concurrency)
 *   food_name    display label for SyncIndicator
 *   conflict_data reserved for future use (currently unused)
 *
 * All functions are synchronous wrappers around expo-sqlite's sync API so callers
 * do not need to await DB operations in the critical render path.
 */

import * as SQLite from 'expo-sqlite';
import { sumEntries } from '@calorielog/contracts';
import type { DayResponse, FoodEntry, CreateFoodEntry, PatchFoodEntry } from '@calorielog/contracts';
import { generateUUID } from '../lib/uuid';

let _db: SQLite.SQLiteDatabase | null = null;

function db(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('calorielog.db');
    // Base schema — safe to re-run (IF NOT EXISTS / INSERT OR IGNORE)
    _db.execSync(`
      CREATE TABLE IF NOT EXISTS cached_entries (
        id          TEXT    PRIMARY KEY,
        local_date  TEXT    NOT NULL,
        data        TEXT    NOT NULL,
        cached_at   INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS outbox (
        id          TEXT    PRIMARY KEY,
        local_date  TEXT    NOT NULL,
        payload     TEXT    NOT NULL,
        status      TEXT    NOT NULL DEFAULT 'pending',
        fail_reason TEXT,
        created_at  INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ce_date   ON cached_entries(local_date);
      CREATE INDEX IF NOT EXISTS idx_ob_status ON outbox(status);
    `);

    // v2 outbox columns — SQLite cannot ADD COLUMN IF NOT EXISTS, so we try each
    // individually and swallow "duplicate column" errors from re-runs.
    const v2Columns = [
      `ALTER TABLE outbox ADD COLUMN op_type TEXT NOT NULL DEFAULT 'create'`,
      `ALTER TABLE outbox ADD COLUMN entry_id TEXT`,
      `ALTER TABLE outbox ADD COLUMN base_version INTEGER`,
      `ALTER TABLE outbox ADD COLUMN food_name TEXT`,
      `ALTER TABLE outbox ADD COLUMN conflict_data TEXT`,
    ];
    for (const stmt of v2Columns) {
      try {
        _db.runSync(stmt);
      } catch {
        // Column already exists — expected on every run after the first migration
      }
    }
  }
  return _db;
}

/** No-op — kept for any callers that call this explicitly; tables init lazily on first use. */
export function initLocalDb(): void {
  db();
}

/**
 * Removes all rows from both SQLite tables without dropping the schema.
 * Call this after a successful account deletion so stale outbox operations
 * cannot replay against a new account created in the same app session.
 */
export function clearLocalDb(): void {
  const d = db();
  d.runSync('DELETE FROM outbox');
  d.runSync('DELETE FROM cached_entries');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OutboxOpType = 'create' | 'update' | 'delete';
export type SyncStatus = 'pending' | 'failed' | 'conflict';

export interface OutboxItem {
  id: string;
  /** Server UUID for update/delete; same as id (clientMutationId) for create. */
  entryId: string;
  localDate: string;
  opType: OutboxOpType;
  /** CreateFoodEntry for creates, PatchFoodEntry for updates, null for deletes. */
  payload: CreateFoodEntry | PatchFoodEntry | null;
  /** Version the client held when the update was queued; null for create/delete. */
  baseVersion: number | null;
  /** Human-readable food name for SyncIndicator. */
  foodName: string;
  status: SyncStatus;
  failReason: string | null;
  conflictData: string | null;
  createdAt: number;
}

type OutboxRow = {
  id: string;
  local_date: string;
  op_type: string;
  entry_id: string | null;
  payload: string;
  base_version: number | null;
  food_name: string | null;
  conflict_data: string | null;
  status: string;
  fail_reason: string | null;
  created_at: number;
};

// ---------------------------------------------------------------------------
// Outbox CRUD
// ---------------------------------------------------------------------------

export function addToOutbox(payload: CreateFoodEntry): void {
  db().runSync(
    `INSERT OR IGNORE INTO outbox
     (id, local_date, op_type, entry_id, payload, food_name, status, created_at)
     VALUES (?, ?, 'create', ?, ?, ?, 'pending', ?)`,
    [
      payload.clientMutationId,
      payload.localDate,
      payload.clientMutationId,
      JSON.stringify(payload),
      payload.foodName,
      Date.now(),
    ],
  );
}

export function addUpdateToOutbox(
  entryId: string,
  localDate: string,
  foodName: string,
  payload: PatchFoodEntry,
  baseVersion: number | null,
): void {
  const id = generateUUID();
  // Strip baseVersion from stored payload — it lives in the base_version column.
  const { baseVersion: _stripped, ...cleanPayload } = payload;
  db().runSync(
    `INSERT INTO outbox
     (id, local_date, op_type, entry_id, payload, base_version, food_name, status, created_at)
     VALUES (?, ?, 'update', ?, ?, ?, ?, 'pending', ?)`,
    [id, localDate, entryId, JSON.stringify(cleanPayload), baseVersion, foodName, Date.now()],
  );
}

export function addDeleteToOutbox(entryId: string, localDate: string, foodName: string): void {
  const id = generateUUID();
  db().runSync(
    `INSERT INTO outbox
     (id, local_date, op_type, entry_id, payload, food_name, status, created_at)
     VALUES (?, ?, 'delete', ?, 'null', ?, 'pending', ?)`,
    [id, localDate, entryId, foodName, Date.now()],
  );
}

function rowToItem(r: OutboxRow): OutboxItem {
  const opType = (r.op_type ?? 'create') as OutboxOpType;
  const rawPayload = JSON.parse(r.payload) as CreateFoodEntry | PatchFoodEntry | null;
  // Backward-compat: old rows have null food_name — read it from the payload.
  const foodName =
    r.food_name ??
    (opType === 'create' && rawPayload
      ? (rawPayload as CreateFoodEntry).foodName
      : 'Food');
  return {
    id: r.id,
    entryId: r.entry_id ?? r.id,
    localDate: r.local_date,
    opType,
    payload: rawPayload,
    baseVersion: r.base_version,
    foodName,
    status: r.status as SyncStatus,
    failReason: r.fail_reason,
    conflictData: r.conflict_data,
    createdAt: r.created_at,
  };
}

export function getOutboxItems(status?: SyncStatus): OutboxItem[] {
  const rows: OutboxRow[] = status
    ? db().getAllSync('SELECT * FROM outbox WHERE status = ? ORDER BY created_at ASC', [status])
    : db().getAllSync('SELECT * FROM outbox ORDER BY created_at ASC');
  return rows.map(rowToItem);
}

export function removeFromOutbox(id: string): void {
  db().runSync('DELETE FROM outbox WHERE id = ?', [id]);
}

export function markOutboxFailed(id: string, reason: string): void {
  db().runSync(
    'UPDATE outbox SET status = ?, fail_reason = ? WHERE id = ?',
    ['failed', reason, id],
  );
}

export function markOutboxConflict(id: string): void {
  db().runSync(
    'UPDATE outbox SET status = ? WHERE id = ?',
    ['conflict', id],
  );
}

export function resetOutboxItem(id: string): void {
  db().runSync(
    'UPDATE outbox SET status = ?, fail_reason = NULL WHERE id = ?',
    ['pending', id],
  );
}

// ---------------------------------------------------------------------------
// Cached entries CRUD
// ---------------------------------------------------------------------------

export function writeCachedDay(date: string, response: DayResponse): void {
  const d = db();
  d.runSync('DELETE FROM cached_entries WHERE local_date = ?', [date]);
  for (const entry of response.entries) {
    d.runSync(
      `INSERT INTO cached_entries (id, local_date, data, cached_at) VALUES (?, ?, ?, ?)`,
      [entry.id, date, JSON.stringify(entry), Date.now()],
    );
  }
}

/** Remove a single entry from the local cache (called after a successful DELETE sync). */
export function removeCachedEntry(id: string): void {
  db().runSync('DELETE FROM cached_entries WHERE id = ?', [id]);
}

type CachedRow = { data: string };

/**
 * Returns the cached DayResponse for a date, merging server-synced entries with
 * any pending/conflict outbox operations for that date so the UI shows a complete
 * picture while offline:
 *   - pending/conflict deletes  → entry is hidden
 *   - pending/conflict updates  → patch is applied to the entry
 *   - pending creates           → entry shown as optimistic
 *
 * Returns null only when no data exists at all (fresh install, offline).
 */
export function readCachedDay(date: string): DayResponse | null {
  const rows: CachedRow[] = db().getAllSync(
    'SELECT data FROM cached_entries WHERE local_date = ? ORDER BY cached_at ASC',
    [date],
  );

  const allOutbox = getOutboxItems();
  const activeForDate = allOutbox.filter(
    (i) => i.localDate === date && (i.status === 'pending' || i.status === 'conflict'),
  );

  if (rows.length === 0 && activeForDate.length === 0) return null;

  const deletes = activeForDate.filter((i) => i.opType === 'delete');
  const updates = activeForDate.filter((i) => i.opType === 'update');
  const creates = activeForDate.filter((i) => i.opType === 'create');

  const deletedIds = new Set(deletes.map((i) => i.entryId));

  // Server-synced entries minus any that have a pending delete.
  let serverEntries: FoodEntry[] = rows
    .map((r) => JSON.parse(r.data) as FoodEntry)
    .filter((e) => !deletedIds.has(e.id));

  // Apply pending updates to server-synced entries.
  for (const upd of updates) {
    if (deletedIds.has(upd.entryId) || !upd.payload) continue;
    const idx = serverEntries.findIndex((e) => e.id === upd.entryId);
    if (idx >= 0) {
      serverEntries[idx] = applyPatch(serverEntries[idx], upd.payload as PatchFoodEntry);
    }
  }

  // Optimistic create entries, excluding any that already have a pending delete.
  const optimisticCreates: FoodEntry[] = creates
    .filter((c) => !deletedIds.has(c.id))
    .map((c) => buildOptimisticEntry(c.payload as CreateFoodEntry));

  // Apply pending updates to optimistic creates too (offline create then update).
  for (const upd of updates) {
    if (deletedIds.has(upd.entryId) || !upd.payload) continue;
    const idx = optimisticCreates.findIndex((e) => e.id === upd.entryId);
    if (idx >= 0) {
      optimisticCreates[idx] = applyPatch(optimisticCreates[idx], upd.payload as PatchFoodEntry);
    }
  }

  const allEntries = [...serverEntries, ...optimisticCreates];
  return { date, entries: allEntries, totals: sumEntries(allEntries) };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function buildOptimisticEntry(p: CreateFoodEntry): FoodEntry {
  return {
    id: p.clientMutationId,
    userId: '',
    clientMutationId: p.clientMutationId,
    mealType: p.mealType,
    foodName: p.foodName,
    brand: p.brand ?? null,
    servingLabel: p.servingLabel ?? null,
    quantity: p.quantity,
    grams: p.grams ?? null,
    calories: p.calories,
    proteinG: p.proteinG,
    carbsG: p.carbsG,
    fatG: p.fatG,
    fiberG: p.fiberG ?? null,
    source: p.source,
    loggedAt: p.loggedAt,
    localDate: p.localDate,
    timezone: p.timezone,
    version: 1,
    createdAt: p.loggedAt,
    updatedAt: p.loggedAt,
  };
}

function applyPatch(entry: FoodEntry, patch: PatchFoodEntry): FoodEntry {
  return {
    ...entry,
    ...(patch.mealType !== undefined && { mealType: patch.mealType }),
    ...(patch.foodName !== undefined && { foodName: patch.foodName }),
    ...('brand' in patch && { brand: patch.brand ?? null }),
    ...('servingLabel' in patch && { servingLabel: patch.servingLabel ?? null }),
    ...(patch.quantity !== undefined && { quantity: patch.quantity }),
    ...('grams' in patch && { grams: patch.grams ?? null }),
    ...(patch.calories !== undefined && { calories: patch.calories }),
    ...(patch.proteinG !== undefined && { proteinG: patch.proteinG }),
    ...(patch.carbsG !== undefined && { carbsG: patch.carbsG }),
    ...(patch.fatG !== undefined && { fatG: patch.fatG }),
    ...('fiberG' in patch && { fiberG: patch.fiberG ?? null }),
    ...(patch.source !== undefined && { source: patch.source }),
    ...(patch.loggedAt !== undefined && { loggedAt: patch.loggedAt }),
    ...(patch.localDate !== undefined && { localDate: patch.localDate }),
    ...(patch.timezone !== undefined && { timezone: patch.timezone }),
    version: entry.version + 1,
    updatedAt: new Date().toISOString(),
  };
}
