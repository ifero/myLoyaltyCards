/**
 * Legacy Scan Route
 *
 * Backward-compatible bridge from old `/scan` entrypoint to the new
 * Story 13.4 scanner flow at `/add-card/scan`. Still reached from the
 * catalogue grid (features/cards/components/CatalogueGrid.tsx).
 *
 * Story 16.9 (AD-4): declarative `<Redirect>` so this route file complies with
 * the route-file lint rule (no effect hooks or local state). `<Redirect>`
 * performs a replace-style navigation on mount, preserving prior behaviour.
 */

import { Redirect, useLocalSearchParams } from 'expo-router';

type LegacyScanParams = {
  brandId?: string;
  brandName?: string;
  brandColor?: string;
  brandFormat?: string;
};

const ScanScreen = () => {
  const params = useLocalSearchParams<LegacyScanParams>();

  return (
    <Redirect
      href={{
        pathname: '/add-card/scan',
        params: {
          ...(params.brandId && {
            brandId: params.brandId,
            brandName: params.brandName,
            brandColor: params.brandColor,
            brandFormat: params.brandFormat
          })
        }
      }}
    />
  );
};

export default ScanScreen;
