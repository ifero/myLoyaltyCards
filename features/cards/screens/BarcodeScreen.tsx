/**
 * Barcode Flash Screen
 * Story 2.5: Display Barcode (Barcode Flash)
 *
 * Full-screen modal that displays a card's barcode optimized for scanning.
 * Accessed via: /barcode/[id]
 *
 * Features:
 * - Auto-maximizes screen brightness
 * - White background for maximum contrast
 * - Dismissible via tap, swipe, or back button
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { getCardById } from '@/core/database';
import type { LoyaltyCard } from '@/core/schemas';
import { logger } from '@/core/utils/logger';

import { BarcodeFlash } from '@/features/cards/components/BarcodeFlash';

/**
 * Barcode Flash Screen Component
 *
 * Dynamic route that displays a card's barcode in full-screen mode.
 * The card ID is extracted from the URL parameter.
 */
export default function BarcodeFlashScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load card data
  useEffect(() => {
    async function loadCard() {
      if (!id) {
        setError(t('cards.details.invalidId'));
        setIsLoading(false);
        return;
      }

      try {
        const loadedCard = await getCardById(id);
        if (loadedCard) {
          setCard(loadedCard);
        } else {
          setError(t('cards.details.notFound'));
        }
      } catch (err) {
        logger.error('Failed to load card:', err);
        setError(t('cards.details.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    }

    loadCard();
  }, [id, t]);

  // Handle dismiss
  const handleDismiss = () => {
    router.back();
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingView}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  // Error state
  if (error || !card) {
    return (
      <View style={styles.errorView}>
        <Text style={styles.errorText}>{error || t('cards.details.notFound')}</Text>
        <Text style={styles.dismissText} onPress={handleDismiss}>
          {t('auth.verifyEmail.goBack')}
        </Text>
      </View>
    );
  }

  return <BarcodeFlash card={card} onDismiss={handleDismiss} />;
}

const styles = StyleSheet.create({
  loadingView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF'
  },
  errorView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 32
  },
  errorText: {
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '600',
    color: '#EF4444'
  },
  dismissText: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563'
  }
});
