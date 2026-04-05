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
import burnt from 'burnt';
import { useLocalSearchParams, Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';

import { getCardById } from '@/core/database';
import { LoyaltyCard } from '@/core/schemas';

import { useTheme } from '@/shared/theme';
import { getContrastForeground } from '@/shared/theme/luminance';
import { SPACING } from '@/shared/theme/spacing';

import { CardDetails, useDeleteCard, useBrandLogo } from '@/features/cards';

const CardDetailsScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete card hook
  const { deleteCard, isDeleting } = useDeleteCard(id ?? '');

  // Resolve brand data — MUST be called before any early returns (Rules of Hooks)
  const brand = useBrandLogo(card?.brandId ?? null);

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
          setError('Invalid card ID');
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
            setError('Card not found');
          }
        } catch (err) {
          console.error('Failed to fetch card:', err);
          setError('Failed to load card details');
        } finally {
          setIsLoading(false);
        }
      };

      fetchCard();
    }, [id])
  );

  /**
   * Show toast notification when barcode is copied
   */
  const handleCopy = useCallback(() => {
    burnt.toast({
      title: 'Copied to clipboard ✓',
      preset: 'done',
      haptic: 'success',
      duration: 2
    });
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Card Details'
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
            title: 'Card Details'
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
            {error || 'Card not found'}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.textSecondary,
              textAlign: 'center'
            }}
          >
            The card you're looking for doesn't exist or has been deleted.
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
              accessibilityLabel="Go back"
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
