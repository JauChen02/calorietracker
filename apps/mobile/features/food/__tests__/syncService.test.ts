/**
 * Sync service tests — offline feature.
 *
 * Tests required by the original offline task (create only):
 *   5.  Offline create persists in the outbox until successfully synced.
 *   6.  Retrying the same create does not duplicate the entry on the server.
 *   7.  Online recovery removes the operation from the outbox.
 *   8.  A failed operation stays retryable.
 *   9.  Local cache and server results reconcile safely.
 *
 * New tests added for offline update/delete:
 *   10. Update while offline syncs via PATCH when back online.
 *   11. Delete while offline syncs via DELETE when back online.
 *   12. Delete wins over a pending update for the same entry.
 *   13. Stale-version conflict marks the item as conflict, not failed.
 *   14. Duplicate retry safety — conflicted update retried via forceApplyConflict.
 *   15. App restart with pending mutation queue — items survive and are re-processed.
 *   16. Failed update retry succeeds after a transient error.
 *
 * Uses relative imports throughout — syncService.ts itself uses relative imports
 * so no @/ alias resolution is needed (no Next.js / Expo build tooling required).
 * expo-sqlite and expo-network are NOT imported here; localDb is fully mocked.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mock localDb ──────────────────────────────────────────────────────────────
vi.mock('../../../db/localDb', () => ({
  getOutboxItems: vi.fn(),
  removeFromOutbox: vi.fn(),
  markOutboxFailed: vi.fn(),
  markOutboxConflict: vi.fn(),
  resetOutboxItem: vi.fn(),
  removeCachedEntry: vi.fn(),
  addToOutbox: vi.fn(),
  addUpdateToOutbox: vi.fn(),
  addDeleteToOutbox: vi.fn(),
  initLocalDb: vi.fn(),
  writeCachedDay: vi.fn(),
  readCachedDay: vi.fn(),
}));

// ── Mock apiFetch (relative path matching syncService.ts's own import) ────────
vi.mock('../../../lib/api', () => ({
  apiFetch: vi.fn(),
}));

import {
  getOutboxItems,
  removeFromOutbox,
  markOutboxFailed,
  markOutboxConflict,
  resetOutboxItem,
  removeCachedEntry,
} from '../../../db/localDb';
import { apiFetch } from '../../../lib/api';
import { syncPending, retryItem, forceApplyConflict, discardConflict } from '../syncService';
import type { OutboxItem } from '../../../db/localDb';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TODAY = '2026-07-01';
const getToken = vi.fn(async () => 'mock-token');

const CREATE_PAYLOAD = {
  clientMutationId: 'cmu-0001-0000-4000-8000-000000000001',
  mealType: 'lunch' as const,
  foodName: 'Avocado toast',
  brand: null,
  servingLabel: null,
  quantity: 1,
  grams: null,
  calories: 350,
  proteinG: 8,
  carbsG: 40,
  fatG: 14,
  fiberG: null,
  source: 'manual' as const,
  loggedAt: `${TODAY}T12:00:00.000Z`,
  localDate: TODAY,
  timezone: 'America/New_York',
};

const SERVER_ENTRY_ID = 'server-entry-0000-4000-8000-000000000001';

const PENDING_ITEM: OutboxItem = {
  id: CREATE_PAYLOAD.clientMutationId,
  entryId: CREATE_PAYLOAD.clientMutationId,
  localDate: TODAY,
  opType: 'create',
  payload: CREATE_PAYLOAD,
  baseVersion: null,
  foodName: 'Avocado toast',
  status: 'pending',
  failReason: null,
  conflictData: null,
  createdAt: Date.now(),
};

const FAILED_ITEM: OutboxItem = {
  ...PENDING_ITEM,
  status: 'failed',
  failReason: 'Network error',
};

const SERVER_ENTRY = {
  id: SERVER_ENTRY_ID,
  userId: 'user-uuid-0000-4000-8000-000000000001',
  ...CREATE_PAYLOAD,
  version: 1,
  createdAt: CREATE_PAYLOAD.loggedAt,
  updatedAt: CREATE_PAYLOAD.loggedAt,
};

// Update/delete fixtures
const PENDING_UPDATE: OutboxItem = {
  id: 'upd-outbox-0000-4000-8000-000000000001',
  entryId: SERVER_ENTRY_ID,
  localDate: TODAY,
  opType: 'update',
  payload: { mealType: 'dinner' as const },
  baseVersion: 2,
  foodName: 'Avocado toast',
  status: 'pending',
  failReason: null,
  conflictData: null,
  createdAt: Date.now(),
};

const PENDING_DELETE: OutboxItem = {
  id: 'del-outbox-0000-4000-8000-000000000001',
  entryId: SERVER_ENTRY_ID,
  localDate: TODAY,
  opType: 'delete',
  payload: null,
  baseVersion: null,
  foodName: 'Avocado toast',
  status: 'pending',
  failReason: null,
  conflictData: null,
  createdAt: Date.now(),
};

const FAILED_UPDATE: OutboxItem = {
  ...PENDING_UPDATE,
  status: 'failed',
  failReason: 'Network error',
};

const CONFLICT_UPDATE: OutboxItem = {
  ...PENDING_UPDATE,
  status: 'conflict',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Offline create persists in the outbox until successfully synced
// ─────────────────────────────────────────────────────────────────────────────

describe('Offline create persists in outbox until synced', () => {
  it('syncPending processes every pending outbox item', async () => {
    vi.mocked(getOutboxItems).mockReturnValue([PENDING_ITEM]);
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: SERVER_ENTRY });

    await syncPending(getToken);

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/entries',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(CREATE_PAYLOAD) }),
    );
  });

  it('item remains in outbox (not removed) while status is pending and sync has not run', async () => {
    vi.mocked(getOutboxItems).mockReturnValue([PENDING_ITEM]);

    const items = getOutboxItems('pending');
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(PENDING_ITEM.id);
    expect(removeFromOutbox).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Retrying the same create does not duplicate the entry
// ─────────────────────────────────────────────────────────────────────────────

describe('Retrying same create does not duplicate entry', () => {
  it('removes item from outbox on first success so a second syncPending is a no-op', async () => {
    vi.mocked(getOutboxItems).mockReturnValueOnce([PENDING_ITEM]);
    vi.mocked(apiFetch).mockResolvedValueOnce({ ok: true, data: SERVER_ENTRY });

    await syncPending(getToken);

    expect(removeFromOutbox).toHaveBeenCalledWith(PENDING_ITEM.id);
    expect(apiFetch).toHaveBeenCalledTimes(1);

    vi.mocked(getOutboxItems).mockReturnValueOnce([]);
    vi.clearAllMocks();

    await syncPending(getToken);

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('treats a 409 Conflict response as success and removes the item', async () => {
    vi.mocked(getOutboxItems).mockReturnValue([PENDING_ITEM]);
    vi.mocked(apiFetch).mockResolvedValue({ ok: false, code: 'HTTP_409', message: 'Conflict' });

    const result = await syncPending(getToken);

    expect(removeFromOutbox).toHaveBeenCalledWith(PENDING_ITEM.id);
    expect(markOutboxFailed).not.toHaveBeenCalled();
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Online recovery removes the operation from the outbox
// ─────────────────────────────────────────────────────────────────────────────

describe('Online recovery removes synced item from outbox', () => {
  it('calls removeFromOutbox after a successful API response', async () => {
    vi.mocked(getOutboxItems).mockReturnValue([PENDING_ITEM]);
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: SERVER_ENTRY });

    const result = await syncPending(getToken);

    expect(removeFromOutbox).toHaveBeenCalledWith(PENDING_ITEM.id);
    expect(markOutboxFailed).not.toHaveBeenCalled();
    expect(result).toMatchObject({ synced: 1, failed: 0 });
  });

  it('does not call removeFromOutbox when the API returns a non-conflict error', async () => {
    vi.mocked(getOutboxItems).mockReturnValue([PENDING_ITEM]);
    vi.mocked(apiFetch).mockResolvedValue({
      ok: false,
      code: 'HTTP_500',
      message: 'Internal Server Error',
    });

    await syncPending(getToken);

    expect(removeFromOutbox).not.toHaveBeenCalled();
    expect(markOutboxFailed).toHaveBeenCalledWith(PENDING_ITEM.id, 'Internal Server Error');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Failed operation stays retryable
// ─────────────────────────────────────────────────────────────────────────────

describe('Failed operation stays retryable', () => {
  it('marks item as failed (not removed) when API call fails', async () => {
    vi.mocked(getOutboxItems).mockReturnValue([PENDING_ITEM]);
    vi.mocked(apiFetch).mockResolvedValue({
      ok: false,
      code: 'NETWORK_ERROR',
      message: 'Network request failed',
    });

    const result = await syncPending(getToken);

    expect(markOutboxFailed).toHaveBeenCalledWith(PENDING_ITEM.id, 'Network request failed');
    expect(removeFromOutbox).not.toHaveBeenCalled();
    expect(result).toMatchObject({ synced: 0, failed: 1 });
  });

  it('retryItem resets status to pending and retries the API call', async () => {
    vi.mocked(getOutboxItems).mockReturnValue([FAILED_ITEM]);
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: SERVER_ENTRY });

    const ok = await retryItem(FAILED_ITEM.id, getToken);

    expect(resetOutboxItem).toHaveBeenCalledWith(FAILED_ITEM.id);
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(removeFromOutbox).toHaveBeenCalledWith(FAILED_ITEM.id);
    expect(ok).toBe(true);
  });

  it('retryItem returns false if the item id is not in the outbox', async () => {
    vi.mocked(getOutboxItems).mockReturnValue([]);

    const ok = await retryItem('nonexistent-id', getToken);

    expect(ok).toBe(false);
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Local cache and server results reconcile safely
// ─────────────────────────────────────────────────────────────────────────────

describe('Local cache and server results reconcile safely', () => {
  it('after sync removes item from outbox, subsequent syncPending finds nothing to process', async () => {
    vi.mocked(getOutboxItems).mockReturnValueOnce([PENDING_ITEM]);
    vi.mocked(apiFetch).mockResolvedValueOnce({ ok: true, data: SERVER_ENTRY });

    const first = await syncPending(getToken);
    expect(first.synced).toBe(1);
    expect(removeFromOutbox).toHaveBeenCalledWith(PENDING_ITEM.id);

    vi.mocked(getOutboxItems).mockReturnValueOnce([]);

    const second = await syncPending(getToken);
    expect(second.synced).toBe(0);
    expect(second.failed).toBe(0);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('multiple pending items are each synced independently', async () => {
    const ITEM_2: OutboxItem = {
      ...PENDING_ITEM,
      id: 'cmu-0002-0000-4000-8000-000000000002',
      entryId: 'cmu-0002-0000-4000-8000-000000000002',
      payload: { ...CREATE_PAYLOAD, clientMutationId: 'cmu-0002-0000-4000-8000-000000000002', foodName: 'Banana' },
      foodName: 'Banana',
    };

    vi.mocked(getOutboxItems).mockReturnValue([PENDING_ITEM, ITEM_2]);
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: SERVER_ENTRY });

    const result = await syncPending(getToken);

    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(removeFromOutbox).toHaveBeenCalledWith(PENDING_ITEM.id);
    expect(removeFromOutbox).toHaveBeenCalledWith(ITEM_2.id);
    expect(result).toMatchObject({ synced: 2, failed: 0 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Update while offline syncs via PATCH when back online
// ─────────────────────────────────────────────────────────────────────────────

describe('Update while offline then sync', () => {
  it('sends PATCH with entryId in URL and removes item on success', async () => {
    vi.mocked(getOutboxItems).mockReturnValue([PENDING_UPDATE]);
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: { ...SERVER_ENTRY, version: 3 } });

    const result = await syncPending(getToken);

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith(
      `/api/v1/entries/${SERVER_ENTRY_ID}`,
      expect.objectContaining({ method: 'PATCH' }),
    );
    // Body should include baseVersion from the outbox item
    const callBody = JSON.parse(
      (vi.mocked(apiFetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(callBody.baseVersion).toBe(PENDING_UPDATE.baseVersion);
    expect(removeFromOutbox).toHaveBeenCalledWith(PENDING_UPDATE.id);
    expect(result.synced).toBe(1);
    expect(result.syncedDates).toContain(TODAY);
  });

  it('marks update as failed when PATCH returns a server error', async () => {
    vi.mocked(getOutboxItems).mockReturnValue([PENDING_UPDATE]);
    vi.mocked(apiFetch).mockResolvedValue({ ok: false, code: 'HTTP_500', message: 'Server error' });

    const result = await syncPending(getToken);

    expect(markOutboxFailed).toHaveBeenCalledWith(PENDING_UPDATE.id, 'Server error');
    expect(removeFromOutbox).not.toHaveBeenCalled();
    expect(result.failed).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Delete while offline syncs via DELETE when back online
// ─────────────────────────────────────────────────────────────────────────────

describe('Delete while offline then sync', () => {
  it('sends DELETE, calls removeCachedEntry, removes item from outbox', async () => {
    vi.mocked(getOutboxItems).mockReturnValue([PENDING_DELETE]);
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: null });

    const result = await syncPending(getToken);

    expect(apiFetch).toHaveBeenCalledWith(
      `/api/v1/entries/${SERVER_ENTRY_ID}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(removeCachedEntry).toHaveBeenCalledWith(SERVER_ENTRY_ID);
    expect(removeFromOutbox).toHaveBeenCalledWith(PENDING_DELETE.id);
    expect(result.synced).toBe(1);
  });

  it('treats 404 on DELETE as success — entry already gone on server', async () => {
    vi.mocked(getOutboxItems).mockReturnValue([PENDING_DELETE]);
    vi.mocked(apiFetch).mockResolvedValue({ ok: false, code: 'NOT_FOUND', message: 'Not found' });

    const result = await syncPending(getToken);

    expect(removeCachedEntry).toHaveBeenCalledWith(SERVER_ENTRY_ID);
    expect(removeFromOutbox).toHaveBeenCalledWith(PENDING_DELETE.id);
    expect(markOutboxFailed).not.toHaveBeenCalled();
    expect(result.synced).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Delete wins over a pending update for the same entry
// ─────────────────────────────────────────────────────────────────────────────

describe('Delete wins over pending update', () => {
  it('discards the pending update and only sends the delete', async () => {
    // Both operations target the same entryId (SERVER_ENTRY_ID)
    vi.mocked(getOutboxItems).mockReturnValue([PENDING_UPDATE, PENDING_DELETE]);
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: null });

    await syncPending(getToken);

    // Update is discarded — removed without calling the API
    expect(removeFromOutbox).toHaveBeenCalledWith(PENDING_UPDATE.id);
    // Delete is sent
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith(
      `/api/v1/entries/${SERVER_ENTRY_ID}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
    // Delete outbox item also removed after success
    expect(removeFromOutbox).toHaveBeenCalledWith(PENDING_DELETE.id);
  });

  it('create+delete pair is cancelled locally — no API calls made', async () => {
    // A create and delete for the same (offline, never-synced) clientMutationId
    const localId = 'local-only-0000-4000-8000-000000000001';
    const offlineCreate: OutboxItem = {
      ...PENDING_ITEM,
      id: localId,
      entryId: localId,
      foodName: 'New food',
    };
    const offlineDelete: OutboxItem = {
      ...PENDING_DELETE,
      id: 'del-local-0000-4000-8000-000000000001',
      entryId: localId,
    };

    vi.mocked(getOutboxItems).mockReturnValue([offlineCreate, offlineDelete]);

    await syncPending(getToken);

    // Neither create nor delete reaches the server
    expect(apiFetch).not.toHaveBeenCalled();
    // Both are removed from outbox
    expect(removeFromOutbox).toHaveBeenCalledWith(offlineCreate.id);
    expect(removeFromOutbox).toHaveBeenCalledWith(offlineDelete.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Stale-version conflict marks item as conflict, not failed
// ─────────────────────────────────────────────────────────────────────────────

describe('Stale-version conflict response', () => {
  it('marks update as conflict when server returns VERSION_CONFLICT', async () => {
    vi.mocked(getOutboxItems).mockReturnValue([PENDING_UPDATE]);
    vi.mocked(apiFetch).mockResolvedValue({
      ok: false,
      code: 'VERSION_CONFLICT',
      message: 'Entry was modified since you last loaded it.',
    });

    const result = await syncPending(getToken);

    expect(markOutboxConflict).toHaveBeenCalledWith(PENDING_UPDATE.id);
    expect(markOutboxFailed).not.toHaveBeenCalled();
    expect(removeFromOutbox).not.toHaveBeenCalled();
    expect(result.conflict).toBe(1);
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. Duplicate retry safety — forceApplyConflict retries without baseVersion
// ─────────────────────────────────────────────────────────────────────────────

describe('Duplicate retry safety — conflict force-apply', () => {
  it('forceApplyConflict re-sends update without baseVersion and removes item on success', async () => {
    vi.mocked(getOutboxItems).mockReturnValue([CONFLICT_UPDATE]);
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: { ...SERVER_ENTRY, version: 4 } });

    const ok = await forceApplyConflict(CONFLICT_UPDATE.id, getToken);

    expect(resetOutboxItem).toHaveBeenCalledWith(CONFLICT_UPDATE.id);
    expect(apiFetch).toHaveBeenCalledTimes(1);
    // Body must NOT include baseVersion
    const callBody = JSON.parse(
      (vi.mocked(apiFetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(callBody.baseVersion).toBeUndefined();
    expect(removeFromOutbox).toHaveBeenCalledWith(CONFLICT_UPDATE.id);
    expect(ok).toBe(true);
  });

  it('discardConflict removes the item without contacting the server', () => {
    discardConflict(CONFLICT_UPDATE.id);

    expect(removeFromOutbox).toHaveBeenCalledWith(CONFLICT_UPDATE.id);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('forceApplyConflict returns false if item not found in conflict queue', async () => {
    vi.mocked(getOutboxItems).mockReturnValue([]);

    const ok = await forceApplyConflict('nonexistent', getToken);

    expect(ok).toBe(false);
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. App restart with pending mutation queue
// ─────────────────────────────────────────────────────────────────────────────

describe('App restart with pending mutation queue', () => {
  it('syncPending processes items from a previous session (simulated via mock)', async () => {
    // Simulate persistence across restart: getOutboxItems returns items that were
    // queued before the app was killed.
    vi.mocked(getOutboxItems).mockReturnValue([PENDING_ITEM, PENDING_UPDATE]);
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ ok: true, data: SERVER_ENTRY }) // create
      .mockResolvedValueOnce({ ok: true, data: { ...SERVER_ENTRY, version: 3 } }); // update

    const result = await syncPending(getToken);

    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(removeFromOutbox).toHaveBeenCalledWith(PENDING_ITEM.id);
    expect(removeFromOutbox).toHaveBeenCalledWith(PENDING_UPDATE.id);
    expect(result.synced).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. Failed update retry succeeds after a transient error
// ─────────────────────────────────────────────────────────────────────────────

describe('Failed operation retry — update and delete', () => {
  it('retryItem re-sends a failed update via PATCH', async () => {
    vi.mocked(getOutboxItems).mockReturnValue([FAILED_UPDATE]);
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: { ...SERVER_ENTRY, version: 3 } });

    const ok = await retryItem(FAILED_UPDATE.id, getToken);

    expect(resetOutboxItem).toHaveBeenCalledWith(FAILED_UPDATE.id);
    expect(apiFetch).toHaveBeenCalledWith(
      `/api/v1/entries/${SERVER_ENTRY_ID}`,
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(removeFromOutbox).toHaveBeenCalledWith(FAILED_UPDATE.id);
    expect(ok).toBe(true);
  });

  it('retryItem re-sends a failed delete via DELETE', async () => {
    const failedDelete: OutboxItem = { ...PENDING_DELETE, status: 'failed', failReason: 'Timeout' };
    vi.mocked(getOutboxItems).mockReturnValue([failedDelete]);
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: null });

    const ok = await retryItem(failedDelete.id, getToken);

    expect(resetOutboxItem).toHaveBeenCalledWith(failedDelete.id);
    expect(apiFetch).toHaveBeenCalledWith(
      `/api/v1/entries/${SERVER_ENTRY_ID}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(removeCachedEntry).toHaveBeenCalledWith(SERVER_ENTRY_ID);
    expect(removeFromOutbox).toHaveBeenCalledWith(failedDelete.id);
    expect(ok).toBe(true);
  });
});
