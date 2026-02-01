/**
 * Unit Tests for generateInitials utility
 * Story 2.4: Display Virtual Logo (AC2)
 *
 * Tests all edge cases for initials generation.
 */

import { generateInitials } from './initials';

describe('generateInitials', () => {
  describe('basic functionality', () => {
    it('generates initials from two words', () => {
      expect(generateInitials('Test Store')).toBe('TS');
    });

    it('generates single initial from one word', () => {
      expect(generateInitials('SuperMart')).toBe('S');
    });

    it('generates initials from three words', () => {
      expect(generateInitials('The Coffee Shop')).toBe('TCS');
    });
  });

  describe('maximum 3 initials (AC2)', () => {
    it('truncates to first 3 words', () => {
      expect(generateInitials('A Very Long Store Name Here')).toBe('AVL');
    });

    it('handles exactly 3 words', () => {
      expect(generateInitials('One Two Three')).toBe('OTT');
    });

    it('handles 4 words by taking first 3', () => {
      expect(generateInitials('Alpha Beta Gamma Delta')).toBe('ABG');
    });
  });

  describe('uppercase conversion', () => {
    it('converts lowercase to uppercase', () => {
      expect(generateInitials('test store')).toBe('TS');
    });

    it('handles mixed case', () => {
      expect(generateInitials('TeSt sToRe')).toBe('TS');
    });

    it('preserves already uppercase', () => {
      expect(generateInitials('TEST STORE')).toBe('TS');
    });
  });

  describe('edge cases', () => {
    it('returns "?" for empty string', () => {
      expect(generateInitials('')).toBe('?');
    });

    it('returns "?" for whitespace only', () => {
      expect(generateInitials('   ')).toBe('?');
    });

    it('handles leading/trailing whitespace', () => {
      expect(generateInitials('  Test Store  ')).toBe('TS');
    });

    it('handles multiple spaces between words', () => {
      expect(generateInitials('Test    Store')).toBe('TS');
    });

    it('handles single character name', () => {
      expect(generateInitials('A')).toBe('A');
    });

    it('handles name with numbers', () => {
      expect(generateInitials('Store 24')).toBe('S2');
    });

    it('handles name starting with number', () => {
      expect(generateInitials('7-Eleven Store')).toBe('7S');
    });
  });

  describe('special characters', () => {
    it('handles name with hyphen (takes first char of each word)', () => {
      expect(generateInitials('Coca-Cola')).toBe('C');
    });

    it('handles name with apostrophe', () => {
      expect(generateInitials("McDonald's")).toBe('M');
    });

    it('handles accented characters', () => {
      expect(generateInitials('Caffè Roma')).toBe('CR');
    });

    it('handles emoji in name', () => {
      // Emoji counts as a word, so we get 3 initials
      expect(generateInitials('Store ⭐ Premium')).toBe('S⭐P');
    });
  });

  describe('real-world Italian brand examples', () => {
    it('handles Esselunga', () => {
      expect(generateInitials('Esselunga')).toBe('E');
    });

    it('handles Conad City', () => {
      expect(generateInitials('Conad City')).toBe('CC');
    });

    it('handles Coop Alleanza', () => {
      expect(generateInitials('Coop Alleanza')).toBe('CA');
    });

    it('handles Carrefour Express', () => {
      expect(generateInitials('Carrefour Express')).toBe('CE');
    });

    it('handles Acqua e Sapone', () => {
      expect(generateInitials('Acqua e Sapone')).toBe('AES');
    });
  });
});
