/**
 * Legacy Scan Route
 *
 * Backward-compatible bridge from old `/scan` entrypoint to the new
 * Story 13.4 scanner flow at `/add-card/scan`.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

type LegacyScanParams = {
  brandId?: string;
  brandName?: string;
  brandColor?: string;
  brandFormat?: string;
};

export default function ScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<LegacyScanParams>();

  useEffect(() => {
    router.replace({
      pathname: '/add-card/scan',
      params: {
        ...(params.brandId && {
          brandId: params.brandId,
          brandName: params.brandName,
          brandColor: params.brandColor,
          brandFormat: params.brandFormat
        })
      }
    });
  }, [router, params.brandId, params.brandName, params.brandColor, params.brandFormat]);

  return null;
}
