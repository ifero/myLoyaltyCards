/**
 * Auth Validation Utilities — Unit Tests
 * Story 6-8: Password Reset
 */

import { isValidEmail, isValidPassword } from './validation';

// ---------------------------------------------------------------------------
// isValidEmail
// ---------------------------------------------------------------------------

describe('isValidEmail', () => {
  it('accepts standard email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('name.surname@domain.co.uk')).toBe(true);
    expect(isValidEmail('user+tag@example.com')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects addresses without @ symbol', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
  });

  it('rejects addresses without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects addresses without TLD', () => {
    expect(isValidEmail('user@domain')).toBe(false);
  });

  it('trims whitespace before validation', () => {
    expect(isValidEmail('  user@example.com  ')).toBe(true);
  });

  it('rejects addresses with spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidPassword
// ---------------------------------------------------------------------------

describe('isValidPassword', () => {
  it('accepts password with letters and digits (8+ chars)', () => {
    expect(isValidPassword('Password1')).toBe(true);
    expect(isValidPassword('12345678a')).toBe(true);
    expect(isValidPassword('abcdefg1')).toBe(true);
  });

  it('rejects password shorter than 8 characters', () => {
    expect(isValidPassword('Pass1')).toBe(false);
    expect(isValidPassword('Ab1')).toBe(false);
  });

  it('rejects password without any digit', () => {
    expect(isValidPassword('abcdefgh')).toBe(false);
    expect(isValidPassword('PasswordOnly')).toBe(false);
  });

  it('rejects password without any letter', () => {
    expect(isValidPassword('12345678')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidPassword('')).toBe(false);
  });

  it('accepts passwords with special characters', () => {
    expect(isValidPassword('P@ssw0rd!')).toBe(true);
  });
});
