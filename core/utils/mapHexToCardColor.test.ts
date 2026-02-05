/**
 * mapHexToCardColor Tests
 * Story 3.3: Brand color mapping
 */

import { mapHexToCardColor } from './mapHexToCardColor';

describe('mapHexToCardColor', () => {
  describe('Red colors', () => {
    it('should map pure red to red', () => {
      expect(mapHexToCardColor('#FF0000')).toBe('red');
    });

    it('should map Esselunga red to red', () => {
      expect(mapHexToCardColor('#E30613')).toBe('red');
    });

    it('should map dark red to red', () => {
      expect(mapHexToCardColor('#8B0000')).toBe('red');
    });
  });

  describe('Blue colors', () => {
    it('should map pure blue to blue', () => {
      expect(mapHexToCardColor('#0000FF')).toBe('blue');
    });

    it('should map light blue to blue', () => {
      expect(mapHexToCardColor('#3B82F6')).toBe('blue');
    });

    it('should map dark blue to blue', () => {
      expect(mapHexToCardColor('#1E3A8A')).toBe('blue');
    });
  });

  describe('Green colors', () => {
    it('should map pure green to green', () => {
      expect(mapHexToCardColor('#00FF00')).toBe('green');
    });

    it('should map medium green to green', () => {
      expect(mapHexToCardColor('#22C55E')).toBe('green');
    });

    it('should map dark green to green', () => {
      expect(mapHexToCardColor('#166534')).toBe('green');
    });
  });

  describe('Orange colors', () => {
    it('should map pure orange to orange', () => {
      expect(mapHexToCardColor('#FFA500')).toBe('orange');
    });

    it('should map red-orange to orange', () => {
      expect(mapHexToCardColor('#FF6B35')).toBe('orange');
    });
  });

  describe('Grey/Neutral colors', () => {
    it('should map pure grey to grey', () => {
      expect(mapHexToCardColor('#808080')).toBe('grey');
    });

    it('should map white to grey', () => {
      expect(mapHexToCardColor('#FFFFFF')).toBe('grey');
    });

    it('should map black to grey', () => {
      expect(mapHexToCardColor('#000000')).toBe('grey');
    });

    it('should map low saturation colors to grey', () => {
      expect(mapHexToCardColor('#CCCCCC')).toBe('grey');
    });
  });

  describe('Invalid input', () => {
    it('should return grey for invalid hex', () => {
      expect(mapHexToCardColor('invalid')).toBe('grey');
    });

    it('should return grey for empty string', () => {
      expect(mapHexToCardColor('')).toBe('grey');
    });
  });
});
