import italyCatalogue from './italy.json';
import { catalogueDataSchema } from './types';

describe('Italian Catalogue Data', () => {
  it('should validate against the schema', () => {
    const result = catalogueDataSchema.safeParse(italyCatalogue);
    if (!result.success) {
      console.error(result.error);
    }
    expect(result.success).toBe(true);
  });

  it('should have at least 20 brands', () => {
    expect(italyCatalogue.brands.length).toBeGreaterThanOrEqual(20);
  });

  it('should have unique ids', () => {
    const ids = italyCatalogue.brands.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  // Story 16.23 (AC6). The hint is derived from the card's own printed payload —
  // `2095110257978`, a checksum-valid EAN-13 — not guessed. That distinction
  // matters: Story 2.9 REMOVED `defaultFormat` from 11 brands precisely because
  // CODE-128 had been assumed for them, so the precedent is "don't guess a
  // brand's format". Without the hint, `applyExpectedFormat` is a no-op for
  // every Penny scan.
  it('declares EAN13 as the default format for penny-market', () => {
    const parsed = catalogueDataSchema.parse(italyCatalogue);
    const penny = parsed.brands.find((brand) => brand.id === 'penny-market');

    expect(penny).toBeDefined();
    expect(penny?.defaultFormat).toBe('EAN13');
  });
});
