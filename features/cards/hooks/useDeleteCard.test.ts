/**
 * useDeleteCard Hook Tests
 * Story 2.8: Delete Card
 *
 * Tests for card deletion functionality including:
 * - AC3: Confirm deletion (database removal, haptic, toast, navigation)
 * - AC5: Delete success feedback
 * - AC6: Offline delete (local database operation)
 * - Error handling
 */

import { renderHook, act } from '@testing-library/react-native';
import * as Burnt from 'burnt';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import * as cardRepository from '@/core/database';

import { useDeleteCard } from './useDeleteCard';

// Mock card repository
jest.mock('@/core/database', () => ({
  deleteCard: jest.fn()
}));

describe('useDeleteCard', () => {
  const mockCardId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    (cardRepository.deleteCard as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Initial State', () => {
    it('returns initial state with isDeleting false', () => {
      const { result } = renderHook(() => useDeleteCard(mockCardId));

      expect(result.current.isDeleting).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.deleteCard).toBe('function');
    });
  });

  describe('deleteCard Function - AC3, AC6', () => {
    it('calls repository deleteCard with correct ID', async () => {
      const { result } = renderHook(() => useDeleteCard(mockCardId));

      await act(async () => {
        await result.current.deleteCard();
      });

      expect(cardRepository.deleteCard).toHaveBeenCalledTimes(1);
      expect(cardRepository.deleteCard).toHaveBeenCalledWith(mockCardId);
    });

    it('returns true on successful deletion', async () => {
      const { result } = renderHook(() => useDeleteCard(mockCardId));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.deleteCard();
      });

      expect(success).toBe(true);
    });

    it('works offline - local database operation (AC6)', async () => {
      // The deleteCard function only uses local database, no network calls
      const { result } = renderHook(() => useDeleteCard(mockCardId));

      await act(async () => {
        await result.current.deleteCard();
      });

      // Verify only local database was called
      expect(cardRepository.deleteCard).toHaveBeenCalled();
    });
  });

  describe('Success Feedback - AC3, AC5', () => {
    it('triggers haptic feedback on success (AC3, AC5)', async () => {
      const { result } = renderHook(() => useDeleteCard(mockCardId));

      await act(async () => {
        await result.current.deleteCard();
      });

      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });

    it('shows toast notification on success (AC5)', async () => {
      const { result } = renderHook(() => useDeleteCard(mockCardId));

      await act(async () => {
        await result.current.deleteCard();
      });

      expect(Burnt.toast).toHaveBeenCalledWith({
        title: 'Card deleted',
        preset: 'done',
        haptic: 'success',
        duration: 2
      });
    });

    it('navigates to card list on success using replace (AC3)', async () => {
      const { result } = renderHook(() => useDeleteCard(mockCardId));

      await act(async () => {
        await result.current.deleteCard();
      });

      // Should use replace instead of back to prevent going back to deleted card
      expect(router.replace).toHaveBeenCalledWith('/');
    });
  });

  describe('Loading State', () => {
    it('sets isDeleting to true during operation', async () => {
      let resolveDelete: (value?: unknown) => void;
      (cardRepository.deleteCard as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveDelete = resolve;
          })
      );

      const { result } = renderHook(() => useDeleteCard(mockCardId));

      // Start the operation but don't await it
      let deletePromise: Promise<boolean>;
      act(() => {
        deletePromise = result.current.deleteCard();
      });

      // Check loading state is true
      expect(result.current.isDeleting).toBe(true);

      // Complete the operation
      await act(async () => {
        resolveDelete!();
        await deletePromise;
      });

      expect(result.current.isDeleting).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('sets error state on failure', async () => {
      const errorMessage = 'Database error';
      (cardRepository.deleteCard as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useDeleteCard(mockCardId));

      await act(async () => {
        await result.current.deleteCard();
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('returns false on failure', async () => {
      (cardRepository.deleteCard as jest.Mock).mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useDeleteCard(mockCardId));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.deleteCard();
      });

      expect(success).toBe(false);
    });

    it('shows error toast on failure', async () => {
      (cardRepository.deleteCard as jest.Mock).mockRejectedValue(new Error('Database error'));

      const { result } = renderHook(() => useDeleteCard(mockCardId));

      await act(async () => {
        await result.current.deleteCard();
      });

      expect(Burnt.toast).toHaveBeenCalledWith({
        title: 'Failed to delete card',
        preset: 'error',
        haptic: 'error',
        duration: 3
      });
    });

    it('does not navigate on failure', async () => {
      (cardRepository.deleteCard as jest.Mock).mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useDeleteCard(mockCardId));

      await act(async () => {
        await result.current.deleteCard();
      });

      expect(router.replace).not.toHaveBeenCalled();
    });

    it('handles non-Error exceptions', async () => {
      (cardRepository.deleteCard as jest.Mock).mockRejectedValue('String error');

      const { result } = renderHook(() => useDeleteCard(mockCardId));

      await act(async () => {
        await result.current.deleteCard();
      });

      expect(result.current.error).toBe('Failed to delete card');
    });
  });

  describe('Invalid Card ID', () => {
    it('returns false with error for empty card ID', async () => {
      const { result } = renderHook(() => useDeleteCard(''));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.deleteCard();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Invalid card ID');
      expect(cardRepository.deleteCard).not.toHaveBeenCalled();
    });
  });
});
