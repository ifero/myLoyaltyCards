/**
 * Scan Screen
 * Story 2.3: Scan Barcode with Camera
 * Story 3.3: Brand-aware scanning
 *
 * Full-screen barcode scanner route.
 */

import { useRouter, useLocalSearchParams } from 'expo-router';

import { BarcodeScanner } from '@/features/cards';
import type { ScanResult } from '@/features/cards';

/**
 * ScanScreen - Barcode scanner screen
 *
 * Features per acceptance criteria:
 * - AC1: Accessible via "Scan Barcode" button from Add Card screen
 * - AC4: Auto-navigates to form with scanned barcode on success
 * - AC5: Passes barcode and format to Add Card form
 * - AC7: Manual entry fallback navigates back to Add Card form
 */
export default function ScanScreen() {
  const router = useRouter();
  
  // Get brand context from route params (Story 3.3)
  const params = useLocalSearchParams<{
    brandId?: string;
    brandName?: string;
    brandColor?: string;
    brandFormat?: string;
  }>();

  /**
   * Handle successful barcode scan - AC4, AC5
   * Story 3.3: Forward brand context
   */
  const handleScan = (result: ScanResult) => {
    // Navigate back to add-card with scanned data + brand context
    router.replace({
      pathname: '/add-card',
      params: {
        scannedBarcode: result.barcode,
        scannedFormat: result.format,
        ...(params.brandId && {
          brandId: params.brandId,
          brandName: params.brandName,
          brandColor: params.brandColor,
          brandFormat: params.brandFormat
        })
      }
    });
  };

  /**
   * Handle manual entry fallback - AC7
   * Story 3.3: Preserve brand context
   */
  const handleManualEntry = () => {
    // Navigate back to add-card with brand context (no scanned data)
    router.replace({
      pathname: '/add-card',
      params: {
        ...(params.brandId && {
          brandId: params.brandId,
          brandName: params.brandName,
          brandColor: params.brandColor,
          brandFormat: params.brandFormat
        })
      }
    });
  };

  /**
   * Handle scanner errors
   */
  const handleError = (error: string) => {
    console.error('Barcode scanner error:', error);
  };

  return (
    <BarcodeScanner onScan={handleScan} onManualEntry={handleManualEntry} onError={handleError} />
  );
}
