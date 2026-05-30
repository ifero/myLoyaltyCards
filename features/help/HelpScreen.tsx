import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/shared/theme';

import docHelpItemsIt from './help-data.it.json';
import docHelpItemsEn from './help-data.json';
import { fallbackHelpItemsEn, fallbackHelpItemsIt, type HelpItem } from './help-fallback';

type HelpLanguageCode = 'en' | 'it';

const resolveHelpLanguage = (language: string): HelpLanguageCode =>
  language.toLowerCase().startsWith('it') ? 'it' : 'en';

const sourceHelpItemsByLanguage: Record<HelpLanguageCode, HelpItem[]> = {
  en:
    Array.isArray(docHelpItemsEn) && docHelpItemsEn.length > 0
      ? docHelpItemsEn
      : fallbackHelpItemsEn,
  it:
    Array.isArray(docHelpItemsIt) && docHelpItemsIt.length > 0
      ? docHelpItemsIt
      : fallbackHelpItemsIt
};

const fallbackHelpItemsByLanguage: Record<HelpLanguageCode, HelpItem[]> = {
  en: fallbackHelpItemsEn,
  it: fallbackHelpItemsIt
};

type HelpScreenProps = {
  itemsOverride?: HelpItem[];
};

const HelpScreen = ({ itemsOverride }: HelpScreenProps) => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const language = resolveHelpLanguage(i18n.language);
  const sourceHelpItems = sourceHelpItemsByLanguage[language];
  const fallbackHelpItems = fallbackHelpItemsByLanguage[language];
  const resolvedItems = itemsOverride ?? sourceHelpItems;
  const displayItems = resolvedItems.length > 0 ? resolvedItems : fallbackHelpItems;
  const [query, setQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return displayItems;

    return displayItems.filter((item) => {
      const haystack = [item.question, item.answer, ...item.tags].join(' ').toLowerCase();
      return haystack.includes(normalized);
    });
  }, [displayItems, query]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const openExternal = async (url: string, fallbackMessage: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(t('help.openFailedTitle'), fallbackMessage);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('help.openFailedTitle'), fallbackMessage);
    }
  };

  return (
    <ScrollView
      testID="help-screen"
      className="flex-1 px-6 pb-8 pt-10"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <Text
        testID="help-title"
        className="mb-4 text-2xl font-bold"
        style={{ color: theme.textPrimary }}
        accessibilityRole="header"
      >
        {t('help.title')}
      </Text>

      <Text className="mb-6 text-base" style={{ color: theme.textSecondary }}>
        {t('help.subtitle')}
      </Text>

      <TextInput
        testID="help-search"
        value={query}
        onChangeText={setQuery}
        placeholder={t('help.searchPlaceholder')}
        placeholderTextColor={theme.textSecondary}
        className="mb-6 rounded-xl px-4 py-3 text-base"
        style={{
          backgroundColor: theme.surface,
          color: theme.textPrimary,
          borderColor: theme.border,
          borderWidth: 1
        }}
      />

      {filteredItems.map((item) => (
        <View
          key={item.id}
          className="mb-4 rounded-xl p-4"
          style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}
        >
          <Pressable
            onPress={() => toggleExpanded(item.id)}
            accessibilityRole="button"
            accessibilityLabel={item.question}
          >
            <Text className="text-base font-semibold" style={{ color: theme.textPrimary }}>
              {item.question}
            </Text>
          </Pressable>
          {expandedIds[item.id] && (
            <View className="mt-2">
              <Text className="text-sm" style={{ color: theme.textSecondary }}>
                {item.answer}
              </Text>
              {item.steps && item.steps.length > 0 && (
                <View className="mt-2">
                  {item.steps.map((step, index) => (
                    <Text
                      key={`${item.id}-step-${index}`}
                      className="text-sm"
                      style={{ color: theme.textSecondary }}
                    >
                      {`• ${step}`}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      ))}

      <View className="mt-4 gap-3">
        <Pressable
          testID="help-contact-support"
          accessibilityRole="button"
          accessibilityLabel={t('help.contactSupportA11y')}
          onPress={() =>
            openExternal('mailto:support@myloyaltycards.app', t('help.contactSupportUnavailable'))
          }
          className="items-center justify-center rounded-xl px-4 py-3"
          style={{
            backgroundColor: theme.primary
          }}
        >
          <Text className="text-sm font-semibold text-white">{t('help.contactSupport')}</Text>
        </Pressable>

        <Pressable
          testID="help-submit-feedback"
          accessibilityRole="button"
          accessibilityLabel={t('help.submitFeedbackA11y')}
          onPress={() =>
            openExternal('https://myloyaltycards.app/feedback', t('help.submitFeedbackUnavailable'))
          }
          className="items-center justify-center rounded-xl px-4 py-3"
          style={{
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderWidth: 1
          }}
        >
          <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
            {t('help.submitFeedback')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

export default HelpScreen;
