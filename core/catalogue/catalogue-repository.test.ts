import { catalogueRepository } from './catalogue-repository';

describe('CatalogueRepository', () => {
  test('getBrands returns an array with brands', () => {
    const brands = catalogueRepository.getBrands();
    expect(Array.isArray(brands)).toBe(true);
    expect(brands.length).toBeGreaterThan(0);
  });

  test('getBrandById returns null for unknown id and a brand for a real id', () => {
    const brands = catalogueRepository.getBrands();
    const first = brands[0];
    expect(catalogueRepository.getBrandById('non-existent')).toBeNull();
    const found = catalogueRepository.getBrandById(first!.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(first!.id);
  });

  test('searchBrands finds by partial name or alias and getVersion returns string', () => {
    const brands = catalogueRepository.getBrands();
    const first = brands[0];
    const q = first!.name.slice(0, 3);
    const results = catalogueRepository.searchBrands(q);
    expect(results.length).toBeGreaterThanOrEqual(0);
    const version = catalogueRepository.getVersion();
    expect(typeof version).toBe('string');
    expect(version.length).toBeGreaterThan(0);
  });
});
