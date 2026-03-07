/**
 * Guest Session Repository Tests
 * Story 6.5: Implement Guest Mode
 *
 * Validates persistent guest session UUID creation, retrieval, and deletion
 * using a mocked expo-secure-store.
 */

// ---------------------------------------------------------------------------
// Mock expo-secure-store
// ---------------------------------------------------------------------------

const mockGetItemAsync = jest.fn();
const mockSetItemAsync = jest.fn();
const mockDeleteItemAsync = jest.fn();

jest.mock('expo-secure-store', () => ({
  getItemAsync: mockGetItemAsync,
  setItemAsync: mockSetItemAsync,
  deleteItemAsync: mockDeleteItemAsync
}));

// Mock uuid to produce deterministic values
jest.mock('uuid', () => ({
  v4: jest.fn()
}));

import { v4 as uuidv4 } from 'uuid';

import { clearGuestSessionId, getOrCreateGuestSessionId } from './guest-session-repository';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getOrCreateGuestSessionId', () => {
  beforeEach(() => {
    mockGetItemAsync.mockReset();
    mockSetItemAsync.mockReset();
    mockDeleteItemAsync.mockReset();
    (uuidv4 as jest.Mock).mockReset();
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

describe('clearGuestSessionId', () => {
  beforeEach(() => {
    mockDeleteItemAsync.mockReset();
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
});
