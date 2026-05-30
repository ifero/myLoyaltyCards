import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  FlatList,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItemInfo
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { completeFirstLaunch, isFirstLaunch } from '@/core/settings/settings-repository';

import { Button } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';

import { HighlightSlide } from '../components/HighlightSlide';
import { PaginationDots } from '../components/PaginationDots';
import { useHighlightPagination } from '../hooks/useHighlightPagination';

type Slide = {
  id: string;
  title: string;
  description: string;
};

const FeatureHighlightsScreen = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const slideWidth = Math.max(1, windowWidth);
  const router = useRouter();
  const flatListRef = React.useRef<FlatList<Slide>>(null);
  const { currentIndex, next, goTo, isLast, total } = useHighlightPagination();
  const slides = React.useMemo<Slide[]>(
    () => [
      {
        id: 'all-cards',
        title: t('onboarding.highlights.allCardsTitle'),
        description: t('onboarding.highlights.allCardsDescription')
      },
      {
        id: 'scan-or-manual',
        title: t('onboarding.highlights.scanOrManualTitle'),
        description: t('onboarding.highlights.scanOrManualDescription')
      },
      {
        id: 'your-data',
        title: t('onboarding.highlights.yourDataTitle'),
        description: t('onboarding.highlights.yourDataDescription')
      }
    ],
    [t]
  );

  React.useEffect(() => {
    if (!isFirstLaunch()) {
      router.replace('/');
    }
  }, [router]);

  React.useEffect(() => {
    AccessibilityInfo.announceForAccessibility?.(t('onboarding.highlights.screenAnnouncement'));
  }, [t]);

  const finishOnboarding = () => {
    completeFirstLaunch();
    router.replace('/');
  };

  const handleNext = () => {
    if (isLast) {
      finishOnboarding();
      return;
    }

    const nextIndex = currentIndex + 1;
    next();
    flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
  };

  const renderIllustration = (id: Slide['id']) => {
    if (id === 'all-cards') {
      return (
        <View
          style={{
            width: 160,
            height: 160,
            borderRadius: 80,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${theme.primary}1A`
          }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 88, gap: 8 }}>
            {Array.from({ length: 4 }).map((_, itemIndex) => (
              <View
                key={`card-${itemIndex}`}
                style={{
                  width: 40,
                  height: 34,
                  borderRadius: 6,
                  backgroundColor: `${theme.primary}${itemIndex < 2 ? '80' : 'A6'}`
                }}
              />
            ))}
          </View>
        </View>
      );
    }

    if (id === 'scan-or-manual') {
      return (
        <View
          style={{
            width: 160,
            height: 160,
            borderRadius: 80,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${theme.primary}1A`
          }}
        >
          <View
            style={{
              width: 72,
              height: 50,
              borderRadius: 10,
              backgroundColor: `${theme.primary}B3`
            }}
          />
          <View style={{ marginTop: 10, flexDirection: 'row', gap: 3 }}>
            {Array.from({ length: 7 }).map((_, barIndex) => (
              <View
                key={`barcode-${barIndex}`}
                style={{
                  width: barIndex % 2 === 0 ? 3 : 2,
                  height: 16,
                  borderRadius: 1,
                  backgroundColor: theme.primary
                }}
              />
            ))}
          </View>
        </View>
      );
    }

    return (
      <View
        style={{
          width: 160,
          height: 160,
          borderRadius: 80,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${theme.primary}1A`
        }}
      >
        <MaterialIcons name="verified-user" size={60} color={theme.primary} />
      </View>
    );
  };

  const renderSlide = ({ item, index }: ListRenderItemInfo<Slide>) => (
    <View testID={`highlight-slide-${index}`} style={{ width: slideWidth, flex: 1 }}>
      <HighlightSlide
        title={item.title}
        description={item.description}
        illustration={renderIllustration(item.id)}
        testID={`highlight-content-${index}`}
      />
    </View>
  );

  return (
    <View testID="feature-highlights-screen" style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 24,
          alignItems: 'flex-end'
        }}
      >
        <Pressable
          testID="highlights-skip"
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.highlights.skipAccessibilityLabel')}
          onPress={finishOnboarding}
          style={{ minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 2 }}
        >
          <Text style={{ color: theme.link, fontSize: 14, fontWeight: '500' }}>
            {t('onboarding.highlights.skip')}
          </Text>
        </Pressable>
      </View>

      <View
        style={{ flex: 1 }}
        accessibilityRole="adjustable"
        accessibilityHint={t('onboarding.highlights.swipeAccessibilityHint')}
      >
        <FlatList
          ref={flatListRef}
          testID="highlights-flatlist"
          horizontal
          pagingEnabled
          data={slides}
          keyExtractor={(item) => item.id}
          renderItem={renderSlide}
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: slideWidth, offset: slideWidth * index, index })}
          onScrollToIndexFailed={() => {
            goTo(currentIndex + 1);
          }}
          onMomentumScrollEnd={(event) => {
            const width = event.nativeEvent.layoutMeasurement.width;
            const index = Math.round(event.nativeEvent.contentOffset.x / width);
            goTo(index);
          }}
        />
      </View>

      <View style={{ paddingBottom: insets.bottom + 24, marginTop: 4, paddingHorizontal: 24 }}>
        <PaginationDots total={total} current={currentIndex} testID="pagination-dots" />
        <View style={{ marginTop: 20 }}>
          <Button variant="primary" onPress={handleNext} testID="highlight-next-button">
            {isLast ? t('onboarding.highlights.letsGo') : t('onboarding.highlights.next')}
          </Button>
        </View>
      </View>
    </View>
  );
};

export default FeatureHighlightsScreen;
