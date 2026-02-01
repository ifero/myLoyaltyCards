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
});
