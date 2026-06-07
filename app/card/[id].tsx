/**
 * Card Details Screen
 * Story 13.3: Restyle Card Detail Screen (AC5)
 *
 * Displays full details of a loyalty card with:
 * - Brand-colored navigation header
 * - BrandHero section
 * - Large barcode with fullscreen overlay
 * - Info section and Manage actions
 */

import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';

import { getCardById } from '@/core/database';
import { LoyaltyCard } from '@/core/schemas';

import { useTheme } from '@/shared/theme';
import { getContrastForeground } from '@/shared/theme/luminance';
import { SPACING } from '@/shared/theme/spacing';
import { showToast } from '@/shared/toast';

import { CardDetails, useDeleteCard, useBrandLogo, useTrackCardUsage } from '@/features/cards';

const CardDetailsScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete card hook
  const { deleteCard, isDeleting } = useDeleteCard(id ?? '');

  // Resolve brand data — MUST be called before any early returns (Rules of Hooks)
  const brand = useBrandLogo(card?.brandId ?? null);

  // Track a usage event each time this card's detail screen gains focus (Story 9.1)
  useTrackCardUsage(id ?? '');

  // Scroll-aware condensing state (AC5) — hooks MUST be before early returns
  const [isHeaderCondensed, setIsHeaderCondensed] = useState(false);
  const handleScrollPastHero = useCallback((isPast: boolean) => {
    setIsHeaderCondensed(isPast);
  }, []);

  /**
   * Fetch card data from database
   * Uses useFocusEffect to refresh data when returning from edit screen
   */
  useFocusEffect(
    useCallback(() => {
      const fetchCard = async () => {
        if (!id) {
          setError(t('cards.details.invalidId'));
          setIsLoading(false);
          return;
        }

        try {
          setIsLoading(true);
          const cardData = await getCardById(id);
          if (cardData) {
            setCard(cardData);
            setError(null);
          } else {
            setError(t('cards.details.notFound'));
          }
        } catch (err) {
          console.error('Failed to fetch card:', err);
          setError(t('cards.details.loadFailed'));
        } finally {
          setIsLoading(false);
        }
      };

      fetchCard();
    }, [id, t])
  );

  /**
   * Show toast notification when barcode is copied
   */
  const handleCopy = useCallback(() => {
    void showToast({
      title: t('cards.details.copiedToClipboard'),
      preset: 'done',
      haptic: 'success',
      duration: 2
    });
  }, [t]);

  // Loading state
  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t('navigation.cardDetails')
          }}
        />
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.background
          }}
        >
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </>
    );
  }

  // Error state
  if (error || !card) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t('navigation.cardDetails')
          }}
        />
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: SPACING.lg,
            backgroundColor: theme.background
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.textPrimary,
              marginBottom: SPACING.sm
            }}
          >
            {error || t('cards.details.notFound')}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.textSecondary,
              textAlign: 'center'
            }}
          >
            {t('cards.details.missingDescription')}
          </Text>
        </View>
      </>
    );
  }

  // Resolve header color: brand color for catalogue, primary for custom
  const headerBg = brand ? brand.color : theme.primary;
  const headerTextColor = getContrastForeground(headerBg);

  // Success state - render card details
  return (
    <>
      <Stack.Screen
        options={{
          title: isHeaderCondensed ? card.name : '',
          headerStyle: { backgroundColor: headerBg },
          headerTintColor: headerTextColor,
          headerTitleStyle: {
            color: headerTextColor,
            fontWeight: '600',
            fontSize: isHeaderCondensed ? 17 : 0
          },
          headerShadowVisible: isHeaderCondensed,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t('cards.details.backAccessibilityLabel')}
              hitSlop={8}
            >
              <MaterialIcons name="chevron-left" size={28} color={headerTextColor} />
            </Pressable>
          )
        }}
      />
      <CardDetails
        card={card}
        onCopy={handleCopy}
        onDelete={deleteCard}
        isDeleting={isDeleting}
        onScrollPastHero={handleScrollPastHero}
      />
    </>
  );
};

export default CardDetailsScreen;
