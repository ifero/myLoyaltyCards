import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  _PENDING_DELETIONS_KEY,
  addPendingDeletion,
  clearPendingDeletions,
  getPendingDeletions,
  removePendingDeletions
} from './deletion-tracker';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('addPendingDeletion', () => {
  it('stores a card ID in AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    await addPendingDeletion('card-1');

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      _PENDING_DELETIONS_KEY,
      JSON.stringify(['card-1'])
    );
  });

  it('appends to existing queue', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(['card-1']));

    await addPendingDeletion('card-2');

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      _PENDING_DELETIONS_KEY,
      JSON.stringify(['card-1', 'card-2'])
    );
  });

  it('does not duplicate an already-queued ID', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(['card-1']));

    await addPendingDeletion('card-1');

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});

describe('getPendingDeletions', () => {
  it('returns empty array when nothing is stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    expect(await getPendingDeletions()).toEqual([]);
  });

  it('returns stored IDs', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(['a', 'b']));
    expect(await getPendingDeletions()).toEqual(['a', 'b']);
  });

  it('returns empty array for invalid JSON', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not-json');
    expect(await getPendingDeletions()).toEqual([]);
  });

  it('returns empty array when stored data is not a string array', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([1, 2]));
    expect(await getPendingDeletions()).toEqual([]);
  });
});

describe('clearPendingDeletions', () => {
  it('removes the pending deletions key from AsyncStorage', async () => {
    await clearPendingDeletions();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(_PENDING_DELETIONS_KEY);
  });
});

describe('removePendingDeletions', () => {
  it('does nothing when given an empty id list', async () => {
    await removePendingDeletions([]);

    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });

  it('removes only the given id, keeping the rest', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(['a', 'b', 'c']));

    await removePendingDeletions(['b']);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      _PENDING_DELETIONS_KEY,
      JSON.stringify(['a', 'c'])
    );
  });

  it('removes several ids in one call', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(['a', 'b', 'c']));

    await removePendingDeletions(['a', 'c']);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      _PENDING_DELETIONS_KEY,
      JSON.stringify(['b'])
    );
  });

  it('clears the key entirely when the last queued id is drained', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(['only']));

    await removePendingDeletions(['only']);

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(_PENDING_DELETIONS_KEY);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('does not write when none of the ids are queued (avoids clobbering a mid-sync enqueue)', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(['a', 'b']));

    await removePendingDeletions(['x', 'y']);

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });
});
