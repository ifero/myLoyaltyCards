/**
 * Catalogue Repository Module
 * Story 3.4: Cache Catalogue for Offline
 *
 * Provides access to the bundled Italian brand catalogue.
 * Data is loaded from bundled JSON asset for offline availability.
 */

import catalogueData from '@/catalogue/italy.json';
import { CatalogueBrand, CatalogueData, catalogueDataSchema } from '@/catalogue/types';

/**
 * CatalogueRepository
 *
 * Manages access to the static brand catalogue.
 * - Loads data from bundled JSON asset (no network dependency)
 * - Validates data structure on initialization
 * - Provides synchronous access to brands
 */
export class CatalogueRepository {
  private static instance: CatalogueRepository;
  private data: CatalogueData;

  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {
    const validationResult = catalogueDataSchema.safeParse(catalogueData);
    if (!validationResult.success) {
      throw new Error(`Invalid catalogue data structure: ${validationResult.error.message}`);
    }
    this.data = validationResult.data;
  }

  /**
   * Get or create singleton instance
   */
  static getInstance(): CatalogueRepository {
    if (!CatalogueRepository.instance) {
      CatalogueRepository.instance = new CatalogueRepository();
    }
    return CatalogueRepository.instance;
  }

  /**
   * Get all brands
   * Returns all brands from the bundled catalogue synchronously
   */
  getBrands(): CatalogueBrand[] {
    return this.data.brands;
  }

  /**
   * Get brand by ID
   * @param id - Brand ID (e.g. "esselunga")
   * @returns Brand if found, null otherwise
   */
  getBrandById(id: string): CatalogueBrand | null {
    const brand = this.data.brands.find((b) => b.id === id);
    return brand || null;
  }

  /**
   * Search brands by name or aliases
   * Case-insensitive, matches partial strings
   * @param query - Search query string
   * @returns Array of matching brands
   */
  searchBrands(query: string): CatalogueBrand[] {
    const lowerQuery = query.toLowerCase();
    return this.data.brands.filter((brand) => {
      const matchesName = brand.name.toLowerCase().includes(lowerQuery);
      const matchesAlias = brand.aliases.some((alias) => alias.toLowerCase().includes(lowerQuery));
      return matchesName || matchesAlias;
    });
  }

  /**
   * Get catalogue version
   * @returns ISO date string (YYYY-MM-DD)
   */
  getVersion(): string {
    return this.data.version;
  }
}

/**
 * Export singleton instance for convenient access
 */
export const catalogueRepository = CatalogueRepository.getInstance();
