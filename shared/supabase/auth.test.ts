/**
 * Supabase Auth API Tests
 * Story 6-3: Configure App Client for Supabase
 *
 * Tests all auth operations with mocked Supabase client.
 * Validates typed AuthResult returns, error mapping, and guest mode.
 */

import {
  continueAsGuest,
  getSession,
  requestPasswordReset,
  signInWithEmail,
  signOut,
  signUp,
  updatePassword
} from './auth';

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------

const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
const mockResetPasswordForEmail = jest.fn();
const mockUpdateUser = jest.fn();

const mockSupabaseAuth = {
  signInWithPassword: mockSignInWithPassword,
  signUp: mockSignUp,
  signOut: mockSignOut,
  getSession: mockGetSession,
  resetPasswordForEmail: mockResetPasswordForEmail,
  updateUser: mockUpdateUser
};

jest.mock('./client', () => ({
  getSupabaseClient: jest.fn(() => ({
    auth: mockSupabaseAuth
  }))
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_USER = {
  id: 'user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00Z'
};

const MOCK_SESSION = {
  access_token: 'ACCESS_TOKEN_REDACTED',
  refresh_token: 'REFRESH_TOKEN_REDACTED',
  expires_at: 9999999999,
  user: MOCK_USER
};

// ---------------------------------------------------------------------------
// signInWithEmail
// ---------------------------------------------------------------------------

describe('signInWithEmail', () => {
  beforeEach(() => {
    mockSignInWithPassword.mockReset();
  });

  it('returns success with user and session on valid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: MOCK_USER, session: MOCK_SESSION },
      error: null
    });

    const result = await signInWithEmail('test@example.com', 'password123');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user).toEqual(MOCK_USER);
      expect(result.data.session).toEqual(MOCK_SESSION);
    }
  });

  it('returns failure when Supabase returns an error', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' }
    });

    const result = await signInWithEmail('bad@example.com', 'wrong');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Invalid login credentials');
    }
  });

  it('returns failure when session is null even if user is present', async () => {
    // Edge case: user returned but session is null
    mockSignInWithPassword.mockResolvedValue({
      data: { user: MOCK_USER, session: null },
      error: null
    });

    const result = await signInWithEmail('test@example.com', 'password123');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/no session/i);
    }
  });

  it('returns failure when user is null', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: null
    });

    const result = await signInWithEmail('test@example.com', 'password123');

    expect(result.success).toBe(false);
  });

  it('returns failure and does not re-throw when network throws', async () => {
    mockSignInWithPassword.mockRejectedValue(new Error('Network error'));

    const result = await signInWithEmail('test@example.com', 'password123');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Network error');
    }
  });

  it('never exposes raw internal error objects to callers', async () => {
    const internalError = new Error('pg: connection refused [pool exhausted]');
    mockSignInWithPassword.mockRejectedValue(internalError);

    const result = await signInWithEmail('test@example.com', 'password123');

    // Result should be a clean AuthResult, not a thrown exception
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error.message).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// signUp
// ---------------------------------------------------------------------------

describe('signUp', () => {
  beforeEach(() => {
    mockSignUp.mockReset();
  });

  it('returns success with user and session on registration', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: MOCK_USER, session: MOCK_SESSION },
      error: null
    });

    const result = await signUp('new@example.com', 'Password123!');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user).toEqual(MOCK_USER);
      expect(result.data.session).toEqual(MOCK_SESSION);
    }
  });

  it('returns success with null session when email confirmation is required', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: MOCK_USER, session: null },
      error: null
    });

    const result = await signUp('new@example.com', 'Password123!');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.session).toBeNull();
    }
  });

  it('returns failure when Supabase returns a registration error', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered' }
    });

    const result = await signUp('existing@example.com', 'Password123!');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('User already registered');
    }
  });

  it('returns failure when user is null with no error', async () => {
    mockSignUp.mockResolvedValue({ data: { user: null, session: null }, error: null });

    const result = await signUp('new@example.com', 'Password123!');

    expect(result.success).toBe(false);
  });

  it('catches thrown exceptions and returns failure', async () => {
    mockSignUp.mockRejectedValue(new Error('Timeout'));

    const result = await signUp('new@example.com', 'Password123!');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Timeout');
    }
  });
});

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------

describe('signOut', () => {
  beforeEach(() => {
    mockSignOut.mockReset();
  });

  it('returns success when sign-out succeeds', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    const result = await signOut();

    expect(result.success).toBe(true);
  });

  it('returns failure when Supabase returns an error', async () => {
    mockSignOut.mockResolvedValue({ error: { message: 'Not authenticated' } });

    const result = await signOut();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Not authenticated');
    }
  });

  it('returns failure when sign-out throws', async () => {
    mockSignOut.mockRejectedValue(new Error('Network failure'));

    const result = await signOut();

    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getSession
// ---------------------------------------------------------------------------

describe('getSession', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
  });

  it('returns current session when user is authenticated', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: MOCK_SESSION },
      error: null
    });

    const result = await getSession();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(MOCK_SESSION);
    }
  });

  it('returns null session when no user is authenticated', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null
    });

    const result = await getSession();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('returns failure when Supabase returns an error', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'JWT expired' }
    });

    const result = await getSession();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('JWT expired');
    }
  });

  it('returns failure when getSession throws', async () => {
    mockGetSession.mockRejectedValue(new Error('Offline'));

    const result = await getSession();

    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// requestPasswordReset
// ---------------------------------------------------------------------------

describe('requestPasswordReset', () => {
  beforeEach(() => {
    mockResetPasswordForEmail.mockReset();
  });

  it('returns success when Supabase sends the reset email', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    const result = await requestPasswordReset('test@example.com');

    expect(result.success).toBe(true);
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
      redirectTo: 'myloyaltycards://reset-password'
    });
  });

  it('accepts a custom redirectTo parameter', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    await requestPasswordReset('test@example.com', 'custom://url');

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
      redirectTo: 'custom://url'
    });
  });

  it('returns failure when Supabase returns an error', async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { message: 'Rate limit exceeded' }
    });

    const result = await requestPasswordReset('test@example.com');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Rate limit exceeded');
    }
  });

  it('returns failure when network throws', async () => {
    mockResetPasswordForEmail.mockRejectedValue(new Error('Network error'));

    const result = await requestPasswordReset('test@example.com');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Network error');
    }
  });
});

// ---------------------------------------------------------------------------
// updatePassword
// ---------------------------------------------------------------------------

describe('updatePassword', () => {
  beforeEach(() => {
    mockUpdateUser.mockReset();
  });

  it('returns success when password is updated', async () => {
    mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null });

    const result = await updatePassword('NewPassword1');

    expect(result.success).toBe(true);
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'NewPassword1' });
  });

  it('returns failure when Supabase returns an error', async () => {
    mockUpdateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Password too weak' }
    });

    const result = await updatePassword('weak');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Password too weak');
    }
  });

  it('returns failure when network throws', async () => {
    mockUpdateUser.mockRejectedValue(new Error('Timeout'));

    const result = await updatePassword('NewPassword1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Timeout');
    }
  });
});

// ---------------------------------------------------------------------------
// continueAsGuest
// ---------------------------------------------------------------------------

describe('continueAsGuest', () => {
  it('returns success with isGuest set to true', () => {
    const result = continueAsGuest();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isGuest).toBe(true);
    }
  });

  it('returns a non-empty guestId', () => {
    const result = continueAsGuest();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.guestId).toBeTruthy();
      expect(typeof result.data.guestId).toBe('string');
    }
  });

  it('generates a unique guestId on each call', () => {
    const result1 = continueAsGuest();
    const result2 = continueAsGuest();

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    if (result1.success && result2.success) {
      expect(result1.data.guestId).not.toBe(result2.data.guestId);
    }
  });

  it('never makes a Supabase API call', () => {
    // Reset all mocks and verify none were called
    mockSignInWithPassword.mockReset();
    mockSignUp.mockReset();
    mockSignOut.mockReset();
    mockGetSession.mockReset();

    continueAsGuest();

    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    expect(mockSignUp).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('is synchronous — returns AuthResult directly (not a Promise)', () => {
    const result = continueAsGuest();

    // If it were a Promise, result.success would be undefined
    expect(typeof result.success).toBe('boolean');
  });
});
