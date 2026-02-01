/**
 * Scan Screen
 * Story 2.3: Scan Barcode with Camera
 *
 * Full-screen barcode scanner route.
 */

import { useRouter } from 'expo-router';

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

  /**
   * Handle successful barcode scan - AC4, AC5
   */
  const handleScan = (result: ScanResult) => {
    // Navigate back to add-card with scanned data
    router.replace({
      pathname: '/add-card',
      params: {
        scannedBarcode: result.barcode,
        scannedFormat: result.format
      }
    });
  };

  /**
   * Handle manual entry fallback - AC7
   */
  const handleManualEntry = () => {
    // Navigate back to add-card without scanned data
    router.back();
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
