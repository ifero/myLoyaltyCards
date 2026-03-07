/**
 * Guest Session Repository Tests
 * Story 6.5: Implement Guest Mode
 *
 * Validates persistent guest session UUID creation, retrieval, and deletion
 * using a mocked expo-secure-store, including the in-memory fallback path.
 */

// ---------------------------------------------------------------------------
// Mock expo-secure-store
// ---------------------------------------------------------------------------

const mockIsAvailableAsync = jest.fn();
const mockGetItemAsync = jest.fn();
const mockSetItemAsync = jest.fn();
const mockDeleteItemAsync = jest.fn();

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: mockIsAvailableAsync,
  getItemAsync: mockGetItemAsync,
  setItemAsync: mockSetItemAsync,
  deleteItemAsync: mockDeleteItemAsync
}));

// Mock uuid to produce deterministic values
jest.mock('uuid', () => ({
  v4: jest.fn()
}));

import { v4 as uuidv4 } from 'uuid';

import {
  _resetInMemoryGuestIdForTesting,
  clearGuestSessionId,
  getOrCreateGuestSessionId
} from './guest-session-repository';

// ---------------------------------------------------------------------------
// Tests — SecureStore available path
// ---------------------------------------------------------------------------

describe('getOrCreateGuestSessionId — SecureStore available', () => {
  beforeEach(() => {
    mockIsAvailableAsync.mockResolvedValue(true);
    mockGetItemAsync.mockReset();
    mockSetItemAsync.mockReset();
    mockDeleteItemAsync.mockReset();
    (uuidv4 as jest.Mock).mockReset();
    _resetInMemoryGuestIdForTesting();
  });

  it('returns the stored ID when one already exists', async () => {
    mockGetItemAsync.mockResolvedValue('existing-guest-id');

    const id = await getOrCreateGuestSessionId();

    expect(id).toBe('existing-guest-id');
    expect(mockSetItemAsync).not.toHaveBeenCalled();
  });

  it('generates, stores, and returns a new UUID when no session exists', async () => {
    mockGetItemAsync.mockResolvedValue(null);
    (uuidv4 as jest.Mock).mockReturnValue('new-uuid-1234');

    const id = await getOrCreateGuestSessionId();

    expect(id).toBe('new-uuid-1234');
    expect(mockSetItemAsync).toHaveBeenCalledWith('guest_session_id', 'new-uuid-1234');
  });

  it('reads from the correct SecureStore key', async () => {
    mockGetItemAsync.mockResolvedValue('any-id');

    await getOrCreateGuestSessionId();

    expect(mockGetItemAsync).toHaveBeenCalledWith('guest_session_id');
  });

  it('returns the same ID on subsequent calls (stable identity)', async () => {
    mockGetItemAsync.mockResolvedValue('stable-id');

    const id1 = await getOrCreateGuestSessionId();
    const id2 = await getOrCreateGuestSessionId();

    expect(id1).toBe('stable-id');
    expect(id2).toBe('stable-id');
    expect(mockSetItemAsync).not.toHaveBeenCalled();
  });

  it('does not expose or log sensitive data (returns only the ID string)', async () => {
    mockGetItemAsync.mockResolvedValue(null);
    (uuidv4 as jest.Mock).mockReturnValue('safe-id');

    const result = await getOrCreateGuestSessionId();

    expect(typeof result).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Tests — in-memory fallback path (SecureStore unavailable or throws)
// ---------------------------------------------------------------------------

describe('getOrCreateGuestSessionId — in-memory fallback', () => {
  beforeEach(() => {
    (uuidv4 as jest.Mock).mockReset();
    _resetInMemoryGuestIdForTesting();
  });

  it('returns a stable in-memory ID when isAvailableAsync returns false', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    (uuidv4 as jest.Mock).mockReturnValue('fallback-id-1');

    const id1 = await getOrCreateGuestSessionId();
    const id2 = await getOrCreateGuestSessionId();

    expect(id1).toBe('fallback-id-1');
    expect(id2).toBe('fallback-id-1');
    expect(uuidv4).toHaveBeenCalledTimes(1);
  });

  it('returns a stable in-memory ID when SecureStore throws', async () => {
    mockIsAvailableAsync.mockRejectedValue(new Error('SecureStore unavailable'));
    (uuidv4 as jest.Mock).mockReturnValue('fallback-id-throw');

    const id1 = await getOrCreateGuestSessionId();
    const id2 = await getOrCreateGuestSessionId();

    expect(id1).toBe('fallback-id-throw');
    expect(id2).toBe('fallback-id-throw');
    expect(uuidv4).toHaveBeenCalledTimes(1);
  });

  it('does not call SecureStore read/write when unavailable', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    mockGetItemAsync.mockReset();
    mockSetItemAsync.mockReset();
    (uuidv4 as jest.Mock).mockReturnValue('fallback-no-store');

    await getOrCreateGuestSessionId();

    expect(mockGetItemAsync).not.toHaveBeenCalled();
    expect(mockSetItemAsync).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests — clearGuestSessionId
// ---------------------------------------------------------------------------

describe('clearGuestSessionId', () => {
  beforeEach(() => {
    mockIsAvailableAsync.mockResolvedValue(true);
    mockDeleteItemAsync.mockReset();
    (uuidv4 as jest.Mock).mockReset();
    _resetInMemoryGuestIdForTesting();
  });

  it('deletes the guest session key from SecureStore', async () => {
    mockDeleteItemAsync.mockResolvedValue(undefined);

    await clearGuestSessionId();

    expect(mockDeleteItemAsync).toHaveBeenCalledWith('guest_session_id');
  });

  it('resolves without throwing when deletion succeeds', async () => {
    mockDeleteItemAsync.mockResolvedValue(undefined);

    await expect(clearGuestSessionId()).resolves.toBeUndefined();
  });

  it('clears in-memory fallback ID so next call generates a fresh UUID', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    (uuidv4 as jest.Mock).mockReturnValueOnce('first-id').mockReturnValueOnce('second-id');

    const idBefore = await getOrCreateGuestSessionId();
    expect(idBefore).toBe('first-id');

    await clearGuestSessionId();

    const idAfter = await getOrCreateGuestSessionId();
    expect(idAfter).toBe('second-id');
  });

  it('resolves without throwing when SecureStore is unavailable during clear', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);

    await expect(clearGuestSessionId()).resolves.toBeUndefined();
    expect(mockDeleteItemAsync).not.toHaveBeenCalled();
  });
});
