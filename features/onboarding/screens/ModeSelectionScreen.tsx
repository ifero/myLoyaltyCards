import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isFirstLaunch } from '@/core/settings/settings-repository';

import { useTheme } from '@/shared/theme';

import { InfoTooltipModal } from '../components/InfoTooltipModal';
import { ModeOptionCard } from '../components/ModeOptionCard';
import { useModeSelection } from '../hooks/useModeSelection';

const ModeSelectionScreen = () => {
  const { theme, typography } = useTheme();
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
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialIcons name="chevron-left" size={28} color={theme.primary} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            marginRight: 44,
            textAlign: 'center',
            color: theme.textPrimary,
            fontSize: 17,
            fontWeight: '600'
          }}
        >
          {t('onboarding.modeSelection.title')}
        </Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 30 }}>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.textPrimary,
            textAlign: 'center',
            fontSize: 42 - 16,
            lineHeight: 34,
            fontWeight: '700'
          }}
        >
          {t('onboarding.modeSelection.heading')}
        </Text>

        <Text
          style={{
            marginTop: 8,
            textAlign: 'center',
            color: theme.textSecondary,
            fontSize: typography.footnote.fontSize,
            lineHeight: typography.footnote.lineHeight
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
            fontSize: 13,
            lineHeight: 18
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
          style={{ marginTop: 4, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text
            style={{
              color: theme.link,
              textDecorationLine: 'underline',
              fontSize: 14,
              fontWeight: '500'
            }}
          >
            {t('onboarding.modeSelection.whatsDifference')}
          </Text>
        </Pressable>
      </View>

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
