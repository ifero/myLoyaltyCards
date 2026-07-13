import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_DELETIONS_KEY = 'syncPendingDeletions';

/**
 * Add a card ID to the pending-deletion queue.
 * Persisted in AsyncStorage so it survives app restarts.
 */
export const addPendingDeletion = async (cardId: string): Promise<void> => {
  const existing = await getPendingDeletions();
  if (!existing.includes(cardId)) {
    existing.push(cardId);
    await AsyncStorage.setItem(PENDING_DELETIONS_KEY, JSON.stringify(existing));
  }
};

/**
 * Retrieve all card IDs queued for cloud deletion.
 */
export const getPendingDeletions = async (): Promise<string[]> => {
  const raw = await AsyncStorage.getItem(PENDING_DELETIONS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed as string[];
    }
    return [];
  } catch {
    return [];
  }
};

/**
 * Clear the pending-deletion queue after a successful sync.
 */
export const clearPendingDeletions = async (): Promise<void> => {
  await AsyncStorage.removeItem(PENDING_DELETIONS_KEY);
};

/**
 * Remove specific card IDs from the pending-deletion queue.
 *
 * Unlike `clearPendingDeletions()` (which wipes the whole queue), this clears
 * only the ids that were actually drained — so a deletion enqueued mid-sync is
 * never silently lost when the download path removes the ids it saw at merge
 * time (Story 16.11).
 */
export const removePendingDeletions = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) {
    return;
  }

  const existing = await getPendingDeletions();
  const toRemove = new Set(ids);
  const remaining = existing.filter((id) => !toRemove.has(id));

  // None of the ids were queued — leave storage untouched (avoids clobbering a
  // queue another writer may have just updated).
  if (remaining.length === existing.length) {
    return;
  }

  if (remaining.length === 0) {
    await AsyncStorage.removeItem(PENDING_DELETIONS_KEY);
    return;
  }

  await AsyncStorage.setItem(PENDING_DELETIONS_KEY, JSON.stringify(remaining));
};

export const _PENDING_DELETIONS_KEY = PENDING_DELETIONS_KEY;
