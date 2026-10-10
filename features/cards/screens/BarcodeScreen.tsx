/**
 * Barcode Flash Screen
 * Story 2.5: Display Barcode (Barcode Flash)
 * Story 22.4: Barcode Flash — the three Cardì barcode frames
 *
 * The `barcode/[id]` route, which `cardi://barcode/<id>` opens: it loads the card and shows it in
 * `BarcodeFlash` (frames A and B), the same view card detail presents in place.
 *
 * Every state is white edge to edge from its first frame, in both schemes: the route inherits the
 * stack's `contentStyle`, which is black in dark mode. Loading is an ink spinner on white; a card
 * that cannot be loaded is frame C, its message in the error colour with "Go back" below it. Each
 * state mounts a dark status bar for the white.
 *
 * Android back on frames A and B is the view's own: it takes the press, and its content leaves
 * before the screen does. While loading and on frame C, expo-router's pops the screen.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { getCardById } from '@/core/database';
import type { LoyaltyCard } from '@/core/schemas';
import { logger } from '@/core/utils/logger';

import { BARCODE_FLASH } from '@/shared/theme/colors';
import { LAYOUT, SPACING, TOUCH_TARGET } from '@/shared/theme/spacing';
import { LIGHT_THEME_COLORS } from '@/shared/theme/tokens.generated';
import { TYPOGRAPHY } from '@/shared/theme/typography';

import { BarcodeFlash } from '@/features/cards/components/BarcodeFlash';

/**
 * "Go back" is plain text on a 48pt target: padding round its 24pt line, taken back out of the 32pt
 * gap above it, so the text sits 32pt below the message however large the target.
 */
const GO_BACK_TARGET_PADDING = (TOUCH_TARGET.min - TYPOGRAPHY.bodyLg.lineHeight) / 2;

/**
 * A press on "Go back" is acknowledged as on every transparent button: an 8 % wash of its label's
 * ink behind it, on the 12px radius every button takes (`cardi-design-system.md` § _Buttons_).
 */
const PRESSED_WASH = '14';
const GO_BACK_RADIUS = 12;

const BarcodeScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGoBackPressed, setIsGoBackPressed] = useState(false);

  useEffect(() => {
    const loadCard = async () => {
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
    };

    loadCard();
  }, [id, t]);

  // A cold link works too: expo-router puts `index` beneath the route.
  const handleDismiss = useCallback(() => {
    router.back();
  }, [router]);

  if (isLoading) {
    return (
      <View style={[styles.ground, styles.centred]} testID="barcode-screen-loading">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={LIGHT_THEME_COLORS.primary} />
      </View>
    );
  }

  // Frame C: the message and "Go back", and nothing else on the white.
  if (error || !card) {
    return (
      <View
        style={[
          styles.ground,
          styles.centred,
          styles.notFound,
          { paddingTop: insets.top, paddingBottom: insets.bottom }
        ]}
        onAccessibilityEscape={handleDismiss}
        testID="barcode-screen-not-found"
      >
        <StatusBar style="dark" />
        <Text style={styles.message}>{error ?? t('cards.details.notFound')}</Text>
        <Pressable
          onPress={handleDismiss}
          onPressIn={() => setIsGoBackPressed(true)}
          onPressOut={() => setIsGoBackPressed(false)}
          accessibilityRole="button"
          style={[styles.goBack, isGoBackPressed ? styles.goBackPressed : null]}
          testID="barcode-screen-go-back"
        >
          <Text style={styles.goBackLabel}>{t('auth.verifyEmail.goBack')}</Text>
        </Pressable>
      </View>
    );
  }

  // Unlike card detail's modal, the route does not hold the view's content back until its own fade
  // has ended (`isPresented`): the native stack reports no appearance for a cold link's first screen
  // on Android, so a reveal waiting for one would never come, and a barcode that never shows is
  // worse than one that shows in the fade's last frames.
  return <BarcodeFlash card={card} onDismiss={handleDismiss} />;
};

export default BarcodeScreen;

const styles = StyleSheet.create({
  // White edge to edge, both insets included, whatever the scheme.
  ground: {
    flex: 1,
    backgroundColor: BARCODE_FLASH.background
  },
  centred: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  notFound: {
    paddingHorizontal: LAYOUT.screenHorizontalMargin
  },
  message: {
    ...TYPOGRAPHY.bodyLgStrong,
    color: LIGHT_THEME_COLORS.error,
    textAlign: 'center'
  },
  goBack: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: TOUCH_TARGET.min,
    minHeight: TOUCH_TARGET.min,
    marginTop: SPACING.xl - GO_BACK_TARGET_PADDING,
    paddingVertical: GO_BACK_TARGET_PADDING,
    paddingHorizontal: SPACING.md,
    borderRadius: GO_BACK_RADIUS
  },
  goBackPressed: {
    backgroundColor: LIGHT_THEME_COLORS.textPrimary + PRESSED_WASH
  },
  goBackLabel: {
    ...TYPOGRAPHY.bodyLg,
    color: LIGHT_THEME_COLORS.textPrimary,
    textAlign: 'center'
  }
});
