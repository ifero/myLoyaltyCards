/**
 * useBrandLogo Hook
 * Story 3.3: Display official brand logo when brandId is present
 *
 * Hook to get brand data from catalogue by brandId.
 */

import { useMemo } from 'react';

import catalogueData from '@/catalogue/italy.json';
import { CatalogueBrand } from '@/catalogue/types';

/**
 * Hook to get brand data by brandId
 * Returns undefined if brandId is null or brand not found
 */
export function useBrandLogo(brandId: string | null): CatalogueBrand | undefined {
  return useMemo(() => {
    if (!brandId) return undefined;
    return catalogueData.brands.find((b) => b.id === brandId);
  }, [brandId]);
}
