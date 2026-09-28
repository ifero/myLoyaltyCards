import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isFirstLaunch } from '@/core/settings/settings-repository';

import { useTheme } from '@/shared/theme';
import { TOUCH_TARGET } from '@/shared/theme/spacing';
import { TYPOGRAPHY } from '@/shared/theme/typography';

import { InfoTooltipModal } from '../components/InfoTooltipModal';
import { ModeOptionCard } from '../components/ModeOptionCard';
import { useModeSelection } from '../hooks/useModeSelection';

const ModeSelectionScreen = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectLocalMode, selectCloudMode } = useModeSelection();
  const [modalVisible, setModalVisible] = React.useState(false);
  const whatsDifferenceRef = React.useRef<React.ElementRef<typeof Pressable>>(null);

  React.useEffect(() => {
    if (!isFirstLaunch()) {
      router.replace('/');
    }
  }, [router]);

  React.useEffect(() => {
    AccessibilityInfo.announceForAccessibility?.(t('onboarding.modeSelection.screenAnnouncement'));
  }, [t]);

  return (
    <View testID="mode-selection-screen" style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        style={{
          paddingTop: insets.top,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          paddingHorizontal: 12,
          minHeight: 56 + insets.top,
          flexDirection: 'row',
          alignItems: 'center'
        }}
      >
        <Pressable
          testID="mode-selection-back"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.modeSelection.backAccessibilityLabel')}
          style={{
            width: TOUCH_TARGET.min,
            height: TOUCH_TARGET.min,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <MaterialIcons name="chevron-left" size={28} color={theme.primary} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            // Mirrors the back button, so the title stays centred on the screen.
            marginRight: TOUCH_TARGET.min,
            textAlign: 'center',
            color: theme.textPrimary,
            ...TYPOGRAPHY.bodyLgStrong
          }}
        >
          {t('onboarding.modeSelection.title')}
        </Text>
      </View>

      {/* The body scrolls (the header stays put) only when its content outgrows the screen — at
          the largest Dynamic Type sizes, where it would otherwise clip the options (Story 21.6). */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 30,
          paddingBottom: insets.bottom + 24
        }}
        alwaysBounceVertical={false}
      >
        <Text
          accessibilityRole="header"
          style={{
            color: theme.textPrimary,
            textAlign: 'center',
            ...TYPOGRAPHY.headlineMd
          }}
        >
          {t('onboarding.modeSelection.heading')}
        </Text>

        <Text
          style={{
            marginTop: 8,
            textAlign: 'center',
            color: theme.textSecondary,
            ...TYPOGRAPHY.bodyMd
          }}
        >
          {t('onboarding.modeSelection.subtitle')}
        </Text>

        <View style={{ marginTop: 28, gap: 16 }}>
          <ModeOptionCard
            testID="mode-option-local"
            icon="smartphone"
            title={t('onboarding.modeSelection.localTitle')}
            subtitle={t('onboarding.modeSelection.localSubtitle')}
            eyebrow={t('onboarding.modeSelection.localEyebrow')}
            recommended
            onPress={selectLocalMode}
          />

          <ModeOptionCard
            testID="mode-option-cloud"
            icon="cloud-upload"
            title={t('onboarding.modeSelection.cloudTitle')}
            subtitle={t('onboarding.modeSelection.cloudSubtitle')}
            eyebrow={t('onboarding.modeSelection.cloudEyebrow')}
            onPress={selectCloudMode}
          />
        </View>

        <Text
          style={{
            marginTop: 34,
            color: theme.textSecondary,
            textAlign: 'center',
            ...TYPOGRAPHY.bodyMd
          }}
        >
          {t('onboarding.modeSelection.footer')}
        </Text>

        <Pressable
          ref={whatsDifferenceRef}
          testID="mode-selection-whats-difference"
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.modeSelection.whatsDifferenceAccessibilityLabel')}
          style={{
            marginTop: 4,
            minHeight: TOUCH_TARGET.min,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Text
            style={{
              color: theme.link,
              textDecorationLine: 'underline',
              ...TYPOGRAPHY.bodyMdStrong
            }}
          >
            {t('onboarding.modeSelection.whatsDifference')}
          </Text>
        </Pressable>
      </ScrollView>

      <InfoTooltipModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        triggerRef={whatsDifferenceRef}
        testID="info-tooltip-modal"
      />
    </View>
  );
};

export default ModeSelectionScreen;
