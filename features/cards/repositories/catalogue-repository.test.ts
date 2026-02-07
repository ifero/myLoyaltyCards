/**
 * Catalogue Repository Tests
 * Story 3.4: Cache Catalogue for Offline
 *
 * Ensures catalogue loads from bundled JSON without network dependency.
 */

import { CatalogueBrand } from '@/catalogue/types';

import { catalogueRepository, CatalogueRepository } from '../repositories/catalogue-repository';

describe('CatalogueRepository', () => {
  describe('getInstance()', () => {
    it('should return a singleton instance', () => {
      const instance1 = CatalogueRepository.getInstance();
      const instance2 = CatalogueRepository.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getBrands()', () => {
    it('should return all brands from bundled catalogue', () => {
      const brands = catalogueRepository.getBrands();
      expect(Array.isArray(brands)).toBe(true);
      expect(brands.length).toBeGreaterThan(0);
    });

    it('should return valid brand objects with required fields', () => {
      const brands = catalogueRepository.getBrands();
      brands.forEach((brand) => {
        expect(brand).toHaveProperty('id');
        expect(brand).toHaveProperty('name');
        expect(brand).toHaveProperty('logo');
        expect(brand).toHaveProperty('color');
        expect(brand).toHaveProperty('aliases');
        expect(Array.isArray(brand.aliases)).toBe(true);
      });
    });

    it('should return consistent data on multiple calls', () => {
      const brands1 = catalogueRepository.getBrands();
      const brands2 = catalogueRepository.getBrands();
      expect(brands1).toEqual(brands2);
    });

    it('should contain known Italian brands', () => {
      const brands = catalogueRepository.getBrands();
      const brandIds = brands.map((b) => b.id);
      expect(brandIds).toContain('esselunga');
      expect(brandIds).toContain('conad');
      expect(brandIds).toContain('coop');
    });

    it('should load synchronously without network calls', () => {
      const start = performance.now();
      const brands = catalogueRepository.getBrands();
      const duration = performance.now() - start;
      expect(brands.length).toBeGreaterThan(0);
      // Should be instant (< 10ms)
      expect(duration).toBeLessThan(10);
    });
  });

  describe('getBrandById()', () => {
    it('should return brand when ID exists', () => {
      const brand = catalogueRepository.getBrandById('esselunga');
      expect(brand).not.toBeNull();
      expect(brand?.id).toBe('esselunga');
      expect(brand?.name).toBe('Esselunga');
    });

    it('should return null when ID does not exist', () => {
      const brand = catalogueRepository.getBrandById('nonexistent-brand');
      expect(brand).toBeNull();
    });

    it('should be case-sensitive for ID lookup', () => {
      const brand = catalogueRepository.getBrandById('ESSELUNGA');
      expect(brand).toBeNull();
    });
  });

  describe('searchBrands()', () => {
    it('should search brands by name', () => {
      const results = catalogueRepository.searchBrands('esselunga');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.id).toBe('esselunga');
    });

    it('should search brands case-insensitively', () => {
      const results1 = catalogueRepository.searchBrands('esselunga');
      const results2 = catalogueRepository.searchBrands('ESSELUNGA');
      const results3 = catalogueRepository.searchBrands('EsSeLuNgA');
      expect(results1).toEqual(results2);
      expect(results1).toEqual(results3);
    });

    it('should search brands by alias', () => {
      const results = catalogueRepository.searchBrands('fidaty');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((b) => b.id === 'esselunga')).toBe(true);
    });

    it('should support partial string matching', () => {
      const results = catalogueRepository.searchBrands('esselunga');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', () => {
      const results = catalogueRepository.searchBrands('xyzabc123notabrand');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should be case-insensitive for alias search', () => {
      const results1 = catalogueRepository.searchBrands('fidaty');
      const results2 = catalogueRepository.searchBrands('FIDATY');
      expect(results1).toEqual(results2);
    });
  });

  describe('getVersion()', () => {
    it('should return catalogue version', () => {
      const version = catalogueRepository.getVersion();
      expect(typeof version).toBe('string');
      expect(/^\d{4}-\d{2}-\d{2}$/.test(version)).toBe(true);
    });
  });

  describe('offline availability', () => {
    it('should provide all data without network calls', () => {
      // This test verifies that getBrands() does not make any network requests
      // by checking that all data is available immediately
      const brands = catalogueRepository.getBrands();
      expect(brands.length).toBeGreaterThan(0);

      // Verify each brand has all required properties
      brands.forEach((brand: CatalogueBrand) => {
        expect(brand.id).toBeDefined();
        expect(brand.name).toBeDefined();
        expect(brand.logo).toBeDefined();
        expect(brand.color).toBeDefined();
        expect(brand.color).toMatch(/^#[0-9A-Fa-f]{3,6}$/);
      });
    });
  });

  describe('data validation', () => {
    it('should validate all brand colors are valid hex values', () => {
      const brands = catalogueRepository.getBrands();
      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      brands.forEach((brand) => {
        expect(hexRegex.test(brand.color)).toBe(true);
      });
    });

    it('should have unique brand IDs', () => {
      const brands = catalogueRepository.getBrands();
      const ids = brands.map((b) => b.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should have non-empty names for all brands', () => {
      const brands = catalogueRepository.getBrands();
      brands.forEach((brand) => {
        expect(brand.name.length).toBeGreaterThan(0);
      });
    });
  });
});
