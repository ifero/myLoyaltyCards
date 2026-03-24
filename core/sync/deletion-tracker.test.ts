import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  _PENDING_DELETIONS_KEY,
  addPendingDeletion,
  clearPendingDeletions,
  getPendingDeletions
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
