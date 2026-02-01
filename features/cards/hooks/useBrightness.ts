/**
 * useBrightness Hook
 * Story 2.5: Display Barcode (Barcode Flash)
 *
 * Controls screen brightness for optimal barcode scanning.
 * Maximizes brightness when displaying barcode and restores
 * the previous level when dismissed.
 */

import * as Brightness from 'expo-brightness';
import { useCallback, useRef } from 'react';

/**
 * Return type for useBrightness hook
 */
export interface UseBrightnessReturn {
  /** Maximize screen brightness to 1.0 */
  maximize: () => Promise<void>;
  /** Restore brightness to the level before maximize was called */
  restore: () => Promise<void>;
}

/**
 * Hook for controlling screen brightness
 *
 * Usage:
 * ```tsx
 * const { maximize, restore } = useBrightness();
 *
 * useEffect(() => {
 *   maximize();
 *   return () => { restore(); };
 * }, [maximize, restore]);
 * ```
 */
export function useBrightness(): UseBrightnessReturn {
  const originalBrightnessRef = useRef<number | null>(null);

  const maximize = useCallback(async () => {
    try {
      // Only store original brightness if we haven't already
      if (originalBrightnessRef.current === null) {
        const current = await Brightness.getBrightnessAsync();
        originalBrightnessRef.current = current;
      }
      await Brightness.setBrightnessAsync(1.0);
    } catch (error) {
      // Brightness API may not be available on all devices/simulators
      console.warn('Failed to maximize brightness:', error);
    }
  }, []);

  const restore = useCallback(async () => {
    try {
      if (originalBrightnessRef.current !== null) {
        await Brightness.setBrightnessAsync(originalBrightnessRef.current);
        originalBrightnessRef.current = null;
      }
    } catch (error) {
      console.warn('Failed to restore brightness:', error);
    }
  }, []);

  return { maximize, restore };
}
