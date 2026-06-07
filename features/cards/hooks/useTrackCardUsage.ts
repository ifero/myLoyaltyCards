/**
 * useTrackCardUsage Hook
 * Story 9.1: Track Card Usage
 *
 * Records a usage event each time a card's detail screen gains focus by
 * incrementing its usageCount and stamping lastUsedAt. These fields feed the
 * smart sorting algorithm (Story 9.3).
 *
 * Fire-and-forget: the write is never awaited and errors are swallowed (logged
 * only) so tracking can never break the screen or require a network connection.
 */

import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { incrementUsageCount } from '@/core/database';

/**
 * Track a usage event for the given card on every screen focus.
 *
 * @param cardId - ID of the card being viewed. Empty/undefined ids are ignored.
 */
export function useTrackCardUsage(cardId: string): void {
  useFocusEffect(
    useCallback(() => {
      if (!cardId) {
        return;
      }

      incrementUsageCount(cardId).catch((err) => {
        console.error('Failed to track card usage:', err);
      });
    }, [cardId])
  );
}
